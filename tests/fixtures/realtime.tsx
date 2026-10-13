// In-process transport fixture: real React/autosave/refresh, not live Supabase.
import { createRoot } from "react-dom/client";
import { useState, useEffect, useRef } from "react";
import { MemoryRouter } from "react-router-dom";
import Orders from "../../src/features/Orders";
import { createRefresh } from "../../src/lib/refresh";
import { demo } from "../../src/lib/demo";
import type { Snapshot, Order } from "../../shared/contracts";
import "../../src/app/styles.css";
const actor = new URLSearchParams(location.search).get("actor") ?? "a";
const initial = structuredClone(demo);
initial.member.role = "employee";
initial.member.can_manage_finance = false;
initial.member.order_save_mode = "autosave";
initial.days = [{ id: "day", date: "2026-10-05", locked: false, version: 1 }];
initial.foods = [
  {
    id: "food",
    day_id: "day",
    name: "Cơm gà",
    unit_price: 35000,
    active: true,
  },
];
initial.orders = [];
initial.recipients = [
  { id: "a", display_name: "Nghĩa" },
  { id: "b", display_name: "Lan" },
];
initial.shared = {
  roster: initial.recipients.map((m) => ({ ...m, active: true })),
  actors: [],
  bills: [],
};
const channel = new BroadcastChannel("realtime-fixture");
const read = () =>
  JSON.parse(
    localStorage.getItem("realtime-fixture") ?? JSON.stringify(initial),
  ) as Snapshot;
function calc(d: Snapshot) {
  const orders = d.orders.filter((o) => o.status === "active");
  const original = orders.reduce(
      (s, o) => s + o.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0),
      0,
    ),
    discount = Math.round(original / 10),
    fee = original ? 1000 : 0,
    total = original - discount + fee;
  d.shared!.bills = [
    {
      dayId: "day",
      state: "preview",
      discountKind: "percent",
      discountValue: 10,
      original,
      discount,
      fee,
      total,
      version: 1,
      covered: [],
      sponsors: [],
      warnings: [],
      shares: orders.map((o) => ({ memberId: o.member_id, amount: total })),
    },
  ];
  return d;
}
function write(d: Snapshot) {
  localStorage.setItem("realtime-fixture", JSON.stringify(calc(d)));
  for (let i = 0; i < 20; i++) channel.postMessage("row");
  window.dispatchEvent(new Event("fixture-refresh"));
}
function mine(d: Snapshot) {
  d.member = {
    ...d.member,
    id: actor,
    display_name: actor === "a" ? "Nghĩa" : "Lan",
  };
  d.members = [d.member];
  return d;
}
function Fixture() {
  const [data, setData] = useState(() => mine(calc(read()))),
    [reads, setReads] = useState(0);
  const refresh = useRef<ReturnType<typeof createRefresh<Snapshot>> | null>(
    null,
  );
  const ids = useRef(new Map<string, Order>());
  useEffect(() => {
    const r = createRefresh(
      async () => {
        setReads((n) => n + 1);
        return mine(calc(read()));
      },
      setData,
      () => {},
      () => {},
    );
    refresh.current = r;
    void r.refresh();
    const listener = () => r.invalidate();
    channel.addEventListener("message", listener);
    window.addEventListener("storage", listener);
    window.addEventListener("fixture-refresh", listener);
    return () => {
      r.dispose();
      channel.removeEventListener("message", listener);
      window.removeEventListener("storage", listener);
      window.removeEventListener("fixture-refresh", listener);
    };
  }, []);
  const change = (action: (d: Snapshot) => void) => {
    const d = read();
    action(d);
    write(d);
  };
  return (
    <MemoryRouter>
      <div className="workspace">
        <main>
          <button
            onClick={() =>
              change((d) => {
                d.foods[0].unit_price = 40000;
                d.orders = d.orders.map((o) => ({
                  ...o,
                  version: o.version + 1,
                  items: o.items.map((i) => ({ ...i, unitPrice: 40000 })),
                }));
              })
            }
          >
            Cập nhật giá và burst
          </button>
          <button
            onClick={() =>
              change((d) => {
                d.foods[0].name = "Cơm mới";
                d.orders = d.orders.map((o) => ({
                  ...o,
                  version: o.version + 1,
                  status: "cancelled",
                }));
              })
            }
          >
            Đổi tên món
          </button>
          <button
            onClick={() =>
              change((d) => {
                d.days[0].locked = true;
                d.days[0].version++;
              })
            }
          >
            Khoá ngày
          </button>
          <button
            onClick={() =>
              change((d) => {
                d.days[0].locked = false;
                d.days[0].version++;
              })
            }
          >
            Mở lại và reconnect
          </button>
          <button onClick={() => refresh.current?.invalidate()}>
            Reconnect
          </button>
          <Orders
            data={data}
            busy={false}
            readOnly={false}
            commitOrder={async (r) => {
              if (ids.current.has(r.requestId))
                return ids.current.get(r.requestId)!;
              const d = read();
              const old = d.orders.find((o) =>
                r.kind === "order.cancel"
                  ? o.id === r.payload.orderId
                  : o.day_id === r.payload.dayId &&
                    o.member_id === r.payload.memberId,
              );
              if ((old?.version ?? 0) !== r.version)
                throw Object.assign(new Error("CONFLICT"), {
                  code: "CONFLICT",
                });
              const o: Order = {
                id: old?.id ?? "order-" + r.payload.memberId,
                day_id: "day",
                member_id: old?.member_id ?? String(r.payload.memberId),
                version: r.version + 1,
                status: r.kind === "order.cancel" ? "cancelled" : "active",
                items:
                  r.kind === "order.cancel"
                    ? old!.items
                    : (r.payload.items as any[]).map((i) => ({
                        ...i,
                        name: d.foods[0].name,
                        unitPrice: d.foods[0].unit_price,
                      })),
              };
              ids.current.set(r.requestId, o);
              d.orders = [...d.orders.filter((x) => x.id !== o.id), o];
              d.shared!.actors = [
                {
                  orderId: o.id,
                  actorId: actor,
                  actorName: actor === "a" ? "Nghĩa" : "Lan",
                  updatedAt: new Date().toISOString(),
                  kind: r.kind,
                },
              ];
              write(d);
              return o;
            }}
            mutate={async () => null}
          />
          <output aria-label="Số lần tải snapshot">{reads}</output>
        </main>
      </div>
    </MemoryRouter>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
