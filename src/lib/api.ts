import { supabase } from "./supabase";
import type { Snapshot, Order } from "../../shared/contracts";
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
async function request<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await supabase!.auth.getSession();
  const r = await fetch("/api/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${data.session?.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await r.json();
  if (!r.ok)
    throw new ApiError(
      result.message || "Không thể lưu thay đổi",
      result.code ?? "UNKNOWN",
      r.status,
    );
  return result;
}
export const snapshot = () => request<Snapshot>("snapshot");
export const command = (
  kind: string,
  payload: Record<string, unknown>,
  version = 0,
  requestId: string = crypto.randomUUID(),
) =>
  request<Record<string, unknown>>("command/" + kind, {
    requestId,
    expectedVersion: version,
    payload,
  });
export const ocr = (
  imageBase64: string,
  mimeType: string,
  weekStart: string,
  defaultPrice: number,
) =>
  request<{
    draftId: string;
    version: number;
    days: { date: string; foods: { name: string; unitPrice: number }[] }[];
  }>("ocr", { imageBase64, mimeType, weekStart, defaultPrice });

export const proxyOrder = (dayId: string, memberId: string) =>
  request<Order | null>(
    `proxy-order?dayId=${encodeURIComponent(dayId)}&memberId=${encodeURIComponent(memberId)}`,
  );
