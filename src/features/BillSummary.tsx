import type { BillPreview, Snapshot } from "../../shared/contracts";
import { vnd } from "./common";
export function dayBill(data: Snapshot, dayId: string): BillPreview {
  const stored = data.shared?.bills.find((b) => b.dayId === dayId);
  if (stored) return stored;
  const original = data.orders
    .filter((o) => o.day_id === dayId && o.status === "active")
    .reduce(
      (n, o) => n + o.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      0,
    );
  return {
    dayId,
    state: "preview",
    discountKind: "none",
    discountValue: 0,
    discount: 0,
    fee: 0,
    original,
    total: original,
    covered: [],
    sponsors: [],
    version: 0,
    shares: [],
    warnings: [],
  };
}
export default function BillSummary({ bill }: { bill: BillPreview }) {
  return (
    <section className="panel bill-summary" aria-label="Bill trong ngày">
      <div className="section-title">
        <h2>Bill trong ngày</h2>
        <span>
          {bill.state === "preview"
            ? "Tạm tính · cập nhật theo đơn"
            : bill.state === "settled"
              ? "Đã quyết toán"
              : "Lịch sử cũ"}
        </span>
      </div>
      <dl className="bill-values">
        <div>
          <dt>Tiền món</dt>
          <dd>{vnd(bill.original)}</dd>
        </div>
        <div>
          <dt>
            Giảm giá
            {bill.discountKind === "percent" ? ` (${bill.discountValue}%)` : ""}
          </dt>
          <dd>
            {bill.discount === null ? "Chưa có dữ liệu" : vnd(bill.discount)}
          </dd>
        </div>
        <div>
          <dt>Phí thêm</dt>
          <dd>{bill.state === "legacy" ? "Chưa có dữ liệu" : vnd(bill.fee)}</dd>
        </div>
        <div>
          <dt>Tổng sau giảm giá</dt>
          <dd>{bill.total === null ? "Chưa có dữ liệu" : vnd(bill.total)}</dd>
        </div>
      </dl>
      {bill.warnings.map((w) => (
        <p className="notice" key={w}>
          {w}
        </p>
      ))}
    </section>
  );
}
