import { it, expect, vi, afterEach } from "vitest";
import {
  createOrderAutosave,
  type OrderRequest,
} from "../../src/lib/order-autosave";
const base = {
  id: "order",
  day_id: "day",
  member_id: "me",
  status: "active" as const,
  items: [
    { menuItemId: "food", name: "Meal", unitPrice: 100, quantity: 1, note: "" },
  ],
  version: 1,
};
const cart = (quantity: number) => [{ menuItemId: "food", quantity, note: "" }];
afterEach(() => vi.useRealTimers());
it("debounces the final cart at 700ms and never submits initial/same values", async () => {
  vi.useFakeTimers();
  const submit = vi.fn(async (_r: OrderRequest) => ({ ...base, version: 2 }));
  const c = createOrderAutosave({
    dayId: "day",
    memberId: "me",
    order: base,
    submit,
    onChange: () => {},
  });
  c.edit(cart(1));
  await vi.advanceTimersByTimeAsync(1000);
  expect(submit).not.toHaveBeenCalled();
  c.edit(cart(2));
  await vi.advanceTimersByTimeAsync(699);
  expect(submit).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(submit.mock.calls[0][0].payload.items).toEqual(cart(2));
  c.dispose();
});
it("serializes trailing edits with acknowledged version", async () => {
  vi.useFakeTimers();
  let resolve: any;
  const submit = vi
    .fn()
    .mockImplementationOnce(() => new Promise((r) => (resolve = r)))
    .mockResolvedValue({ ...base, version: 3 });
  const c = createOrderAutosave({
    dayId: "day",
    memberId: "me",
    order: base,
    submit,
    onChange: () => {},
  });
  c.edit(cart(2));
  await vi.advanceTimersByTimeAsync(700);
  c.edit(cart(3));
  await vi.advanceTimersByTimeAsync(700);
  expect(submit).toHaveBeenCalledTimes(1);
  resolve({ ...base, items: [{ ...base.items[0], quantity: 2 }], version: 2 });
  await vi.advanceTimersByTimeAsync(700);
  expect(submit.mock.calls[1][0].version).toBe(2);
  expect(submit.mock.calls[1][0].payload.items).toEqual(cart(3));
});
it("retries uncertain request with same id and payload before newer drafts", async () => {
  vi.useFakeTimers();
  const submit = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("network"))
    .mockResolvedValue({
      ...base,
      items: [{ ...base.items[0], quantity: 2 }],
      version: 2,
    });
  let state: any;
  const c = createOrderAutosave({
    dayId: "day",
    memberId: "me",
    order: base,
    submit,
    onChange: (s) => (state = s),
  });
  c.edit(cart(2));
  await vi.advanceTimersByTimeAsync(700);
  c.edit(cart(3));
  await vi.advanceTimersByTimeAsync(2000);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(state.status).toBe("uncertain");
  c.retry();
  await vi.advanceTimersByTimeAsync(0);
  expect(submit.mock.calls[1][0]).toEqual(submit.mock.calls[0][0]);
});
it("does not adopt conflicting external version or submit automatically", async () => {
  vi.useFakeTimers();
  const submit = vi
    .fn()
    .mockRejectedValue(
      Object.assign(new Error("CONFLICT"), { code: "CONFLICT" }),
    );
  let state: any;
  const c = createOrderAutosave({
    dayId: "day",
    memberId: "me",
    order: base,
    submit,
    onChange: (s) => (state = s),
  });
  c.edit(cart(2));
  await vi.advanceTimersByTimeAsync(700);
  c.acknowledge({ ...base, version: 8 });
  c.edit(cart(3));
  await vi.advanceTimersByTimeAsync(2000);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(state.status).toBe("conflict");
  expect(state.cart).toEqual(cart(3));
  c.discard();
  expect(state.cart).toEqual(cart(1));
});
it("cancels empty active cart, ignores empty new cart and blocks disposed trailing results", async () => {
  vi.useFakeTimers();
  let resolve: any;
  const submit = vi.fn(
    (_r: OrderRequest) => new Promise<any>((r) => (resolve = r)),
  );
  const c = createOrderAutosave({
    dayId: "day",
    memberId: "me",
    order: base,
    submit,
    onChange: () => {},
  });
  c.edit([]);
  await vi.advanceTimersByTimeAsync(700);
  expect(submit.mock.calls[0][0].kind).toBe("order.cancel");
  c.edit(cart(2));
  c.dispose();
  resolve({ ...base, status: "cancelled", version: 2 });
  await vi.advanceTimersByTimeAsync(2000);
  expect(submit).toHaveBeenCalledTimes(1);
  const n = createOrderAutosave({
    dayId: "other",
    memberId: "me",
    submit,
    onChange: () => {},
  });
  n.edit([]);
  await vi.advanceTimersByTimeAsync(700);
  expect(submit).toHaveBeenCalledTimes(1);
});
it("pauses dirty drafts on external updates and accepts clean snapshots", async () => {
  vi.useFakeTimers();
  const submit = vi.fn();
  let state: any;
  const c = createOrderAutosave({
    dayId: "day",
    memberId: "me",
    order: base,
    submit,
    onChange: (s) => (state = s),
  });
  c.acknowledge({ ...base, version: 2 });
  expect(state.order.version).toBe(2);
  c.edit(cart(2));
  c.acknowledge({ ...base, version: 3 });
  await vi.advanceTimersByTimeAsync(1000);
  expect(submit).not.toHaveBeenCalled();
  expect(state.status).toBe("conflict");
});
it("manual and disabled controllers never send until explicitly enabled/submitted", async () => {
  vi.useFakeTimers();
  const submit = vi.fn(async () => ({ ...base, version: 2 }));
  const c = createOrderAutosave({
    dayId: "day",
    memberId: "me",
    order: base,
    automatic: false,
    enabled: false,
    submit,
    onChange: () => {},
  });
  c.edit(cart(2));
  await c.submit();
  await vi.advanceTimersByTimeAsync(1000);
  expect(submit).not.toHaveBeenCalled();
  c.configure({ enabled: true });
  await c.submit();
  expect(submit).toHaveBeenCalledTimes(1);
});
it("keeps uncertain identity retryable after realtime acknowledges a lost response and a newer local edit", async () => {
  vi.useFakeTimers();
  const ack = {
    ...base,
    version: 2,
    items: [{ ...base.items[0], quantity: 2 }],
  };
  let state: any;
  const submit = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("lost response"))
    .mockResolvedValueOnce(ack)
    .mockResolvedValueOnce({
      ...base,
      version: 3,
      items: [{ ...base.items[0], quantity: 3 }],
    });
  const c = createOrderAutosave({
    dayId: "day",
    memberId: "me",
    order: base,
    submit,
    onChange: (s) => (state = s),
  });
  c.edit(cart(2));
  await vi.advanceTimersByTimeAsync(700);
  c.edit(cart(3));
  c.acknowledge(ack);
  expect(state.status).toBe("uncertain");
  await c.retry();
  expect(submit.mock.calls[1][0]).toEqual(submit.mock.calls[0][0]);
  await vi.advanceTimersByTimeAsync(700);
  expect(submit.mock.calls[2][0].version).toBe(2);
  expect(state.status).toBe("saved");
});
it("recognizes server-trimmed own realtime acknowledgement without a false conflict", async () => {
  vi.useFakeTimers();
  let resolve: any, state: any;
  const ack = {
    ...base,
    version: 2,
    items: [{ ...base.items[0], note: "No chili" }],
  };
  const submit = vi.fn(() => new Promise<any>((r) => (resolve = r)));
  const c = createOrderAutosave({
    dayId: "day",
    memberId: "me",
    order: base,
    submit,
    onChange: (s) => (state = s),
  });
  c.edit([{ ...cart(1)[0], note: "No chili " }]);
  await vi.advanceTimersByTimeAsync(700);
  c.acknowledge(ack);
  resolve(ack);
  await vi.advanceTimersByTimeAsync(0);
  expect(state.status).toBe("saved");
  expect(state.dirty).toBe(false);
});
