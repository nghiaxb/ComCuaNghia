import { useOrderDraft } from "./useOrderDraft";
import ConfirmDialog from "./ConfirmDialog";
import { useLocation } from "react-router-dom";
import SharedOrderOverview from "./SharedOrderOverview";
import BillSummary, { dayBill } from "./BillSummary";
import { proxyOrder } from "../lib/api";
import type { Order } from "../../shared/contracts";
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
  commitOrder,
  routeBlocking = false,
  loadRecipientOrder = proxyOrder,
}: PageProps & { loadRecipientOrder?: typeof proxyOrder }) {
  const initialQuery = new URLSearchParams(location.search);
  const initialDate = initialQuery.get("date");
  const [week, setWeek] = useState(
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? weekStart(initialDate)
      : defaultMenuWeek(),
  );
  const days = data.days
    .filter((d) => weekStart(d.date) === week)
    .sort((a, b) => a.date.localeCompare(b.date));
  const [selectedDate, setDate] = useState(initialDate ?? vietnamDate());
  const date = days.some((d) => d.date === selectedDate)
    ? selectedDate
    : (days[0]?.date ?? week);
  const settled = data.settledWeeks?.includes(week) ?? false;
  const [memberId, setMemberId] = useState(
    initialQuery.get("member") ?? data.member.id,
  );
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
    if (!proxy || !day || localOrder || readOnly || data.shared) {
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
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const blocked =
    !online ||
    busy ||
    readOnly ||
    day?.locked ||
    settled ||
    recipientLoading ||
    !!recipientError;
  const preferredAutomatic =
    (data.member.order_save_mode ?? "autosave") === "autosave";
  const draft = useOrderDraft({
    routeBlocking,
    dayId: day?.id ?? "",
    memberId,
    order,
    automatic: preferredAutomatic,
    enabled: !!day && !blocked && (!proxy || !!reason.trim()),
    reason: proxy ? reason.trim() : "",
    submit: async (r) => {
      if (commitOrder) return commitOrder(r);
      const ack = await mutate(r.kind, r.payload, r.version);
      if (!ack || typeof ack.version !== "number")
        throw new Error("Không nhận được xác nhận lưu đơn");
      return ack as unknown as Order;
    },
  });
  const automatic = draft.automatic;
  const { cart } = draft.state;
  const setCart = draft.setCart;
  const route = useLocation();
  useEffect(() => {
    const q = new URLSearchParams(route.search),
      date = q.get("date"),
      recipient = q.get("member");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setWeek(weekStart(date));
      setDate(date);
    }
    if (
      recipient &&
      (data.recipients ?? data.members).some((m) => m.id === recipient)
    ) {
      setMemberId(recipient);
      setReason("");
    }
  }, [route.search]);
  const currentOrder = draft.state.order ?? order;
  const saveStatus = draft.state.status;
  const statusText =
    draft.state.message ||
    (!online
      ? "Mất kết nối · bản nháp được giữ"
      : blocked
        ? "Ngày/đơn đang được bảo vệ"
        : saveStatus === "saving"
          ? "Đang lưu…"
          : saveStatus === "saved"
            ? "Đã lưu"
            : draft.state.dirty
              ? proxy && !reason.trim()
                ? "Nhập lý do để lưu đơn đặt hộ"
                : automatic
                  ? "Chờ tự lưu…"
                  : "Có thay đổi chưa gửi"
              : automatic
                ? "Tự lưu đang bật"
                : "Bấm gửi để lưu đơn");
  const foods = data.foods.filter((f) => f.day_id === day?.id && f.active);
  const orderedItems =
    currentOrder?.status === "active" ? currentOrder.items : [];
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
  function decrease(id: string) {
    setCart((old) =>
      old
        .map((item) =>
          item.menuItemId === id
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }
  const saveBlocked =
    !day ||
    blocked ||
    (proxy && !reason.trim()) ||
    ["saving", "uncertain", "conflict", "locked", "error"].includes(
      saveStatus,
    ) ||
    (!cart.length && !draft.state.dirty);
  function saveOrder() {
    if (!saveBlocked) void draft.submit();
  }
  const cta = automatic
    ? saveStatus === "saving"
      ? "Đang lưu…"
      : draft.state.dirty
        ? "Lưu ngay"
        : "Đã lưu"
    : busy
      ? "Đang lưu…"
      : currentOrder
        ? "Lưu thay đổi"
        : "Đặt bữa trưa";
  return (
    <div className="orders-page">
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
      <WeekPicker
        value={week}
        onChange={(value) => draft.guard(() => setWeek(value))}
        availableWeeks={data.days.map((d) => weekStart(d.date))}
        label="Tuần đặt cơm"
      />
      <div className="days">
        {days.map((d) => (
          <button
            key={d.id}
            className={date === d.date ? "selected" : ""}
            onClick={() => draft.guard(() => setDate(d.date))}
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
              onChange={(e) => {
                const value = e.target.value;
                draft.guard(() => setDate(value));
              }}
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
            <ul className="meal-list" aria-label="Danh sách món">
              {foods.map((food, index) => {
                const quantity =
                  cart.find((item) => item.menuItemId === food.id)?.quantity ??
                  0;
                return (
                  <li
                    className={"meal-row" + (quantity ? " chosen" : "")}
                    key={food.id}
                  >
                    <span className="meal-number" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="meal-info">
                      <h3>{food.name}</h3>
                      <span>{vnd(food.unit_price)} / suất</span>
                      {quantity > 0 && <small>Đã chọn</small>}
                    </div>
                    <div className="meal-quantity">
                      <button
                        aria-label={"Giảm " + food.name}
                        disabled={blocked || !quantity}
                        onClick={() => decrease(food.id)}
                      >
                        <Minus size={16} />
                      </button>
                      <output aria-label={"Số lượng " + food.name}>
                        {quantity}
                      </output>
                      <button
                        aria-label={"Thêm " + food.name}
                        disabled={blocked || quantity >= 100}
                        onClick={() => add(food.id)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <aside className="cart" id="order-cart">
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
                const value = e.target.value;
                draft.guard(() => {
                  setMemberId(value);
                  setReason("");
                });
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
                            x.menuItemId === i.menuItemId
                              ? { ...x, quantity: x.quantity - 1 }
                              : x,
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
                        x.menuItemId === i.menuItemId
                          ? { ...x, note: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
              </div>
            ))
          )}
          <Field label="Cách lưu đơn">
            <select
              value={automatic ? "autosave" : "manual"}
              disabled={
                busy ||
                readOnly ||
                saveStatus === "saving" ||
                saveStatus === "uncertain"
              }
              onChange={(e) => {
                const mode = e.target.value;
                if (
                  mode === "autosave" &&
                  draft.state.dirty &&
                  !confirm("Bật tự lưu và gửi bản nháp hiện tại?")
                )
                  return;
                if (mode === "autosave") draft.allowAutomatic();
                void mutate(
                  "profile.save",
                  {
                    displayName: data.member.display_name,
                    orderSaveMode: mode,
                  },
                  data.member.version,
                );
              }}
            >
              <option value="autosave">Tự lưu</option>
              <option value="manual">Bấm gửi</option>
            </select>
          </Field>
          <p
            role="status"
            aria-label="Trạng thái lưu đơn"
            className={
              ["conflict", "error", "locked", "uncertain"].includes(saveStatus)
                ? "error"
                : "fine"
            }
          >
            {statusText}
          </p>
          {saveStatus === "uncertain" && (
            <button className="secondary" onClick={() => void draft.retry()}>
              Thử lưu lại
            </button>
          )}
          {["conflict", "locked", "error"].includes(saveStatus) && (
            <button
              className="secondary"
              onClick={() => {
                if (confirm("Bỏ bản nháp và tải đơn mới nhất?"))
                  draft.discard();
              }}
            >
              Tải đơn mới nhất
            </button>
          )}
          <div className="cart-total">
            <span>Tạm tính</span>
            <strong>{vnd(total)}</strong>
          </div>
          <button
            className="primary wide"
            disabled={saveBlocked}
            onClick={saveOrder}
          >
            {cta}
          </button>
          {currentOrder?.status === "active" && (
            <button
              className="text-button wide"
              disabled={
                blocked ||
                (proxy && !reason.trim()) ||
                ["saving", "uncertain", "conflict"].includes(saveStatus)
              }
              onClick={() => {
                if (confirm("Hủy đơn cơm ngày này?")) void draft.cancel();
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
      {day && (
        <>
          <BillSummary bill={dayBill(data, day.id)} />
          <SharedOrderOverview data={data} dayId={day.id} compact />
        </>
      )}
      {draft.modeConsent && (
        <ConfirmDialog
          title="Bật tự lưu cho bản nháp?"
          busy={false}
          onClose={draft.keepManual}
        >
          <p>
            Cài đặt đã chuyển sang tự lưu. Bản nháp hiện tại chỉ được gửi khi
            bạn đồng ý.
          </p>
          <div className="actions">
            <button autoFocus className="secondary" onClick={draft.keepManual}>
              Giữ bấm gửi cho bản nháp
            </button>
            <button className="primary" onClick={draft.approveMode}>
              Bật tự lưu và gửi
            </button>
          </div>
        </ConfirmDialog>
      )}
      {draft.navigation && (
        <ConfirmDialog
          title="Bản nháp chưa lưu"
          busy={saveStatus === "saving"}
          onClose={draft.closeNavigation}
        >
          <p>
            {saveStatus === "saving"
              ? "Đang gửi đơn. Chờ xác nhận trước khi chuyển."
              : saveStatus === "uncertain"
                ? "Chưa nhận được xác nhận. Yêu cầu trước có thể đã lưu; thử lại để kiểm tra trước khi rời."
                : "Có thay đổi chưa lưu. Rời màn hình sẽ bỏ bản nháp này."}
          </p>
          <div className="actions">
            <button
              autoFocus
              className="secondary"
              onClick={draft.closeNavigation}
            >
              Tiếp tục chỉnh
            </button>
            <button
              className="primary"
              disabled={saveBlocked}
              onClick={() => void draft.submit()}
            >
              Lưu rồi kiểm tra
            </button>
            <button
              className="danger"
              disabled={saveStatus === "saving"}
              onClick={draft.leave}
            >
              Bỏ bản nháp và chuyển
            </button>
          </div>
        </ConfirmDialog>
      )}
      <section className="mobile-order-bar" aria-label="Thao tác đơn cơm">
        <button
          className="text-button"
          onClick={() =>
            document
              .getElementById("order-cart")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          <ShoppingBag size={18} />
          <span>
            {cart.reduce((sum, item) => sum + item.quantity, 0)} suất · Xem đơn
            <strong>{vnd(total)}</strong>
          </span>
        </button>
        <button className="primary" disabled={saveBlocked} onClick={saveOrder}>
          {automatic ? cta : busy ? "Đang lưu…" : "Lưu đơn"}
        </button>
      </section>
    </div>
  );
}
