import Button from "../components/ui/Button";
import { useState } from "react";
import type { BillPreview } from "../../shared/contracts";
import type { PageProps } from "./common";
import { Field } from "./common";
export default function BillEditor({
  data,
  bill,
  mutate,
  busy,
  readOnly,
}: { bill: BillPreview } & PageProps) {
  const [kind, setKind] = useState(bill.discountKind),
    [discount, setDiscount] = useState(bill.discountValue),
    [fee, setFee] = useState(bill.fee),
    [covered, setCovered] = useState(bill.covered),
    [sponsors, setSponsors] = useState(bill.sponsors);
  const finance =
    data.member.role === "admin" || data.member.can_manage_finance;
  if (!finance || bill.state !== "preview") return null;
  const members = (data.shared?.roster ?? data.members).filter(
    (m) =>
      data.orders.some(
        (o) =>
          o.day_id === bill.dayId &&
          o.member_id === m.id &&
          o.status === "active",
      ) ||
      covered.includes(m.id) ||
      sponsors.includes(m.id),
  );
  const toggle = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  const valid =
    Number.isFinite(discount) &&
    discount >= 0 &&
    (kind === "percent" ? discount <= 100 : Number.isSafeInteger(discount)) &&
    Number.isSafeInteger(fee) &&
    fee >= 0 &&
    !covered.some((id) => sponsors.includes(id)) &&
    (!covered.length || sponsors.length > 0);
  return (
    <section className="bill-editor" aria-label="Cấu hình bill">
      <div className="form-row">
        <Field label="Loại giảm giá">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="none">Không giảm</option>
            <option value="fixed">Số tiền VND</option>
            <option value="percent">Phần trăm</option>
          </select>
        </Field>
        <Field label="Giá trị giảm giá">
          <input
            type="number"
            min="0"
            max={kind === "percent" ? 100 : undefined}
            disabled={kind === "none"}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </Field>
        <Field label="Phí thêm VND">
          <input
            type="number"
            min="0"
            value={fee}
            onChange={(e) => setFee(Number(e.target.value))}
          />
        </Field>
      </div>
      <p className="fine">
        Chia theo tiền món; người tài trợ chia đều phần được bao. Giảm tiền cố
        định tối đa bằng tiền món hiện tại.
      </p>
      {members.map((m) => (
        <div className="order-row" key={m.id}>
          <span>{m.display_name}</span>
          <label>
            <input
              type="checkbox"
              checked={covered.includes(m.id)}
              onChange={() => setCovered(toggle(covered, m.id))}
            />{" "}
            Được bao
          </label>
          <label>
            <input
              type="checkbox"
              checked={sponsors.includes(m.id)}
              onChange={() => setSponsors(toggle(sponsors, m.id))}
            />{" "}
            Trả thay
          </label>
        </div>
      ))}
      {!valid && (
        <p className="error">Kiểm tra giảm giá/phí và danh sách tài trợ.</p>
      )}
      <Button
        className="secondary"
        disabled={busy || readOnly || !valid}
        onClick={() =>
          void mutate(
            "bill.save",
            {
              dayId: bill.dayId,
              discountKind: kind,
              discountValue: kind === "none" ? 0 : discount,
              fee,
              covered,
              sponsors,
            },
            bill.version,
          )
        }
      >
        Lưu bill
      </Button>
    </section>
  );
}
