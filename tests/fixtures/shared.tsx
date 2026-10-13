import { createRoot } from "react-dom/client";
import { useRef, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import Summary from "../../src/features/Summary";
import Orders from "../../src/features/Orders";
import { dayBill } from "../../src/features/BillSummary";
import { demo } from "../../src/lib/demo";
import "../../src/app/styles.css";
import "../../src/lib/theme";
function Fixture() {
  const params = new URLSearchParams(location.search);
  const [data, setData] = useState(() => {
    const d = structuredClone(demo);
    if (params.has("manual")) d.member.order_save_mode = "manual";
    d.member.role = params.has("admin")
      ? "admin"
      : params.has("coordinator")
        ? "coordinator"
        : "employee";
    d.member.can_manage_finance = new URLSearchParams(location.search).has(
      "finance",
    );
    d.days = [{ id: "day", date: "2026-10-05", locked: false, version: 1 }];
    if (params.has("order")) {
      d.days.push({
        id: "day2",
        date: "2026-10-06",
        locked: false,
        version: 3,
      });
      d.foods = d.days.map((day, i) => ({
        id: i ? "food2" : "food",
        day_id: day.id,
        name: "Cơm gà",
        unit_price: 35000,
        active: true,
      }));
    }
    d.orders = [
      {
        id: "order",
        day_id: "day",
        member_id: "friend",
        status: "active",
        version: 1,
        items: [
          {
            menuItemId: "food",
            name: "Cơm gà",
            unitPrice: 35000,
            quantity: 2,
            note: "Ít cơm",
          },
        ],
      },
    ];
    d.shared = {
      roster: [
        { id: d.member.id, display_name: "Nghĩa", active: true },
        { id: "friend", display_name: "Lan", active: true },
        { id: "cancelled", display_name: "Mai", active: true },
      ],
      actors: [
        {
          orderId: "order",
          actorId: d.member.id,
          actorName: "Nghĩa",
          updatedAt: "2026-10-05T03:00:00Z",
          kind: "order.save",
        },
      ],
      bills: [
        {
          dayId: "day",
          state: "preview",
          discountKind: "percent",
          discountValue: 10,
          discount: 7000,
          fee: 1000,
          covered: [],
          sponsors: [],
          original: 70000,
          total: 64000,
          version: 1,
          shares: [{ memberId: "friend", amount: 64000 }],
          warnings: [],
        },
      ],
    };
    // Synthetic snapshot projection: UI must preserve any server-provided share.
    // This does not assert that the current allocator permits non-order sponsors.
    if (new URLSearchParams(location.search).has("shareWithoutOrder")) {
      d.shared.bills[0].shares = [
        { memberId: d.member.id, amount: 64000 },
        { memberId: "friend", amount: 0 },
      ];
    }
    d.orders.push({
      ...d.orders[0],
      id: "cancel",
      member_id: "cancelled",
      status: "cancelled",
    });
    if (params.has("settled")) {
      d.settledWeeks = ["2026-10-05"];
      d.shared.bills = d.shared.bills.map((bill) => ({
        ...bill,
        state: "settled",
      }));
    }
    return d;
  });
  const [submittedVersion, setSubmittedVersion] = useState<number>();
  const [command, setCommand] = useState("");
  const pendingBill = useRef<(() => void) | null>(null);
  const Screen = params.has("order") ? Orders : Summary;
  return (
    <MemoryRouter>
      <output aria-label="Phiên bản bill gửi">{submittedVersion}</output>
      <output aria-label="Lệnh ngày gửi" className="break-all">
        {command}
      </output>
      {params.has("delayBill") && (
        <button onClick={() => pendingBill.current?.()}>
          Xác nhận lưu bill
        </button>
      )}
      <button
        onClick={() =>
          setData((d) => ({
            ...d,
            orders: d.orders.map((o) =>
              o.id === "order"
                ? { ...o, items: o.items.map((i) => ({ ...i, quantity: 3 })) }
                : o,
            ),
            shared: {
              ...d.shared!,
              bills: d.shared!.bills.map((b) => ({
                ...b,
                version: b.version + 1,
                fee: 9000,
                original: 105000,
                discount: 10500,
                total: 95500,
                shares: [{ memberId: "friend", amount: 95500 }],
              })),
            },
          }))
        }
      >
        Cập nhật từ đồng nghiệp
      </button>
      <Screen
        data={data}
        busy={false}
        readOnly={params.has("readonly")}
        mutate={async (kind, payload, version) => {
          setSubmittedVersion(version);
          setCommand(JSON.stringify({ kind, payload, version }));
          if (params.has("order") && kind === "day.lock") {
            const day = data.days.find((day) => day.id === payload.dayId)!;
            const updated = {
              ...day,
              locked: Boolean(payload.locked),
              version: day.version + 1,
            };
            setData((d) => ({
              ...d,
              days: d.days.map((day) =>
                day.id === updated.id ? updated : day,
              ),
            }));
            return updated;
          }
          if (params.has("order") && kind === "bill.save") {
            if (params.has("delayBill"))
              await new Promise<void>((resolve) => {
                pendingBill.current = resolve;
              });
            const previous = dayBill(data, String(payload.dayId));
            if (version !== previous.version) return null;
            const discountKind =
              payload.discountKind as typeof previous.discountKind;
            const discountValue = Number(payload.discountValue),
              fee = Number(payload.fee);
            const discount =
              discountKind === "percent"
                ? Math.floor((previous.original * discountValue) / 100)
                : discountKind === "fixed"
                  ? Math.min(previous.original, discountValue)
                  : 0;
            const updated = {
              ...previous,
              discountKind,
              discountValue,
              discount,
              fee,
              total: previous.original - discount + fee,
              covered: payload.covered as string[],
              sponsors: payload.sponsors as string[],
              version: previous.version + 1,
            };
            setData((d) => ({
              ...d,
              shared: {
                ...d.shared!,
                bills: [
                  ...d.shared!.bills.filter(
                    (bill) => bill.dayId !== updated.dayId,
                  ),
                  updated,
                ],
              },
            }));
            return updated;
          }
          return {};
        }}
      />
    </MemoryRouter>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
