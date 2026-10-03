import { useDecision } from "./useDecision";
import { NativeSelect } from "../components/ui/native-select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import RecipientPicker from "./RecipientPicker";
import SaveStatus from "./SaveStatus";
import { Sheet, SheetContent, SheetTitle } from "../components/ui/sheet";
import Button from "../components/ui/ActionButton";
import { useOrderDraft } from "./useOrderDraft";
import ConfirmDialog from "./ConfirmDialog";
import { useLocation } from "react-router-dom";
import SharedOrderOverview from "./SharedOrderOverview";
import BillSummary, { dayBill } from "./BillSummary";
import { proxyOrder } from "../lib/api";
import type { Order } from "../../shared/contracts";
import { useEffect, useEffectEvent, useState, useRef } from "react";
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
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 767px)").matches,
  );
  const [cartOpen, setCartOpen] = useState(false);
  useEffect(() => {
    const q = matchMedia("(max-width: 767px)");
    const change = () => setMobile(q.matches);
    q.addEventListener("change", change);
    return () => q.removeEventListener("change", change);
  }, []);
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
  const { confirm, dialog } = useDecision(`${date}:${memberId}`);
  const cartTrigger = useRef<HTMLButtonElement | null>(null);
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
  }, [
    proxy,
    day,
    memberId,
    localOrder,
    readOnly,
    data.shared,
    loadRecipientOrder,
  ]);
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
  // Recipient data is read on a route change; realtime updates must not clear the proxy reason.
  const applyRoute = useEffectEvent((search: string) => {
    const q = new URLSearchParams(search),
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
  });
  useEffect(() => {
    applyRoute(route.search);
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
  const cartContent = (
    <>
      <h2>
        <ShoppingBag size={20} />{" "}
        {proxy ? "Đặt cơm hộ đồng nghiệp" : "Bữa trưa của bạn"}
      </h2>
      <p className="muted">
        {date} · {recipient?.display_name ?? data.member.display_name}
      </p>
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
              {orderedItems.find((f) => f.menuItemId === i.menuItemId)?.name ??
                foods.find((f) => f.id === i.menuItemId)?.name}
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
              <Button
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
              </Button>
              <span>{i.quantity}</span>
              <Button
                aria-label="Tăng"
                disabled={blocked}
                onClick={() => add(i.menuItemId)}
              >
                <Plus size={13} />
              </Button>
            </div>
            <Input
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
        <NativeSelect
          value={automatic ? "autosave" : "manual"}
          disabled={
            busy ||
            readOnly ||
            saveStatus === "saving" ||
            saveStatus === "uncertain"
          }
          onChange={(e) => {
            const mode = e.target.value;
            void (async () => {
              const saveMode = () => {
                if (mode === "autosave") draft.allowAutomatic();
                return mutate(
                  "profile.save",
                  {
                    displayName: data.member.display_name,
                    orderSaveMode: mode,
                  },
                  data.member.version,
                );
              };
              if (mode === "autosave" && draft.state.dirty)
                await confirm("Bật tự lưu và gửi bản nháp hiện tại?", saveMode);
              else await saveMode();
            })();
          }}
        >
          <option value="autosave">Tự lưu</option>
          <option value="manual">Bấm gửi</option>
        </NativeSelect>
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
        <Button className="secondary" onClick={() => void draft.retry()}>
          Thử lưu lại
        </Button>
      )}
      {["conflict", "locked", "error"].includes(saveStatus) && (
        <Button
          className="secondary"
          onClick={() => {
            void confirm("Bỏ bản nháp và tải đơn mới nhất?", () =>
              draft.discard(),
            );
          }}
        >
          Tải đơn mới nhất
        </Button>
      )}
      <div className="cart-total">
        <span>Tạm tính</span>
        <strong>{vnd(total)}</strong>
      </div>
      <Button
        className="primary wide"
        disabled={saveBlocked}
        onClick={saveOrder}
      >
        {cta}
      </Button>
      {currentOrder?.status === "active" && (
        <Button
          className="text-button wide"
          disabled={
            blocked ||
            (proxy && !reason.trim()) ||
            ["saving", "uncertain", "conflict"].includes(saveStatus)
          }
          onClick={() => {
            void confirm("Hủy đơn cơm ngày này?", () => draft.cancel());
          }}
        >
          Hủy đơn
        </Button>
      )}
      <p className="fine">
        Sau mốc dự kiến vẫn được sửa đơn cho đến khi ngày đặt cơm được khóa.
      </p>
    </>
  );
  return (
    <div className="orders-page">
      {dialog}
      <div className="page-title">
        <div>
          <p className="eyebrow">MỖI NGÀY, MỘT BỮA NGON</p>
          <h1>Đặt cơm</h1>
          <p>Chọn món, kiểm tra đơn và đặt hộ đồng nghiệp.</p>
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
          <Button
            key={d.id}
            variant={date === d.date ? "primary" : "secondary"}
            aria-pressed={date === d.date}
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
          </Button>
        ))}
        {!days.length && (
          <Field label="Ngày ăn">
            <Input
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
      <section className="recipient-toolbar mb-5 grid gap-4 rounded-xl border bg-background p-4 md:grid-cols-2">
        <RecipientPicker
          value={memberId}
          recipients={recipients}
          disabled={busy || readOnly}
          onChange={(value) =>
            draft.guard(() => {
              setMemberId(value);
              setReason("");
            })
          }
        />
        {proxy && (
          <>
            <Field label="Lý do đặt hoặc chỉnh hộ">
              <Input
                value={reason}
                maxLength={500}
                disabled={blocked}
                placeholder="Đồng nghiệp nhờ đặt…"
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <p className="fine">
              Ghi nhận bạn là người thao tác, {recipient?.display_name} là người
              nhận cơm. Đơn hiện có sẽ được tải để bạn chỉnh.
            </p>
          </>
        )}
      </section>
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
                      <Button
                        aria-label={"Giảm " + food.name}
                        disabled={blocked || !quantity}
                        onClick={() => decrease(food.id)}
                      >
                        <Minus size={16} />
                      </Button>
                      <output aria-label={"Số lượng " + food.name}>
                        {quantity}
                      </output>
                      <Button
                        aria-label={"Thêm " + food.name}
                        disabled={blocked || quantity >= 100}
                        onClick={() => add(food.id)}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {!mobile && (
          <aside className="cart" id="order-cart">
            {cartContent}
          </aside>
        )}
        {mobile && (
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetContent
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                cartTrigger.current?.focus();
              }}
              side="bottom"
              className="max-h-[90dvh] overflow-y-auto rounded-t-xl p-5"
            >
              <SheetTitle>Chi tiết đơn cơm</SheetTitle>
              <aside className="cart border-0 shadow-none p-0" id="order-cart">
                {cartContent}
              </aside>
            </SheetContent>
          </Sheet>
        )}
      </div>
      {day && (
        <Tabs defaultValue="people" className="mt-6">
          <TabsList className="mb-3 min-h-11">
            <TabsTrigger value="people" className="min-h-11">
              Đơn mọi người
            </TabsTrigger>
            <TabsTrigger value="bill" className="min-h-11">
              Bill & chia tiền
            </TabsTrigger>
          </TabsList>
          <TabsContent value="people">
            <SharedOrderOverview data={data} dayId={day.id} compact />
          </TabsContent>
          <TabsContent value="bill">
            <BillSummary bill={dayBill(data, day.id)} />
          </TabsContent>
        </Tabs>
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
            <Button autoFocus className="secondary" onClick={draft.keepManual}>
              Giữ bấm gửi cho bản nháp
            </Button>
            <Button className="primary" onClick={draft.approveMode}>
              Bật tự lưu và gửi
            </Button>
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
            <Button
              autoFocus
              className="secondary"
              onClick={draft.closeNavigation}
            >
              Tiếp tục chỉnh
            </Button>
            <Button
              className="primary"
              disabled={saveBlocked}
              onClick={() => void draft.submit()}
            >
              Lưu rồi kiểm tra
            </Button>
            <Button
              className="danger"
              disabled={saveStatus === "saving"}
              onClick={draft.leave}
            >
              Bỏ bản nháp và chuyển
            </Button>
          </div>
        </ConfirmDialog>
      )}
      <section className="mobile-order-bar" aria-label="Thao tác đơn cơm">
        <div className="col-span-2">
          <SaveStatus
            text={statusText}
            status={saveStatus}
            dirty={draft.state.dirty}
            onRetry={() => void draft.retry()}
            retryDisabled={blocked}
          />
        </div>
        <Button
          className="text-button"
          ref={cartTrigger}
          onClick={() => setCartOpen(true)}
        >
          <ShoppingBag size={18} />
          <span>
            {cart.reduce((sum, item) => sum + item.quantity, 0)} suất · Xem đơn
            <strong>{vnd(total)}</strong>
          </span>
        </Button>
        <Button className="primary" disabled={saveBlocked} onClick={saveOrder}>
          {automatic ? cta : busy ? "Đang lưu…" : "Lưu đơn"}
        </Button>
      </section>
    </div>
  );
}
