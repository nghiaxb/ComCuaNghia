import { createRoot } from "react-dom/client";
import { useState } from "react";
import Menus from "../../src/features/Menus";
import { demo } from "../../src/lib/demo";
import type { Snapshot } from "../../shared/contracts";
import "../../src/app/styles.css";
function Fixture() {
  const [data, setData] = useState<Snapshot>(() => {
    const snapshot = structuredClone(demo);
    snapshot.days = [
      { id: "monday", date: "2026-09-28", locked: false, version: 3 },
      { id: "friday", date: "2026-10-02", locked: false, version: 1 },
      { id: "older", date: "2026-09-21", locked: false, version: 1 },
    ];
    snapshot.foods = [
      {
        id: "food-monday",
        day_id: "monday",
        name: "Cơm gà",
        unit_price: 35000,
        active: true,
      },
    ];
    snapshot.orders = ["monday", "friday", "older"].map((day_id, i) => ({
      id: `order-${i}`,
      day_id,
      member_id: snapshot.member.id,
      items: [],
      status: "active",
      version: 1,
    }));
    return snapshot;
  });
  const [command, setCommand] = useState("");
  return (
    <>
      <Menus
        data={data}
        busy={false}
        readOnly={false}
        mutate={async (kind, payload, version) => {
          setCommand(JSON.stringify({ kind, payload, version }));
          if (kind === "menu.draft.save")
            setData((old) => ({
              ...old,
              drafts: [
                {
                  id: "saved",
                  week_start: String(payload.weekStart),
                  days: payload.days as Snapshot["drafts"][number]["days"],
                  version: 1,
                },
              ],
            }));
          return { id: "saved", version: 1 };
        }}
      />
      <output aria-label="Lệnh menu">{command}</output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
