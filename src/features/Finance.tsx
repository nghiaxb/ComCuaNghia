import { Textarea } from "../components/ui/textarea";
import { useDecision } from "./useDecision";
import { NativeSelect } from "../components/ui/native-select";
import Button from "../components/ui/ActionButton";
import { Input } from "../components/ui/input";
import BillSummary, { dayBill } from "./BillSummary";
import BillEditor from "./BillEditor";
import { useEffect, useState } from "react";
import { QRPay } from "vietnam-qr-pay";
import QRCode from "qrcode";
import type { PageProps } from "./common";
import { vnd, Person, Field, Empty } from "./common";
import WeekPicker from "./WeekPicker";
import { weekStart, defaultMenuWeek, vietnamDate } from "../../shared/time";
export default function Finance({ data, mutate, busy, readOnly }: PageProps) {
  const [adjustMember, setAdjustMember] = useState(data.member.id);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");
  const [week, setWeek] = useState(defaultMenuWeek());
  const { confirm, prompt, dialog } = useDecision(week);
  const [qr, setQr] = useState("");
  const [amount, setAmount] = useState(0);
  const [ref, setRef] = useState("");
  const [csvError, setCsvError] = useState("");
  const finance =
    data.member.role === "admin" || data.member.can_manage_finance;
  const visibleEntries = data.entries.filter(
    (e) => finance || e.member_id === data.member.id,
  );
  const weekEntries = visibleEntries.filter(
    (e) =>
      (e.week_start ?? weekStart(vietnamDate(new Date(e.created_at)))) === week,
  );
  const settled = data.settledWeeks?.includes(week) ?? false;
  const mine = data.entries
    .filter((e) => e.member_id === data.member.id)
    .reduce((s, e) => s + Number(e.amount), 0);
  const cfg = data.settings.data;
  const purpose = "COM " + data.member.id.slice(0, 8).toUpperCase();
  useEffect(() => {
    setQr("");
    if (mine <= 0 || !/^\d{6}$/.test(cfg.bankCode) || !cfg.accountNumber)
      return;
    const content = QRPay.initVietQR({
      bankBin: cfg.bankCode,
      bankNumber: cfg.accountNumber,
      amount: String(mine),
      purpose,
    }).build();
    let cancelled = false;
    void QRCode.toDataURL(content, { width: 256, margin: 2 }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [mine, cfg.bankCode, cfg.accountNumber, purpose]);
  const days = data.days.filter((d) => weekStart(d.date) === week);
  async function exportCsv() {
    try {
      if (!readOnly)
        await mutate("audit.export", { type: "finance-csv", weekStart: week });
      const cell = (s: unknown) =>
        '"' +
        String(s)
          .replace(/^[=+@-]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      const text =
        "\uFEFFThành viên,Số tiền,Loại,Ghi chú\n" +
        weekEntries
          .map((e) =>
            [
              data.members.find((m) => m.id === e.member_id)?.display_name ??
                e.member_id,
              e.amount,
              e.kind,
              e.note,
            ]
              .map(cell)
              .join(","),
          )
          .join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([text], { type: "text/csv;charset=utf-8" }),
      );
      a.download = `cong-no-${week}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      setCsvError("Không thể xuất dữ liệu");
    }
  }
  return (
    <>
      {dialog}
      <div className="page-title">
        <div>
          <p className="eyebrow">RÕ RÀNG TỪNG BỮA ĂN</p>
          <h1>Công nợ & thanh toán</h1>
          <p>Khoản phải trả, khoản đã nhận và lịch sử luôn khớp nhau.</p>
        </div>
        <Button className="secondary" onClick={() => void exportCsv()}>
          Xuất CSV
        </Button>
      </div>
      {csvError && <p className="error">{csvError}</p>}
      <WeekPicker
        value={week}
        onChange={setWeek}
        availableWeeks={[
          ...data.days.map((d) => weekStart(d.date)),
          ...visibleEntries.map(
            (e) =>
              e.week_start ?? weekStart(vietnamDate(new Date(e.created_at))),
          ),
        ]}
        label="Tuần công nợ"
      />
      <div className="stats">
        <article>
          <span>Số dư của bạn · tất cả các tuần</span>
          <strong>{vnd(mine)}</strong>
        </article>
        <article>
          <span>Đang chờ xác nhận</span>
          <strong>
            {
              data.payments.filter(
                (p) =>
                  p.member_id === data.member.id && p.status === "reported",
              ).length
            }
          </strong>
        </article>
        <article>
          <span>Bút toán tuần đã chọn</span>
          <strong>{weekEntries.length}</strong>
        </article>
      </div>
      <div className="two-col">
        <section className="panel">
          <h2>Chuyển tiền cơm</h2>
          {qr ? (
            <img className="qr" src={qr} alt="QR thanh toán tiền cơm" />
          ) : (
            <p className="muted">
              {mine <= 0
                ? "Bạn không có khoản phải trả."
                : "Cần cấu hình tài khoản ngân hàng để tạo QR."}
            </p>
          )}
          <p>
            <b>{cfg.accountName}</b> · {cfg.accountNumber}
          </p>
          <p>
            Nội dung: <b>{purpose}</b>
          </p>
          <p className="fine">
            QR được tạo trên thiết bị. Quét QR không đồng nghĩa đã thanh toán.
          </p>
        </section>
        <section className="panel">
          <h2>Báo đã chuyển tiền</h2>
          <Field label="Số tiền đã chuyển">
            <Input
              type="number"
              min="1"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          <Field label="Nội dung / mã tham chiếu">
            <Input
              value={ref}
              maxLength={200}
              onChange={(e) => setRef(e.target.value)}
            />
          </Field>
          <Button
            className="primary"
            disabled={busy || readOnly || amount <= 0 || !ref}
            onClick={() =>
              void mutate("payment.report", { amount, reference: ref })
            }
          >
            Tôi đã chuyển tiền
          </Button>
          <p className="fine">
            Số dư chỉ thay đổi sau khi người quản lý xác nhận đã nhận tiền.
          </p>
        </section>
      </div>
      {finance && (
        <section className="panel">
          <h2>Khoản chuyển đang chờ</h2>
          {data.payments
            .filter((p) => p.status === "reported")
            .map((p) => (
              <div className="order-row" key={p.id}>
                <Person
                  name={
                    data.members.find((m) => m.id === p.member_id)
                      ?.display_name ?? "Thành viên"
                  }
                />
                <b>{vnd(p.amount)}</b>
                <span>{p.reference}</span>
                <Button
                  className="secondary"
                  disabled={busy || readOnly}
                  onClick={() =>
                    void mutate(
                      "payment.confirm",
                      { paymentId: p.id },
                      p.version,
                    )
                  }
                >
                  Xác nhận đã nhận
                </Button>
              </div>
            ))}
        </section>
      )}
      {finance && (
        <section className="panel">
          <div className="section-title">
            <h2>Quyết toán tuần</h2>
            <span>{settled ? "Đã quyết toán" : "Chưa quyết toán"}</span>
          </div>
          {days.map((d) => (
            <div className="settle-day" key={d.id}>
              <h3>
                {d.date} · {d.locked ? "Đã khóa" : "Chưa khóa"}
              </h3>
              <BillSummary bill={dayBill(data, d.id)} />
              <BillEditor
                key={d.id}
                data={data}
                bill={dayBill(data, d.id)}
                mutate={mutate}
                busy={busy}
                readOnly={readOnly}
              />
            </div>
          ))}
          <div className="actions">
            <Button
              className="primary"
              disabled={
                busy ||
                readOnly ||
                settled ||
                !days.length ||
                days.some(
                  (d) => !d.locked || dayBill(data, d.id).warnings.length > 0,
                )
              }
              onClick={() => {
                void (async () => {
                  await confirm("Quyết toán tuần và ghi công nợ?", () =>
                    mutate("finance.settle", {
                      weekStart: week,
                      billVersions: Object.fromEntries(
                        days.map((d) => [d.id, dayBill(data, d.id).version]),
                      ),
                    }),
                  );
                })();
              }}
            >
              Quyết toán tuần
            </Button>
            <Button
              className="secondary"
              disabled={busy || readOnly}
              onClick={() => {
                void (async () => {
                  await prompt("Lý do mở lại quyết toán", (reason) =>
                    mutate("finance.reopen", { weekStart: week, reason }),
                  );
                })();
              }}
            >
              Mở lại kỳ
            </Button>
            <Field label="Thành viên điều chỉnh">
              <NativeSelect
                value={adjustMember}
                onChange={(e) => setAdjustMember(e.target.value)}
              >
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Số tiền VND (âm để giảm nợ)">
              <Input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
              />
            </Field>
            <Field label="Lý do điều chỉnh">
              <Textarea
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
            </Field>
            <Button
              className="secondary"
              disabled={
                busy ||
                readOnly ||
                !adjustNote.trim() ||
                !Number.isSafeInteger(adjustAmount)
              }
              onClick={() =>
                void mutate("finance.adjust", {
                  memberId: adjustMember,
                  amount: adjustAmount,
                  note: adjustNote,
                })
              }
            >
              Thêm điều chỉnh
            </Button>
          </div>
        </section>
      )}
      <section className="panel">
        <h2>
          {finance ? "Chi tiết đơn trong tuần" : "Bữa ăn của bạn trong tuần"}
        </h2>
        {data.orders
          .filter(
            (o) =>
              days.some((d) => d.id === o.day_id) &&
              (finance || o.member_id === data.member.id),
          )
          .map((o) => (
            <div className="order-row" key={o.id}>
              <span>
                {data.days.find((d) => d.id === o.day_id)?.date} ·{" "}
                {o.status === "active" ? "Đã đặt" : "Đã hủy"}
              </span>
              {finance && (
                <Person
                  name={
                    data.members.find((m) => m.id === o.member_id)
                      ?.display_name ?? "Thành viên"
                  }
                />
              )}
              <span>
                {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
              </span>
              <strong>
                {vnd(o.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}
              </strong>
            </div>
          ))}
      </section>
      <section className="panel">
        <h2>Sổ công nợ tuần đã chọn</h2>
        {!weekEntries.length ? (
          <Empty text="Chưa phát sinh bút toán công nợ." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thành viên</th>
                  <th>Nội dung</th>
                  <th>Loại</th>
                  <th>Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {weekEntries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {data.members.find((m) => m.id === e.member_id)
                        ?.display_name ?? e.member_id}
                    </td>
                    <td>{e.note}</td>
                    <td>{e.kind}</td>
                    <td>{vnd(Number(e.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
