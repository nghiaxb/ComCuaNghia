import OrderNavigationBoundary from "../../src/features/OrderNavigationBoundary";
import { requestOrderNavigation } from "../../src/features/useOrderDraft";
import { createRoot } from "react-dom/client";
import { useState, useRef } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  MemoryRouter,
  Link,
} from "react-router-dom";
import Orders from "../../src/features/Orders";
import Settings from "../../src/features/Settings";
import { demo } from "../../src/lib/demo";
import type { Order } from "../../shared/contracts";
import "../../src/app/styles.css";
const params = new URLSearchParams(location.search);
function Fixture() {
  const [data, setData] = useState(() => {
    const d = structuredClone(demo);
    d.member.role = "employee";
    d.member.order_save_mode = params.has("manual") ? "manual" : "autosave";
    d.member.can_manage_finance = false;
    d.days = d.days.slice(0, 2);
    d.orders = [];
    d.settledWeeks = params.has("settled") ? [d.days[0].date] : [];
    if (params.has("locked")) d.days[0].locked = true;
    d.recipients = [
      { id: d.member.id, display_name: d.member.display_name },
      { id: "friend", display_name: "Lan" },
    ];
    return d;
  });
  const [loggedOut, setLoggedOut] = useState(false);
  const [count, setCount] = useState(0),
    [request, setRequest] = useState("");
  const ref = useRef(data);
  ref.current = data;
  const [settings, setSettings] = useState(params.has("settings"));
  const ids = useRef(new Map<string, Order>()),
    failed = useRef(false);
  return (
    <>
      {params.has("router") && <OrderNavigationBoundary />}
      <button onClick={() => requestOrderNavigation(() => setLoggedOut(true))}>
        Đăng xuất thử
      </button>
      <output aria-label="Đã đăng xuất">{loggedOut ? "yes" : "no"}</output>
      <Link to="/settings">Rời màn hình</Link>
      <button
        onClick={() =>
          setData((d) => ({
            ...d,
            member: { ...d.member, order_save_mode: "autosave" },
          }))
        }
      >
        Phiên khác bật tự lưu
      </button>
      <button onClick={() => setSettings(!settings)}>Đổi màn hình</button>
      <button
        onClick={() =>
          setData((d) => ({
            ...d,
            orders: [
              {
                id: "remote",
                day_id: d.days[0].id,
                member_id: d.member.id,
                status: "active",
                version: 10,
                items: [
                  {
                    menuItemId: d.foods[0].id,
                    name: d.foods[0].name,
                    unitPrice: 35000,
                    quantity: 4,
                    note: "Remote",
                  },
                ],
              },
            ],
          }))
        }
      >
        Người khác sửa
      </button>
      {settings ? (
        <Settings
          data={data}
          busy={false}
          readOnly={false}
          mutate={async (k, p) => {
            setRequest(JSON.stringify({ k, p }));
            setData((d) => ({
              ...d,
              member: { ...d.member, order_save_mode: p.orderSaveMode as any },
            }));
            return {};
          }}
        />
      ) : (
        <Orders
          routeBlocking={params.has("router")}
          loadRecipientOrder={async () => null}
          data={data}
          busy={false}
          readOnly={params.has("preview")}
          commitOrder={async (r) => {
            setRequest(JSON.stringify(r));
            if (params.has("error") && !failed.current) {
              failed.current = true;
              throw new TypeError("Mất kết nối");
            }
            if (params.has("slow"))
              await new Promise((resolve) => setTimeout(resolve, 1500));
            if (ids.current.has(r.requestId))
              return ids.current.get(r.requestId)!;
            const old =
              ref.current.orders.find(
                (o) =>
                  o.day_id === r.payload.dayId &&
                  o.member_id === r.payload.memberId,
              ) || ref.current.orders.find((o) => o.id === r.payload.orderId);
            const order: Order = {
              id: old?.id ?? "saved-" + r.payload.memberId,
              day_id: old?.day_id ?? String(r.payload.dayId),
              member_id: old?.member_id ?? String(r.payload.memberId),
              version: r.version + 1,
              status: r.kind === "order.cancel" ? "cancelled" : "active",
              items:
                r.kind === "order.cancel"
                  ? old!.items
                  : (r.payload.items as any[]).map((i) => ({
                      ...i,
                      name:
                        ref.current.foods.find((f) => f.id === i.menuItemId)
                          ?.name ?? "Meal",
                      unitPrice: 35000,
                    })),
            };
            ids.current.set(r.requestId, order);
            setCount((n) => n + 1);
            setData((d) => ({
              ...d,
              orders: [...d.orders.filter((o) => o.id !== order.id), order],
            }));
            return order;
          }}
          mutate={async (k, p) => {
            if (k === "profile.save")
              setData((d) => ({
                ...d,
                member: {
                  ...d.member,
                  order_save_mode: p.orderSaveMode as any,
                },
              }));
            return {};
          }}
        />
      )}
      <output aria-label="Số lần ghi">{count}</output>
      <output aria-label="Yêu cầu">{request}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  params.has("router") ? (
    <RouterProvider
      router={createBrowserRouter([{ path: "*", element: <Fixture /> }])}
    />
  ) : (
    <MemoryRouter>
      <Fixture />
    </MemoryRouter>
  ),
);
