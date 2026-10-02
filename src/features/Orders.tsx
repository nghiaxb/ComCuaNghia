import { MealArt } from "./MealArt";
import { useEffect, useState } from "react";
import { ShoppingBag, Plus, Minus, LockKeyhole, Clock3 } from "lucide-react";
import type { PageProps } from "./common";
import { Empty, vnd, Field } from "./common";
import { vietnamDate } from "../../shared/time";
export default function Orders({ data, mutate, busy, readOnly }: PageProps) {
  const [date, setDate] = useState(
    data.days.find((d) => d.date >= vietnamDate())?.date ??
      data.days[0]?.date ??
      vietnamDate(),
  );
  const day = data.days.find((d) => d.date === date);
  const order = data.orders.find(
    (o) => o.day_id === day?.id && o.member_id === data.member.id,
  );
  const [cart, setCart] = useState<
    { menuItemId: string; quantity: number; note: string }[]
  >([]);
  useEffect(
    () =>
      setCart(
        order?.status === "active"
          ? order.items.map((i) => ({
              menuItemId: i.menuItemId,
              quantity: i.quantity,
              note: i.note,
            }))
          : [],
      ),
    [order?.id, order?.version],
  );
  const foods = data.foods.filter((f) => f.day_id === day?.id);
  const total = cart.reduce(
    (sum, i) =>
      sum +
      i.quantity *
        (order?.items.find((o) => o.menuItemId === i.menuItemId)?.unitPrice ??
          foods.find((f) => f.id === i.menuItemId)?.unit_price ??
          0),
    0,
  );
  function add(id: string) {
    setCart((old) =>
      old.some((i) => i.menuItemId === id)
        ? old.map((i) =>
            i.menuItemId === id
              ? { ...i, quantity: Math.min(100, i.quantity + 1) }
              : i,
          )
        : [...old, { menuItemId: id, quantity: 1, note: "" }],
    );
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">MỖI NGÀY, MỘT BỮA NGON</p>
          <h1>Hôm nay ăn gì?</h1>
          <p>Chọn món bạn thích. Phần còn lại để Nghĩa lo.</p>
        </div>
        <span className="tag">
          <Clock3 size={15} /> Mốc dự kiến {data.settings.data.cutoffTime} hôm
          trước
        </span>
      </div>
      <section className="hero">
        <div>
          <span className="tag light">BỮA TRƯA VĂN PHÒNG</span>
          <h2>
            Một bữa ngon,
            <br />
            thêm chút gắn kết.
          </h2>
          <p>Đặt cơm cùng đồng nghiệp, theo dõi mọi thay đổi ngay tại đây.</p>
        </div>
        <div className="bowl" aria-hidden="true">
          <MealArt />
        </div>
      </section>
      <div className="days">
        {data.days.slice(-15).map((d) => (
          <button
            key={d.id}
            className={date === d.date ? "selected" : ""}
            onClick={() => setDate(d.date)}
          >
            <small>
              {new Date(d.date + "T12:00:00").toLocaleDateString("vi-VN", {
                weekday: "short",
              })}
            </small>
            <strong>
              {d.date.slice(8)}/{d.date.slice(5, 7)}
            </strong>
            {d.locked && <LockKeyhole size={12} />}
          </button>
        ))}
        {!data.days.length && (
          <Field label="Ngày ăn">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        )}
      </div>
      <div className="order-grid">
        <section>
          <div className="section-title">
            <h2>Thực đơn trong ngày</h2>
            <span>{foods.length} món</span>
          </div>
          {day?.locked && (
            <div className="notice">
              Ngày này đã khóa. Người điều phối cần mở khóa trước khi thay đổi
              đơn.
            </div>
          )}
          {!foods.length ? (
            <Empty text="Menu chưa được công bố. Quay lại sau hoặc liên hệ người điều phối." />
          ) : (
            <div className="food-grid">
              {foods.map((food, i) => (
                <article className="food-card" key={food.id}>
                  <div className={"food-art tone-" + (i % 4)}>
                    <span style={{ width: 150, height: 120 }}>
                      <MealArt variant={i} />
                    </span>
                    <span className="food-index">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="food-body">
                    <small>BẾP NHÀ • CƠM TRƯA</small>
                    <h3>{food.name}</h3>
                    <div className="food-bottom">
                      <strong>{vnd(food.unit_price)}</strong>
                      <button
                        className="icon-button"
                        aria-label={"Thêm " + food.name}
                        onClick={() => add(food.id)}
                        disabled={day?.locked || readOnly}
                      >
                        <Plus size={19} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <aside className="cart">
          <h2>
            <ShoppingBag size={20} /> Bữa trưa của bạn
          </h2>
          <p className="muted">
            {date} · {data.member.display_name}
          </p>
          {!cart.length ? (
            <div className="cart-empty">Chọn một món ngon để bắt đầu nhé.</div>
          ) : (
            cart.map((i) => (
              <div className="cart-item" key={i.menuItemId}>
                <strong>
                  {foods.find((f) => f.id === i.menuItemId)?.name ??
                    order?.items.find((f) => f.menuItemId === i.menuItemId)
                      ?.name}
                </strong>
                <div className="quantity">
                  <button
                    aria-label="Giảm"
                    disabled={readOnly || day?.locked}
                    onClick={() =>
                      setCart((old) =>
                        old
                          .map((x) =>
                            x === i ? { ...x, quantity: x.quantity - 1 } : x,
                          )
                          .filter((x) => x.quantity > 0),
                      )
                    }
                  >
                    <Minus size={13} />
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    aria-label="Tăng"
                    disabled={readOnly || day?.locked}
                    onClick={() => add(i.menuItemId)}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                <input
                  aria-label="Ghi chú món"
                  placeholder="Ít cơm, không cay…"
                  maxLength={500}
                  value={i.note}
                  disabled={readOnly || day?.locked}
                  onChange={(e) =>
                    setCart((old) =>
                      old.map((x) =>
                        x === i ? { ...x, note: e.target.value } : x,
                      ),
                    )
                  }
                />
              </div>
            ))
          )}
          <div className="cart-total">
            <span>Tạm tính</span>
            <strong>{vnd(total)}</strong>
          </div>
          <button
            className="primary wide"
            disabled={!cart.length || !day || day.locked || busy || readOnly}
            onClick={() =>
              void mutate(
                "order.save",
                { dayId: day!.id, memberId: data.member.id, items: cart },
                order?.version ?? 0,
              )
            }
          >
            {busy ? "Đang lưu…" : order ? "Lưu thay đổi" : "Đặt bữa trưa"}
          </button>
          {order?.status === "active" && (
            <button
              className="text-button wide"
              disabled={busy || readOnly || day?.locked}
              onClick={() => {
                if (confirm("Hủy đơn cơm ngày này?"))
                  void mutate(
                    "order.cancel",
                    { orderId: order.id },
                    order.version,
                  );
              }}
            >
              Hủy đơn
            </button>
          )}
          <p className="fine">
            Sau mốc dự kiến vẫn được sửa đơn cho đến khi ngày đặt cơm được khóa.
          </p>
        </aside>
      </div>
    </>
  );
}
