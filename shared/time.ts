export const vietnamDate = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
export function cutoff(day: string, time: string) {
  return new Date(Date.parse(`${day}T${time}:00+07:00`) - 86400000);
}
export const afterCutoff = (now: string, day: string, time: string) =>
  Date.parse(now) >= cutoff(day, time).getTime();
export function reminderDue(now: string, day: string, time: string) {
  const weekday = new Date(day + "T00:00:00Z").getUTCDay();
  const lag = Date.parse(now) - cutoff(day, time).getTime();
  return weekday >= 2 && weekday <= 5 && lag >= 0 && lag < 900000;
}
export function weekStart(date: string) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export const addDays = (day: string, n: number) =>
  new Date(Date.parse(day + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
