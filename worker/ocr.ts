import { z } from "zod";
import { addDays, weekStart } from "../shared/time";
import { localDate, money } from "../shared/contracts";
export class OcrError extends Error {
  constructor(
    readonly code: "VALIDATION" | "RETRYABLE",
    readonly stage: "input" | "provider" | "parse" | "draft",
    message: string,
  ) {
    super(message);
  }
}
const source = z.object({
  menu: z
    .array(z.object({ day: z.string(), foods: z.unknown() }))
    .min(1)
    .max(7),
});
const foods = z.array(z.string().trim().min(1).max(200)).min(1).max(100);
export function parseOcr(data: unknown, week: string, price: number) {
  if (!localDate.safeParse(week).success || weekStart(week) !== week)
    throw new OcrError(
      "VALIDATION",
      "input",
      "Chọn tuần bắt đầu bằng ngày thứ Hai.",
    );
  if (!money.safeParse(price).success)
    throw new OcrError(
      "VALIDATION",
      "input",
      "Giá mặc định không hợp lệ. Kiểm tra trong Cài đặt.",
    );
  const parsed = source.safeParse(data);
  if (!parsed.success)
    throw new OcrError(
      "VALIDATION",
      "parse",
      "OCR trả về cấu trúc menu chưa hợp lệ. Thử lại hoặc nhập menu thủ công.",
    );
  const seen = new Set<number>();
  const days = parsed.data.menu.flatMap((d) => {
    const label = d.day
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    const word = label.match(/^thu\s+(hai|ba|tu|nam|sau|bay)[:.]?$/)?.[1];
    const day = word
      ? (
          { hai: 2, ba: 3, tu: 4, nam: 5, sau: 6, bay: 7 } as Record<
            string,
            number
          >
        )[word]
      : Number(d.day.match(/\d+/)?.[0]);
    // Match the original Sheet: only import Monday–Friday.
    if (
      day === 7 ||
      day === 8 ||
      /^(chủ nhật|chu nhat|cn)$/i.test(d.day.trim())
    )
      return [];
    if (day < 2 || day > 6 || !Number.isInteger(day) || seen.has(day))
      throw new OcrError(
        "VALIDATION",
        "parse",
        "OCR có ngày không hợp lệ hoặc trùng ngày. Thử lại hoặc nhập menu thủ công.",
      );
    const items = foods.safeParse(d.foods);
    if (!items.success)
      throw new OcrError(
        "VALIDATION",
        "parse",
        `OCR chưa đọc được danh sách món hợp lệ cho thứ ${day}. Thử lại hoặc nhập thủ công.`,
      );
    seen.add(day);
    return [
      {
        date: addDays(week, day - 2),
        foods: items.data.map((name) => ({ name, unitPrice: price })),
      },
    ];
  });
  if (!days.length)
    throw new OcrError(
      "VALIDATION",
      "parse",
      "OCR không tìm thấy menu từ thứ Hai đến thứ Sáu.",
    );
  return days.sort((a, b) => a.date.localeCompare(b.date));
}
export async function requestOcr(
  url: string,
  apiKey: string,
  image: { imageBase64: string; mimeType: string },
) {
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== "https:") throw Error("endpoint");
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(image),
      redirect: "manual",
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) throw Error("upstream");
    const output = (await r.json()) as { success?: boolean; data?: unknown };
    if (output.success !== true || !output.data) throw Error("provider result");
    return output.data;
  } catch {
    throw new OcrError(
      "RETRYABLE",
      "provider",
      "Dịch vụ OCR chưa đọc được ảnh menu. Vui lòng thử lại; ảnh đã chọn vẫn được giữ để xem trước.",
    );
  }
}
