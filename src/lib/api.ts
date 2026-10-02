import { supabase } from "./supabase";
import type { Snapshot } from "../../shared/contracts";
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
  if (!r.ok) throw Error(result.message || "Không thể lưu thay đổi");
  return result;
}
export const snapshot = () => request<Snapshot>("snapshot");
export const command = (
  kind: string,
  payload: Record<string, unknown>,
  version = 0,
) =>
  request<Record<string, unknown>>("command/" + kind, {
    requestId: crypto.randomUUID(),
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
