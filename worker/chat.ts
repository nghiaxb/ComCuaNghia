export type ChatEvent = {
  eventId: string;
  actor?: string;
  subject?: string;
  reason?: string;
  kind: string;
  afterCutoff?: boolean;
  before?: {
    items?: { name: string; quantity: number; note: string }[];
    status?: string;
  };
  after?: {
    items?: { name: string; quantity: number; note: string }[];
    status?: string;
  };
  menu?: { date: string; foods: { name: string; unitPrice: number }[] }[];
};
const labels: Record<string, string> = {
  "order.save": "Cập nhật đơn cơm",
  "order.cancel": "Hủy đơn cơm",
  "day.lock": "Thay đổi khóa ngày",
  "menu.publish": "Thực đơn mới",
  "payment.report": "Báo đã chuyển tiền",
  "payment.confirm": "Xác nhận thanh toán",
  "finance.settle": "Quyết toán tuần",
  "finance.reopen": "Mở lại quyết toán",
  "settings.save": "Cập nhật cài đặt",
  "destination.test": "Kiểm tra kết nối Google Chat",
};
const clean = (s: string) => s.replace(/[<>]/g, "").slice(0, 1500);
const list = (o: ChatEvent["after"]) =>
  o?.status === "cancelled"
    ? "Đã hủy"
    : o?.items
        ?.map(
          (i) =>
            `${clean(i.name)} ×${i.quantity}${i.note ? " · " + clean(i.note) : ""}`,
        )
        .join("\n") || "Chưa đặt";
export function formatChat(p: ChatEvent, appUrl: string) {
  const lines = [
    `🍱 ${clean(p.actor ?? "Hệ thống")} · ${labels[p.kind] ?? clean(p.kind)}${p.afterCutoff ? " · SAU MỐC DỰ KIẾN" : ""}`,
  ];
  if (p.reason) lines.push(`Lý do: ${clean(p.reason)}`);
  if (p.subject) lines.push(`Thành viên: ${clean(p.subject)}`);
  if (p.kind.startsWith("order."))
    lines.push("Trước: " + list(p.before), "Sau: " + list(p.after));
  if (p.menu)
    for (const d of p.menu)
      lines.push(d.date, ...d.foods.map((f) => "• " + clean(f.name)));
  lines.push(appUrl, `Mã: ${p.eventId}`);
  return { text: lines.join("\n").slice(0, 28000) };
}
