import { z } from "zod";
import { addDays, weekStart } from "../shared/time";
import { localDate, money } from "../shared/contracts";
const source = z.object({
  menu: z
    .array(
      z.object({
        day: z.string(),
        foods: z.array(z.string().trim().min(1).max(200)).min(1).max(100),
      }),
    )
    .min(1)
    .max(5),
});
export function parseOcr(data: unknown, week: string, price: number) {
  localDate.parse(week);
  money.parse(price);
  if (weekStart(week) !== week) throw Error("Chọn ngày thứ Hai");
  const input = source.parse(data);
  const seen = new Set<number>();
  return input.menu.map((d) => {
    const day = Number(d.day.match(/\d+/)?.[0]);
    if (day < 2 || day > 6 || !Number.isInteger(day) || seen.has(day))
      throw Error("Ngày OCR không hợp lệ hoặc trùng");
    seen.add(day);
    return {
      date: addDays(week, day - 2),
      foods: d.foods.map((name) => ({ name, unitPrice: price })),
    };
  });
}
