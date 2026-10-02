import { validateImage } from "./image";
import { commandSchema } from "../shared/contracts";
import { authenticated } from "./auth";
import type { Env } from "./env";
import { encryptSecret, validateWebhook } from "./secrets";
import { parseOcr } from "./ocr";
import { runJobs } from "./jobs";
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (url.pathname === "/api/health")
      return json({ ok: true, configured: !!env.SUPABASE_URL });
    try {
      if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY)
        throw Error("RETRYABLE: Backend chưa được cấu hình");
      const { client, member } = await authenticated(request, env);
      if (request.method === "GET" && url.pathname === "/api/snapshot") {
        const { data, error } = await client.rpc("snapshot");
        if (error) throw error;
        const { data: deliveries } = await client.rpc("delivery_status");
        return json({ ...data, deliveries: deliveries ?? [] });
      }
      if (request.method !== "POST")
        return json({ message: "Không tìm thấy" }, 404);
      if (Number(request.headers.get("Content-Length") ?? 0) > 14500000)
        return json({ message: "Tệp quá lớn" }, 413);
      const raw = await request.text();
      if (raw.length > 14500000) return json({ message: "Tệp quá lớn" }, 413);
      const body = JSON.parse(raw);
      if (url.pathname === "/api/ocr") {
        if (member.role === "employee") throw Error("FORBIDDEN");
        if (!env.OCR_WORKER_URL || !env.OCR_API_KEY)
          throw Error(
            "RETRYABLE: OCR chưa cấu hình. Bạn có thể nhập menu thủ công.",
          );
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(body.mimeType) ||
          typeof body.imageBase64 !== "string" ||
          body.imageBase64.length > 14000000
        )
          throw Error("VALIDATION: ảnh");
        const bytes = validateImage(body.imageBase64, body.mimeType);
        const imagePath =
          member.id +
          "/" +
          crypto.randomUUID() +
          "." +
          { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[
            body.mimeType as "image/png" | "image/jpeg" | "image/webp"
          ];
        const stored = await client.storage
          .from("menu-images")
          .upload(imagePath, bytes, {
            contentType: body.mimeType,
            upsert: false,
          });
        if (stored.error)
          throw Error("RETRYABLE: Không lưu được ảnh menu riêng tư");
        const uploaded = await client.rpc("command", {
          kind: "menu.upload",
          payload: { imagePath },
          expected_version: 0,
          request_id: crypto.randomUUID(),
        });
        if (uploaded.error) throw uploaded.error;
        const endpoint = new URL(env.OCR_WORKER_URL);
        if (endpoint.protocol !== "https:")
          throw Error("RETRYABLE: OCR endpoint");
        const r = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": env.OCR_API_KEY,
          },
          body: JSON.stringify({
            imageBase64: body.imageBase64,
            mimeType: body.mimeType,
          }),
          redirect: "error",
          signal: AbortSignal.timeout(45000),
        });
        if (!r.ok) throw Error("RETRYABLE: OCR không phản hồi thành công");
        const output = (await r.json()) as { success: boolean; data: unknown };
        if (!output.success) throw Error("VALIDATION: OCR");
        const days = parseOcr(output.data, body.weekStart, body.defaultPrice);
        const drafted = await client.rpc("command", {
          kind: "menu.ocr",
          payload: { days, weekStart: body.weekStart, imagePath },
          expected_version: 0,
          request_id: crypto.randomUUID(),
        });
        if (drafted.error) throw drafted.error;
        return json({
          days,
          draftId: drafted.data.id,
          version: drafted.data.version,
        });
      }
      const match = url.pathname.match(/^\/api\/command\/([a-z.]+)$/);
      if (!match) return json({ message: "Không tìm thấy" }, 404);
      const input = commandSchema.parse(body);
      if (match[1] === "destination.save" && input.payload.webhook) {
        if (member.role !== "admin") throw Error("FORBIDDEN");
        if (!env.INTEGRATION_MASTER_KEY)
          throw Error("RETRYABLE: khóa tích hợp chưa cấu hình");
        const id = String(input.payload.id || crypto.randomUUID());
        input.payload.ciphertext = await encryptSecret(
          validateWebhook(String(input.payload.webhook)),
          id,
          env.INTEGRATION_MASTER_KEY,
        );
        input.payload.id = id;
        delete input.payload.webhook;
      }
      const { data, error } = await client.rpc("command", {
        kind: match[1],
        payload: input.payload,
        expected_version: input.expectedVersion,
        request_id: input.requestId,
      });
      if (error) throw error;
      return json(data);
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : String((e as { message?: string })?.message ?? "Lỗi xử lý");
      const code =
        [
          "UNAUTHENTICATED",
          "FORBIDDEN",
          "LOCKED",
          "CONFLICT",
          "VALIDATION",
          "RETRYABLE",
        ].find((c) => message.includes(c)) ?? "VALIDATION";
      const status = {
        UNAUTHENTICATED: 401,
        FORBIDDEN: 403,
        LOCKED: 423,
        CONFLICT: 409,
        VALIDATION: 422,
        RETRYABLE: 503,
      }[code];
      return json(
        {
          code,
          message:
            code === "VALIDATION"
              ? "Dữ liệu không hợp lệ. Kiểm tra các trường đã nhập."
              : message,
        },
        status,
      );
    }
  },
  async scheduled(_controller: unknown, env: Env) {
    await runJobs(env);
  },
};
