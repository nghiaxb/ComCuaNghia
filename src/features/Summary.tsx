import Button from "../components/ui/Button";
import SharedOrderOverview from "./SharedOrderOverview";
import BillSummary, { dayBill } from "./BillSummary";
import BillEditor from "./BillEditor";
import { useState } from "react";
import type { PageProps } from "./common";
import { Empty, vnd } from "./common";
import WeekPicker from "./WeekPicker";
import { defaultMenuWeek, weekStart } from "../../shared/time";
export default function Summary({ data, mutate, busy, readOnly }: PageProps) {
  const [copyError, setCopyError] = useState("");
  const [week, setWeek] = useState(defaultMenuWeek());
  const days = data.days
    .filter((d) => weekStart(d.date) === week)
    .sort((a, b) => a.date.localeCompare(b.date));
  const [selectedDay, setDay] = useState("");
  const dayId = days.some((d) => d.id === selectedDay)
    ? selectedDay
    : (days[0]?.id ?? "");
  const settled = data.settledWeeks?.includes(week) ?? false;
  const day = data.days.find((d) => d.id === dayId);
  const orders = data.orders.filter(
    (o) => o.day_id === dayId && o.status === "active",
  );
  const weekOrders = data.orders.filter(
    (o) => days.some((d) => d.id === o.day_id) && o.status === "active",
  );
  const weekCount = weekOrders.reduce(
    (sum, o) => sum + o.items.reduce((n, i) => n + i.quantity, 0),
    0,
  );
  const weekCost = weekOrders.reduce(
    (sum, o) => sum + o.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0),
    0,
  );
  const groups = new Map<
    string,
    { name: string; note: string; quantity: number }
  >();
  orders.forEach((o) =>
    o.items.forEach((i) => {
      const key = JSON.stringify([i.name, i.note.trim()]);
      const old = groups.get(key);
      groups.set(key, {
        name: i.name,
        note: i.note.trim(),
        quantity: (old?.quantity ?? 0) + i.quantity,
      });
    }),
  );
  const count = [...groups.values()].reduce((s, i) => s + i.quantity, 0);
  const staff = data.member.role !== "employee";
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">ĐIỀU PHỐI BỮA TRƯA</p>
          <h1>Tổng hợp đơn</h1>
          <p>Đủ món, đúng người, không bỏ sót ghi chú.</p>
        </div>
        <select
          aria-label="Ngày tổng hợp"
          value={dayId}
          onChange={(e) => setDay(e.target.value)}
        >
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {d.date}
            </option>
          ))}
        </select>
      </div>
      <WeekPicker
        value={week}
        onChange={(value) => {
          setWeek(value);
        }}
        availableWeeks={data.days.map((d) => weekStart(d.date))}
        label="Tuần tổng hợp"
      />
      <section className="panel" aria-label="Tổng hợp cả tuần">
        <h2>Tổng hợp cả tuần</h2>
        <p>
          {weekCount} suất · {new Set(weekOrders.map((o) => o.member_id)).size}{" "}
          người · {vnd(weekCost)}
        </p>
      </section>
      {settled && (
        <div className="notice">
          Tuần này đã quyết toán. Mở lại kỳ trước khi thay đổi ngày hoặc đơn.
        </div>
      )}
      <div className="stats">
        <article>
          <span>Tổng số suất</span>
          <strong>{count}</strong>
        </article>
        <article>
          <span>Người đã đặt</span>
          <strong>{orders.length}</strong>
        </article>
        <article>
          <span>Trạng thái</span>
          <strong className="small">
            {day?.locked ? "Đã khóa" : "Đang mở"}
          </strong>
        </article>
      </div>
      <div className="panel">
        <div className="section-title">
          <h2>Đơn gửi quán</h2>
          <Button
            className="secondary"
            disabled={!orders.length}
            onClick={() => {
              setCopyError("");
              void (async () => {
                await navigator.clipboard.writeText(
                  [...groups.values()]
                    .map(
                      (i) =>
                        `${i.name} ×${i.quantity}${i.note ? " — " + i.note : ""}`,
                    )
                    .join("\n") + `\nTổng: ${count} suất`,
                );
                if (!readOnly)
                  await mutate("audit.export", {
                    type: "supplier-summary",
                    dayId,
                  });
              })().catch(() =>
                setCopyError("Không sao chép được đơn. Vui lòng thử lại."),
              );
            }}
          >
            Sao chép đơn
          </Button>
        </div>
        {copyError && (
          <p role="alert" className="error">
            {copyError}
          </p>
        )}
        {!orders.length ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Món ăn</th>
                  <th>Ghi chú</th>
                  <th>Số suất</th>
                </tr>
              </thead>
              <tbody>
                {[...groups.values()].map((i, n) => (
                  <tr key={n}>
                    <td>{i.name}</td>
                    <td>{i.note || "Bình thường"}</td>
                    <td>
                      <b>{i.quantity}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {staff && (
          <Button
            className={day?.locked ? "secondary" : "primary"}
            disabled={!day || busy || readOnly || settled}
            onClick={() => {
              const reason = prompt(
                day?.locked ? "Lý do mở khóa" : "Lý do khóa ngày",
              );
              if (reason)
                void mutate(
                  "day.lock",
                  { dayId, locked: !day?.locked, reason },
                  day!.version,
                );
            }}
          >
            {day?.locked ? "Mở khóa ngày" : "Khóa ngày đặt cơm"}
          </Button>
        )}
      </div>
      {day && (
        <>
          <BillSummary bill={dayBill(data, day.id)} />
          <BillEditor
            key={day.id + ":" + dayBill(data, day.id).version}
            data={data}
            bill={dayBill(data, day.id)}
            mutate={mutate}
            busy={busy}
            readOnly={readOnly}
          />
          <SharedOrderOverview data={data} dayId={day.id} />
        </>
      )}
    </>
  );
}
