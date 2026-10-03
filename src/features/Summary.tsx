import { useState } from "react";
import type { PageProps } from "./common";
import { Empty, Person, vnd, Field } from "./common";
import WeekPicker from "./WeekPicker";
import { defaultMenuWeek, weekStart } from "../../shared/time";
export default function Summary({ data, mutate, busy, readOnly }: PageProps) {
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
  const [member, setMember] = useState("");
  const [food, setFood] = useState("");
  const [reason, setReason] = useState("");
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
          setFood("");
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
          <button
            className="secondary"
            disabled={!orders.length}
            onClick={async () => {
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
            }}
          >
            Sao chép đơn
          </button>
        </div>
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
        <button
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
        </button>
      </div>
      <section className="panel">
        <h2>Chi tiết người đặt</h2>
        {orders.map((o) => (
          <div className="order-row" key={o.id}>
            <Person
              name={
                data.members.find((m) => m.id === o.member_id)?.display_name ??
                "Thành viên"
              }
            />
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
        <h2>Đặt hộ thành viên</h2>
        <div className="form-row">
          <Field label="Thành viên">
            <select value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">Chọn người</option>
              {data.members
                .filter((m) => m.active)
                .map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.display_name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Món ăn">
            <select value={food} onChange={(e) => setFood(e.target.value)}>
              <option value="">Chọn món</option>
              {data.foods
                .filter((f) => f.day_id === dayId && f.active)
                .map((f) => (
                  <option value={f.id} key={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Lý do">
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <button
          className="primary"
          disabled={
            busy ||
            readOnly ||
            settled ||
            !day ||
            day.locked ||
            !member ||
            !food ||
            !reason
          }
          onClick={() => {
            const existing = data.orders.find(
              (o) => o.day_id === dayId && o.member_id === member,
            );
            if (existing && !confirm("Thay đơn hiện tại bằng món vừa chọn?"))
              return;
            void mutate(
              "order.save",
              {
                dayId,
                memberId: member,
                items: [{ menuItemId: food, quantity: 1, note: "" }],
                reason,
              },
              existing?.version ?? 0,
            );
          }}
        >
          Lưu đơn đặt hộ
        </button>
      </section>
    </>
  );
}
