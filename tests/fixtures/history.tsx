import {MemoryRouter} from 'react-router-dom';
import { createRoot } from "react-dom/client";
import { demo } from "../../src/lib/demo";
import Orders from "../../src/features/Orders";
import Summary from "../../src/features/Summary";
import Finance from "../../src/features/Finance";
const params = new URLSearchParams(location.search);
const data = structuredClone(demo);
  data.member.order_save_mode="manual";
data.member.role = params.has("admin") ? "admin" : "employee";
data.member.can_manage_finance = params.has("admin");
data.members.push({
  ...data.member,
  id: "colleague",
  display_name: "Private colleague",
});
data.days = Array.from({ length: 30 }, (_, i) => ({
  id: `history-${i}`,
  date: new Date(Date.UTC(2026, 7, 3 + i * 7)).toISOString().slice(0, 10),
  locked: false,
  version: 1,
}));
data.days.push({
  id: "current",
  date: "2026-10-05",
  locked: false,
  version: 1,
});
data.days[0].locked = params.has("locked");
if (params.has("weekAggregate"))
  data.days.push({
    id: "second-day",
    date: "2026-08-04",
    locked: false,
    version: 1,
  });
Object.assign(data, {
  settledWeeks: params.has("settled") ? ["2026-08-03"] : [],
});
data.foods = [
  {
    id: "active",
    day_id: "history-0",
    name: "New menu name",
    unit_price: 99000,
    active: true,
  },
];
data.orders = [
  {
    id: "old",
    day_id: "history-0",
    member_id: data.member.id,
    status: "active",
    version: 3,
    items: [
      {
        menuItemId: "retired",
        name: "Stored retired meal",
        unitPrice: 30000,
        quantity: 2,
        note: "Historical note",
      },
      {
        menuItemId: "active",
        name: "Original menu name",
        unitPrice: 25000,
        quantity: 1,
        note: "",
      },
    ],
  },
];
if (params.has("weekAggregate"))
  data.orders.push({
    ...data.orders[0],
    id: "second-order",
    day_id: "second-day",
  });
if (params.has("cancelled")) data.orders[0].status = "cancelled";
data.entries = [
  {
    id: "old-entry",
    member_id: data.member.id,
    amount: 85000,
    kind: "meal",
    note: "Old week debt",
    created_at: "2026-08-05T03:00:00Z",
    week_start: "2026-08-03",
  },
  {
    id: "current-entry",
    member_id: data.member.id,
    amount: 10000,
    kind: "adjustment",
    note: "New week debt",
    created_at: "2026-10-05T03:00:00Z",
    week_start: null,
  },
  {
    id: "private",
    member_id: "colleague",
    amount: 999999,
    kind: "meal",
    note: "Secret debt",
    created_at: "2026-08-05T03:00:00Z",
    week_start: "2026-08-03",
  },
];
const Feature = params.has("finance")
  ? Finance
  : params.has("summary")
    ? Summary
    : Orders;
createRoot(document.getElementById("root")!).render(
  <MemoryRouter><Feature
    data={data}
    busy={false}
    readOnly={false}
    mutate={async () => ({})}
  /></MemoryRouter>,
);
