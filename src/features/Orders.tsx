import { proxyOrder } from "../lib/api";
import type { Order } from "../../shared/contracts";
import { MealArt } from "./MealArt";
import { useEffect, useState } from "react";
import { ShoppingBag, Plus, Minus, LockKeyhole, Clock3 } from "lucide-react";
import type { PageProps } from "./common";
import { Empty, vnd, Field } from "./common";
import WeekPicker from "./WeekPicker";
import { defaultMenuWeek, weekStart, vietnamDate } from "../../shared/time";
export default function Orders({
  data,
  mutate,
  busy,
  readOnly,
  loadRecipientOrder = proxyOrder,
}: PageProps & { loadRecipientOrder?: typeof proxyOrder }) {
  const [week, setWeek] = useState(defaultMenuWeek());
  const days = data.days
    .filter((d) => weekStart(d.date) === week)
    .sort((a, b) => a.date.localeCompare(b.date));
  const [selectedDate, setDate] = useState(vietnamDate());
  const date = days.some((d) => d.date === selectedDate)
    ? selectedDate
    : (days[0]?.date ?? week);
  const settled = data.settledWeeks?.includes(week) ?? false;
  const [memberId, setMemberId] = useState(data.member.id);
  const [reason, setReason] = useState("");
  const proxy = memberId !== data.member.id;
  const recipients = data.recipients ?? data.members.filter((m) => m.active);
  const recipient = recipients.find((m) => m.id === memberId);
  const day = data.days.find((d) => d.date === date);
  const [remoteOrder, setRemoteOrder] = useState<{
    dayId: string;
    memberId: string;
    order: Order | null;
  } | null>(null);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientError, setRecipientError] = useState("");
  const localOrder = data.orders.find(
    (o) => o.day_id === day?.id && o.member_id === memberId,
  );
  const order =
    localOrder ??
    (remoteOrder &&
    remoteOrder.dayId === day?.id &&
    remoteOrder.memberId === memberId
      ? (remoteOrder.order ?? undefined)
      : undefined);
  useEffect(() => {
    let cancelled = false;
    setRecipientError("");
    if (!proxy || !day || localOrder || readOnly) {
      setRecipientLoading(false);
      return;
    }
    setRecipientLoading(true);
    void loadRecipientOrder(day.id, memberId)
      .then((order) => {
        if (!cancelled) setRemoteOrder({ dayId: day.id, memberId, order });
      })
      .catch((error) => {
        if (!cancelled)
          setRecipientError(
            error instanceof Error
              ? error.message
              : "Không tải được đơn của người nhận",
          );
      })
      .finally(() => {
        if (!cancelled) setRecipientLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proxy, day?.id, memberId, localOrder?.version, data.orders, readOnly]);
  const blocked =
    busy ||
    readOnly ||
    day?.locked ||
    settled ||
    recipientLoading ||
    !!recipientError;
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
    [day?.id, memberId, order?.id, order?.version],
  );
  const foods = data.foods.filter((f) => f.day_id === day?.id && f.active);
  const orderedItems = order?.status === "active" ? order.items : [];
  const total = cart.reduce(
    (sum, i) =>
      sum +
      i.quantity *
        (orderedItems.find((o) => o.menuItemId === i.menuItemId)?.unitPrice ??
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
      <WeekPicker
        value={week}
        onChange={setWeek}
        availableWeeks={data.days.map((d) => weekStart(d.date))}
        label="Tuần đặt cơm"
      />
      <div className="days">
        {days.map((d) => (
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
        {!days.length && (
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
          {settled && (
            <div className="notice">
              Tuần này đã quyết toán. Người quản lý cần mở lại kỳ trước khi thay
              đổi đơn.
            </div>
          )}
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
                        disabled={blocked}
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
            <ShoppingBag size={20} />{" "}
            {proxy ? "Đặt cơm hộ đồng nghiệp" : "Bữa trưa của bạn"}
          </h2>
          <p className="muted">
            {date} · {recipient?.display_name ?? data.member.display_name}
          </p>
          <Field label="Đặt cơm cho">
            <select
              value={memberId}
              disabled={busy || readOnly}
              onChange={(e) => {
                setMemberId(e.target.value);
                setReason("");
              }}
            >
              {recipients.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                  {m.id === data.member.id ? " (tôi)" : ""}
                </option>
              ))}
            </select>
          </Field>
          {proxy && (
            <>
              <Field label="Lý do đặt hoặc chỉnh hộ">
                <input
                  value={reason}
                  maxLength={500}
                  disabled={blocked}
                  placeholder="Đồng nghiệp nhờ đặt…"
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
              <p className="fine">
                Ghi nhận bạn là người thao tác, {recipient?.display_name} là
                người nhận cơm. Đơn hiện có sẽ được tải để bạn chỉnh.
              </p>
            </>
          )}
          {recipientLoading && <p role="status">Đang tải đơn người nhận…</p>}
          {recipientError && (
            <p className="error" role="alert">
              {recipientError}
            </p>
          )}
          {order && order.status !== "active" && (
            <section aria-label="Đơn đã hủy">
              <h3>Đơn đã hủy</h3>
              {order.items.map((item) => (
                <p key={item.menuItemId}>
                  {item.name} ×{item.quantity} · {vnd(item.unitPrice)} / suất
                  {item.note ? ` · ${item.note}` : ""}
                </p>
              ))}
              <strong>
                {vnd(
                  order.items.reduce(
                    (sum, item) => sum + item.quantity * item.unitPrice,
                    0,
                  ),
                )}
              </strong>
            </section>
          )}
          {!cart.length ? (
            <div className="cart-empty">Chọn một món ngon để bắt đầu nhé.</div>
          ) : (
            cart.map((i) => (
              <div className="cart-item" key={i.menuItemId}>
                <strong>
                  {orderedItems.find((f) => f.menuItemId === i.menuItemId)
                    ?.name ?? foods.find((f) => f.id === i.menuItemId)?.name}
                </strong>
                <small>
                  {vnd(
                    orderedItems.find((f) => f.menuItemId === i.menuItemId)
                      ?.unitPrice ??
                      foods.find((f) => f.id === i.menuItemId)?.unit_price ??
                      0,
                  )}{" "}
                  / suất
                  {!foods.some((f) => f.id === i.menuItemId)
                    ? " · Món đã đặt, không còn trong menu"
                    : ""}
                </small>
                <div className="quantity">
                  <button
                    aria-label="Giảm"
                    disabled={blocked}
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
                    disabled={blocked}
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
                  disabled={blocked}
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
            disabled={
              !cart.length ||
              !day ||
              day.locked ||
              blocked ||
              (proxy && !reason.trim())
            }
            onClick={() =>
              void mutate(
                "order.save",
                {
                  dayId: day!.id,
                  memberId,
                  items: cart,
                  ...(proxy ? { reason: reason.trim() } : {}),
                },
                order?.version ?? 0,
              )
            }
          >
            {busy ? "Đang lưu…" : order ? "Lưu thay đổi" : "Đặt bữa trưa"}
          </button>
          {order?.status === "active" && (
            <button
              className="text-button wide"
              disabled={blocked || (proxy && !reason.trim())}
              onClick={() => {
                if (confirm("Hủy đơn cơm ngày này?"))
                  void mutate(
                    "order.cancel",
                    {
                      orderId: order.id,
                      ...(proxy ? { reason: reason.trim() } : {}),
                    },
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
