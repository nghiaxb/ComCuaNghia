import { useState } from "react";
import { Link } from "react-router-dom";
import type { Snapshot } from "../../shared/contracts";
import { vnd } from "./common";
import { dayBill } from "./BillSummary";
export default function SharedOrderOverview({
  data,
  dayId,
  compact = false,
}: {
  data: Snapshot;
  dayId: string;
  compact?: boolean;
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const day = data.days.find((d) => d.id === dayId);
  const bill = dayBill(data, dayId);
  const roster =
    data.shared?.roster ??
    data.recipients?.map((m) => ({ ...m, active: true })) ??
    data.members;
  const rows = roster
    .map((m) => ({
      m,
      o: data.orders.find((o) => o.day_id === dayId && o.member_id === m.id),
    }))
    .filter(
      ({ m, o }) =>
        (m.active || !!o) &&
        m.display_name
          .toLocaleLowerCase("vi")
          .includes(search.toLocaleLowerCase("vi")) &&
        (filter === "all" ||
          (filter === "unordered" ? !o : o?.status === filter)),
    );
  return (
    <section
      className={"panel shared-overview" + (compact ? " compact" : "")}
      aria-label="Đơn của mọi người"
    >
      <div className="section-title">
        <h2>Đơn của mọi người</h2>
        <span>
          {
            data.orders.filter(
              (o) => o.day_id === dayId && o.status === "active",
            ).length
          }
          /{roster.filter((m) => m.active).length} người đã đặt
        </span>
      </div>
      <div className="form-row">
        <input
          aria-label="Tìm người đặt"
          placeholder="Tìm đồng nghiệp…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Lọc trạng thái đơn"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="active">Đã đặt</option>
          <option value="unordered">Chưa đặt</option>
          <option value="cancelled">Đã huỷ</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Đồng nghiệp</th>
              <th>Đơn / ghi chú</th>
              <th>Tiền món / phần chia</th>
              <th>Thao tác gần nhất</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, o }) => {
              const actor = data.shared?.actors.find(
                  (a) => a.orderId === o?.id,
                ),
                share = bill.shares.find((s) => s.memberId === m.id);
              return (
                <tr key={m.id}>
                  <td>
                    <b>{m.display_name}</b>
                    {!m.active && <small> · Ngừng hoạt động</small>}
                    <div className="fine">
                      {o?.status === "active"
                        ? "Đã đặt"
                        : o
                          ? "Đã huỷ"
                          : "Chưa đặt"}
                    </div>
                  </td>
                  <td>
                    {o?.items.map((i) => (
                      <div key={i.menuItemId}>
                        {i.name} ×{i.quantity}
                        {i.note && <small> · {i.note}</small>}
                      </div>
                    )) ?? "—"}
                  </td>
                  <td>
                    {o?.status === "active"
                      ? vnd(
                          o.items.reduce(
                            (s, i) => s + i.quantity * i.unitPrice,
                            0,
                          ),
                        )
                      : "—"}
                    <div className="fine">
                      Chia: {share ? vnd(share.amount) : "—"}
                    </div>
                  </td>
                  <td>
                    {actor ? (
                      <>
                        <span>
                          {actor.actorName ?? "Thành viên"}
                          {actor.actorId !== m.id ? " · đặt/chỉnh hộ" : ""}
                        </span>
                        <div className="fine">
                          {new Date(actor.updatedAt).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {day &&
                      !day.locked &&
                      bill.state === "preview" &&
                      m.active && (
                        <Link
                          className="text-button"
                          to={`/order?date=${day.date}&member=${encodeURIComponent(m.id)}`}
                          aria-label={"Đặt/chỉnh hộ " + m.display_name}
                        >
                          {m.id === data.member.id
                            ? "Chỉnh đơn"
                            : "Đặt/chỉnh hộ"}
                        </Link>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="muted">Chưa có đơn phù hợp.</p>}
    </section>
  );
}
