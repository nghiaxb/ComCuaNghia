import { Checkbox } from "../components/ui/checkbox";
import { NativeSelect } from "../components/ui/native-select";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import Button from "../components/ui/ActionButton";
import { useEffect, useState } from "react";
import type { BillPreview } from "../../shared/contracts";
import type { PageProps } from "./common";
import { Field } from "./common";
export type BillDraft = {
  baseVersion: number;
  kind: BillPreview["discountKind"];
  discount: number;
  fee: number;
  covered: string[];
  sponsors: string[];
};
export default function BillEditor({
  data,
  bill,
  mutate,
  busy,
  readOnly,
  initialDraft,
  onDraftChange,
  onSaveAcknowledged,
  acknowledgedVersion,
}: {
  bill: BillPreview;
  initialDraft?: BillDraft;
  onDraftChange?: (draft: BillDraft) => void;
  onSaveAcknowledged?: (version: number) => void;
  acknowledgedVersion?: number;
} & PageProps) {
  const [baseVersion, setBaseVersion] = useState(
    initialDraft?.baseVersion ?? bill.version,
  );
  const [kind, setKind] = useState(initialDraft?.kind ?? bill.discountKind),
    [discount, setDiscount] = useState(
      initialDraft?.discount ?? bill.discountValue,
    ),
    [fee, setFee] = useState(initialDraft?.fee ?? bill.fee),
    [covered, setCovered] = useState(initialDraft?.covered ?? bill.covered),
    [sponsors, setSponsors] = useState(initialDraft?.sponsors ?? bill.sponsors);
  useEffect(() => {
    onDraftChange?.({ baseVersion, kind, discount, fee, covered, sponsors });
  }, [baseVersion, kind, discount, fee, covered, sponsors, onDraftChange]);
  // Only our save acknowledgement advances a remounted editor. Remote bill
  // snapshots must keep the draft's original expected version.
  useEffect(() => {
    if (acknowledgedVersion !== undefined)
      setBaseVersion((version) => Math.max(version, acknowledgedVersion));
  }, [acknowledgedVersion]);
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
    <Card
      role="region"
      className="bill-editor mb-5 gap-4 p-4 shadow-xs md:p-5"
      aria-label="Cấu hình bill"
    >
      {bill.version !== baseVersion && (
        <p role="alert" className="notice">
          Bill đã được chỉnh ở phiên khác. Bản nháp của bạn được giữ; tải cấu
          hình mới trước khi lưu.
          <Button
            variant="text"
            onClick={() => {
              setKind(bill.discountKind);
              setDiscount(bill.discountValue);
              setFee(bill.fee);
              setCovered(bill.covered);
              setSponsors(bill.sponsors);
              setBaseVersion(bill.version);
            }}
          >
            Tải cấu hình bill mới
          </Button>
        </p>
      )}
      <div className="form-row">
        <Field label="Loại giảm giá">
          <NativeSelect
            value={kind}
            disabled={busy || readOnly}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="none">Không giảm</option>
            <option value="fixed">Số tiền VND</option>
            <option value="percent">Phần trăm</option>
          </NativeSelect>
        </Field>
        <Field label="Giá trị giảm giá">
          <Input
            type="number"
            min="0"
            max={kind === "percent" ? 100 : undefined}
            disabled={kind === "none" || busy || readOnly}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </Field>
        <Field label="Phí thêm VND">
          <Input
            type="number"
            min="0"
            value={fee}
            disabled={busy || readOnly}
            onChange={(e) => setFee(Number(e.target.value))}
          />
        </Field>
      </div>
      <p className="fine">
        Chia theo tiền món; người tài trợ chia đều phần được bao. Giảm tiền cố
        định tối đa bằng tiền món hiện tại.
      </p>
      {!!members.length && (
        <details>
          <summary>
            Bao cơm & người trả thay
            {covered.length || sponsors.length
              ? ` · ${covered.length} được bao, ${sponsors.length} trả thay`
              : ""}
          </summary>
          {members.map((m) => (
            <div className="order-row" key={m.id}>
              <span>{m.display_name}</span>
              <label>
                <Checkbox
                  disabled={busy || readOnly}
                  checked={covered.includes(m.id)}
                  onCheckedChange={() => setCovered(toggle(covered, m.id))}
                />{" "}
                Được bao
              </label>
              <label>
                <Checkbox
                  disabled={busy || readOnly}
                  checked={sponsors.includes(m.id)}
                  onCheckedChange={() => setSponsors(toggle(sponsors, m.id))}
                />{" "}
                Trả thay
              </label>
            </div>
          ))}
        </details>
      )}
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
            baseVersion,
          ).then((result) => {
            if (result && typeof result.version === "number") {
              onSaveAcknowledged?.(result.version);
              setBaseVersion(result.version);
            }
          })
        }
      >
        Lưu bill
      </Button>
    </Card>
  );
}
