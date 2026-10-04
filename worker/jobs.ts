import { formatChat } from "./chat";
import { createClient } from "@supabase/supabase-js";
import type { Env } from "./env";
import { decryptSecret, validateWebhook } from "./secrets";
export async function runJobs(env: Env) {
  if (!env.SUPABASE_SECRET_KEY || !env.INTEGRATION_MASTER_KEY) return;
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
  const { error: enqueueError } = await db.rpc("enqueue_reminders");
  if (enqueueError) throw Error("Reminder scheduling failed");
  const { data, error } = await db.rpc("claim_deliveries");
  if (error) throw Error("Claim deliveries failed");
  for (const delivery of data ?? []) {
    let ok = false;
    let reason: string;
    let retryAfter = 0;
    try {
      const url = validateWebhook(
        await decryptSecret(
          delivery.ciphertext,
          delivery.destination_id,
          env.INTEGRATION_MASTER_KEY,
        ),
      );
      const p = delivery.payload;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatChat(p, env.APP_URL)),
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });
      ok = response.ok;
      reason = ok ? "" : `HTTP ${response.status}`;
      retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429
      )
        reason = "PERMANENT " + reason;
    } catch {
      reason =
        "Timeout hoặc lỗi kết nối; có thể đã giao, kiểm tra mã sự kiện trước khi gửi lại";
    }
    const { error: finishError } = await db.rpc("finish_delivery", {
      delivery_id: delivery.id,
      lease: delivery.lease_until,
      success: ok,
      error_message: reason,
      retry_seconds: Math.min(
        3600,
        Math.max(0, Number.isFinite(retryAfter) ? retryAfter : 0),
      ),
    });
    if (finishError) throw Error("Delivery result persistence failed");
  }
}
