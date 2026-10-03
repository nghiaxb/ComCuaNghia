import type { Order } from "../../shared/contracts";
export type CartItem = { menuItemId: string; quantity: number; note: string };
export type OrderRequest = {
  kind: "order.save" | "order.cancel";
  payload: Record<string, unknown>;
  version: number;
  requestId: string;
};
export type AutosaveState = {
  cart: CartItem[];
  order?: Order;
  dirty: boolean;
  status:
    | "idle"
    | "pending"
    | "saving"
    | "saved"
    | "conflict"
    | "locked"
    | "error"
    | "uncertain";
  message: string;
};
const fromOrder = (o?: Order) =>
  o?.status === "active"
    ? o.items.map(({ menuItemId, quantity, note }) => ({
        menuItemId,
        quantity,
        note,
      }))
    : [];
const key = (cart: CartItem[]) =>
  JSON.stringify(
    cart
      .map((i) => ({ ...i, note: i.note.trim() }))
      .sort((a, b) => a.menuItemId.localeCompare(b.menuItemId)),
  );
export function createOrderAutosave(options: {
  dayId: string;
  memberId: string;
  order?: Order;
  automatic?: boolean;
  enabled?: boolean;
  reason?: string;
  submit: (r: OrderRequest) => Promise<Order>;
  onChange: (s: AutosaveState) => void;
}) {
  let order = options.order,
    remote = order,
    cart = fromOrder(order),
    saved = key(cart),
    automatic = options.automatic ?? true,
    enabled = options.enabled ?? true,
    reason = options.reason ?? "",
    disposed = false,
    timer: ReturnType<typeof setTimeout> | undefined,
    inflight = false,
    uncertain: OrderRequest | undefined;
  let status: AutosaveState["status"] = "idle",
    message = "";
  const dirty = () => key(cart) !== saved;
  const emit = () => {
    if (!disposed)
      options.onChange({
        cart: structuredClone(cart),
        order,
        dirty: dirty() || inflight || !!uncertain,
        status,
        message,
      });
  };
  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const terminal = () =>
    ["conflict", "locked", "error", "uncertain"].includes(status);
  function schedule() {
    clear();
    if (
      disposed ||
      !automatic ||
      !enabled ||
      inflight ||
      terminal() ||
      !dirty()
    )
      return;
    timer = setTimeout(() => void send(), 700);
  }
  function conflict() {
    clear();
    status = "conflict";
    message = "Đơn đã được người khác sửa. Bản nháp của bạn vẫn được giữ.";
    emit();
  }
  async function send(retry?: OrderRequest) {
    clear();
    if (
      disposed ||
      inflight ||
      (!retry && (!enabled || terminal() || !dirty()))
    )
      return;
    const request =
      retry ??
      ({
        kind: cart.length ? "order.save" : "order.cancel",
        payload: cart.length
          ? {
              dayId: options.dayId,
              memberId: options.memberId,
              items: structuredClone(cart),
              ...(reason ? { reason } : {}),
            }
          : { orderId: order?.id, ...(reason ? { reason } : {}) },
        version: order?.version ?? 0,
        requestId: crypto.randomUUID(),
      } as OrderRequest);
    if (!retry && !cart.length && order?.status !== "active") {
      saved = key(cart);
      status = "idle";
      emit();
      return;
    }
    const sent = key((request.payload.items as CartItem[] | undefined) ?? []);
    inflight = true;
    status = "saving";
    message = "";
    emit();
    try {
      const ack = await options.submit(request);
      if (disposed) return;
      order = ack;
      saved = sent;
      uncertain = undefined;
      inflight = false;
      if (
        remote &&
        (remote.version > ack.version ||
          (remote.version === ack.version && key(fromOrder(remote)) !== sent))
      ) {
        conflict();
        return;
      }
      remote = ack;
      status = dirty() ? "pending" : "saved";
      emit();
      schedule();
    } catch (error) {
      if (disposed) return;
      inflight = false;
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      message = error instanceof Error ? error.message : "Không lưu được đơn";
      status =
        code === "CONFLICT"
          ? "conflict"
          : code === "LOCKED"
            ? "locked"
            : code === "VALIDATION" || code === "FORBIDDEN"
              ? "error"
              : "uncertain";
      if (status === "uncertain") uncertain = request;
      else uncertain = undefined;
      emit();
    }
  }
  return {
    edit(next: CartItem[]) {
      if (disposed) return;
      cart = structuredClone(next);
      if (!terminal() && !inflight) status = dirty() ? "pending" : "idle";
      emit();
      schedule();
    },
    acknowledge(next?: Order) {
      if (disposed || !next || next.version <= (order?.version ?? 0)) return;
      remote = next;
      if (inflight) return;
      if (uncertain) {
        status = "uncertain";
        emit();
        return;
      }
      if (dirty()) {
        conflict();
        return;
      }
      order = next;
      cart = fromOrder(next);
      saved = key(cart);
      status = "idle";
      emit();
    },
    configure(config: {
      automatic?: boolean;
      enabled?: boolean;
      reason?: string;
    }) {
      if (config.automatic !== undefined) automatic = config.automatic;
      if (config.enabled !== undefined) enabled = config.enabled;
      if (config.reason !== undefined) reason = config.reason;
      clear();
      schedule();
    },
    submit() {
      return send();
    },
    retry() {
      if (uncertain) return send(uncertain);
    },
    discard(abandonUncertain = false) {
      if (inflight || (uncertain && !abandonUncertain)) return false;
      uncertain = undefined;
      clear();
      order = remote;
      cart = fromOrder(order);
      saved = key(cart);
      status = "idle";
      message = "";
      emit();
      return true;
    },
    getState(): AutosaveState {
      return {
        cart: structuredClone(cart),
        order,
        dirty: dirty() || inflight || !!uncertain,
        status,
        message,
      };
    },
    dispose() {
      disposed = true;
      clear();
    },
  };
}
