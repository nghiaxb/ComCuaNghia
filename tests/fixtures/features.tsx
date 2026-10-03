import { createRoot } from "react-dom/client";
import { useState } from "react";
import ImageUpload from "../../src/features/ImageUpload";
import Orders from "../../src/features/Orders";
import { demo } from "../../src/lib/demo";
import "../../src/app/styles.css";
function Fixture() {
  const [count, setCount] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [payload, setPayload] = useState("");
  const data = structuredClone(demo);
  data.member.role = "employee";
  data.members.push({
    ...data.member,
    id: "colleague",
    display_name: "Đồng nghiệp",
  });
  data.days = data.days.slice(0, 1);
  data.days[0].locked = new URLSearchParams(location.search).has("locked");
  const remoteOrders = [
    {
      id: "existing",
      day_id: data.days[0].id,
      member_id: "colleague",
      status: "active",
      version: 4,
      items: [
        {
          menuItemId: data.foods[0].id,
          name: data.foods[0].name,
          quantity: 2,
          note: "Ít cơm",
          unitPrice: 35000,
        },
      ],
    },
  ];
  data.orders = [];
  data.recipients = data.members.map((m) => ({
    id: m.id,
    display_name: m.display_name,
  }));
  return (
    <>
      <ImageUpload
        disabled={false}
        onImage={async (file) => {
          setCount((n) => n + 1);
          setPayload(file.name);
          if (new URLSearchParams(location.search).has("ocrError"))
            throw Error("OCR failed");
        }}
      />
      <output aria-label="Ảnh đã nhận">{count}</output>
      <output aria-label="Lệnh đã gửi">{payload}</output>
      <button onClick={() => setRefresh(refresh + 1)}>Refresh snapshot</button>
      <output aria-label="Refresh count">{refresh}</output>
      <Orders
        data={data}
        loadRecipientOrder={async (dayId, memberId) =>
          remoteOrders.find(
            (o) => o.day_id === dayId && o.member_id === memberId,
          ) ?? null
        }
        busy={false}
        readOnly={false}
        mutate={async (kind, payload, version) => {
          setPayload(JSON.stringify({ kind, payload, version }));
          return {};
        }}
      />
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
