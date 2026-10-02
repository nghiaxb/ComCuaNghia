import { useEffect, useState } from "react";
import { QRPay } from "vietnam-qr-pay";
import QRCode from "qrcode";
import type { PageProps } from "./common";
import { vnd, Person, Field, Empty } from "./common";
import { weekStart, vietnamDate } from "../../shared/time";
export default function Finance({ data, mutate, busy, readOnly }: PageProps) {
  const [adjustMember, setAdjustMember] = useState(data.member.id);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");
  const [week, setWeek] = useState(weekStart(vietnamDate()));
  const [qr, setQr] = useState("");
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [covered, setCovered] = useState<Record<string, string[]>>({});
  const [sponsors, setSponsors] = useState<Record<string, string[]>>({});
  const [amount, setAmount] = useState(0);
  const [ref, setRef] = useState("");
  const [csvError, setCsvError] = useState("");
  const finance =
    data.member.role === "admin" || data.member.can_manage_finance;
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
  const toggle = (map: Record<string, string[]>, day: string, id: string) => ({
    ...map,
    [day]: map[day]?.includes(id)
      ? map[day].filter((x) => x !== id)
      : [...(map[day] ?? []), id],
  });
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
        data.entries
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
      a.download = "cong-no.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      setCsvError("Không thể xuất dữ liệu");
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">RÕ RÀNG TỪNG BỮA ĂN</p>
          <h1>Công nợ & thanh toán</h1>
          <p>Khoản phải trả, khoản đã nhận và lịch sử luôn khớp nhau.</p>
        </div>
        <button className="secondary" onClick={() => void exportCsv()}>
          Xuất CSV
        </button>
      </div>
      {csvError && <p className="error">{csvError}</p>}
      <div className="stats">
        <article>
          <span>Số dư của bạn</span>
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
          <span>Tổng số bút toán</span>
          <strong>{data.entries.length}</strong>
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
            <input
              type="number"
              min="1"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          <Field label="Nội dung / mã tham chiếu">
            <input
              value={ref}
              maxLength={200}
              onChange={(e) => setRef(e.target.value)}
            />
          </Field>
          <button
            className="primary"
            disabled={busy || readOnly || amount <= 0 || !ref}
            onClick={() =>
              void mutate("payment.report", { amount, reference: ref })
            }
          >
            Tôi đã chuyển tiền
          </button>
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
                <button
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
                </button>
              </div>
            ))}
        </section>
      )}
      {finance && (
        <section className="panel">
          <div className="section-title">
            <h2>Quyết toán tuần</h2>
            <input
              aria-label="Tuần quyết toán"
              type="date"
              value={week}
              onChange={(e) => setWeek(weekStart(e.target.value))}
            />
          </div>
          {days.map((d) => {
            const orders = data.orders.filter(
              (o) => o.day_id === d.id && o.status === "active",
            );
            const original = orders.reduce(
              (s, o) =>
                s + o.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0),
              0,
            );
            return (
              <div className="settle-day" key={d.id}>
                <div className="form-row">
                  <b>{d.date}</b>
                  <span>{d.locked ? "Đã khóa" : "Chưa khóa"}</span>
                  <Field label="Tổng thực trả quán">
                    <input
                      type="number"
                      min="0"
                      value={totals[d.id] ?? original}
                      onChange={(e) =>
                        setTotals((x) => ({
                          ...x,
                          [d.id]: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                </div>
                {orders.map((o) => (
                  <div className="order-row" key={o.id}>
                    <span>
                      {
                        data.members.find((m) => m.id === o.member_id)
                          ?.display_name
                      }
                    </span>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={covered[d.id]?.includes(o.member_id) ?? false}
                        onChange={() =>
                          setCovered((x) => toggle(x, d.id, o.member_id))
                        }
                      />
                      Được bao
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={sponsors[d.id]?.includes(o.member_id) ?? false}
                        onChange={() =>
                          setSponsors((x) => toggle(x, d.id, o.member_id))
                        }
                      />
                      Trả thay
                    </label>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="actions">
            <button
              className="primary"
              disabled={
                busy || readOnly || !days.length || days.some((d) => !d.locked)
              }
              onClick={() => {
                if (confirm("Quyết toán tuần và ghi công nợ?"))
                  void mutate("finance.settle", {
                    weekStart: week,
                    totals,
                    covered,
                    sponsors,
                  });
              }}
            >
              Quyết toán tuần
            </button>
            <button
              className="secondary"
              disabled={busy || readOnly}
              onClick={() => {
                const reason = prompt("Lý do mở lại quyết toán");
                if (reason)
                  void mutate("finance.reopen", { weekStart: week, reason });
              }}
            >
              Mở lại kỳ
            </button>
            <Field label="Thành viên điều chỉnh">
              <select
                value={adjustMember}
                onChange={(e) => setAdjustMember(e.target.value)}
              >
                {data.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Số tiền VND (âm để giảm nợ)">
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
              />
            </Field>
            <Field label="Lý do điều chỉnh">
              <input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
            </Field>
            <button
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
            </button>
          </div>
        </section>
      )}
      <section className="panel">
        <h2>Sổ công nợ</h2>
        {!data.entries.length ? (
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
                {data.entries.map((e) => (
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
