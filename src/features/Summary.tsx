import { NativeSelect } from "../components/ui/native-select";
import DailyWorkspace from "./DailyWorkspace";
import { useState } from "react";
import type { PageProps } from "./common";
import { vnd } from "./common";
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
  const count = orders.reduce(
    (sum, order) => sum + order.items.reduce((n, item) => n + item.quantity, 0),
    0,
  );
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">ĐIỀU PHỐI BỮA TRƯA</p>
          <h1>Tổng hợp đơn</h1>
          <p>Đủ món, đúng người, không bỏ sót ghi chú.</p>
        </div>
        <NativeSelect
          aria-label="Ngày tổng hợp"
          value={dayId}
          onChange={(e) => setDay(e.target.value)}
        >
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              {d.date}
            </option>
          ))}
        </NativeSelect>
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
      <DailyWorkspace
        data={data}
        dayId={dayId}
        mutate={mutate}
        busy={busy}
        readOnly={readOnly}
      />
    </>
  );
}
