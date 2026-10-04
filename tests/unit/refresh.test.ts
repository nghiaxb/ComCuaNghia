import { afterEach, describe, expect, it, vi } from "vitest";
import { createRefresh } from "../../src/lib/refresh";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
afterEach(() => vi.useRealTimers());
describe("snapshot refresh", () => {
  it("coalesces a menu publication burst into one fetch", async () => {
    vi.useFakeTimers();
    let requests = 0;
    const values: number[] = [];
    const refresh = createRefresh(
      async () => ++requests,
      (v) => values.push(v),
      () => {},
      () => {},
    );
    for (let i = 0; i < 60; i++) refresh.invalidate();
    expect(requests).toBe(0);
    await vi.advanceTimersByTimeAsync(300);
    expect(requests).toBe(1);
    expect(values).toEqual([1]);
    refresh.dispose();
  });
  it("batches spaced menu events even when an initial read is in flight", async () => {
    vi.useFakeTimers();
    let requests = 0;
    const values: number[] = [];
    const refresh = createRefresh(
      async () => {
        const value = ++requests;
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        return value;
      },
      (value) => values.push(value),
      () => {},
      () => {},
    );
    const initial = refresh.refresh();
    for (let i = 0; i < 20; i++) {
      await vi.advanceTimersByTimeAsync(10);
      refresh.invalidate();
    }
    expect(requests).toBe(1);
    await vi.advanceTimersByTimeAsync(160);
    await initial;
    expect(values).toEqual([1, 2]);
    refresh.dispose();
  });
  it("serializes refreshes and waits for the trailing fetch after changes during a slow fetch", async () => {
    vi.useFakeTimers();
    const first = deferred<number>(),
      second = deferred<number>();
    let requests = 0;
    const values: number[] = [];
    const refresh = createRefresh(
      () => (++requests === 1 ? first.promise : second.promise),
      (v) => values.push(v),
      () => {},
      () => {},
    );
    const initial = refresh.refresh();
    for (let i = 0; i < 60; i++) refresh.invalidate();
    await vi.advanceTimersByTimeAsync(300);
    let saved = false;
    const afterSave = refresh.refresh().then(() => {
      saved = true;
    });
    expect(requests).toBe(1);
    first.resolve(1);
    await flush();
    expect(requests).toBe(2);
    expect(saved).toBe(false);
    second.resolve(2);
    await Promise.all([initial, afterSave]);
    expect(values).toEqual([1, 2]);
    expect(saved).toBe(true);
    refresh.dispose();
  });
  it("discards a response and pending refreshes after logout/unmount", async () => {
    vi.useFakeTimers();
    const response = deferred<number>();
    const values: number[] = [];
    let requests = 0;
    const refresh = createRefresh(
      () => {
        requests++;
        return response.promise;
      },
      (v) => values.push(v),
      () => {},
      () => {},
    );
    const running = refresh.refresh();
    refresh.invalidate();
    refresh.dispose();
    response.resolve(1);
    await running;
    await vi.advanceTimersByTimeAsync(1000);
    expect(values).toEqual([]);
    expect(requests).toBe(1);
  });
  it("does not lose an invalidation queued just as a response completes", async () => {
    let requests = 0;
    const values: number[] = [];
    const refresh = createRefresh(
      async () => ++requests,
      (value) => {
        values.push(value);
        if (value === 1)
          queueMicrotask(() => {
            void refresh.refresh();
          });
      },
      () => {},
      () => {},
    );
    await refresh.refresh();
    expect(values).toEqual([1, 2]);
    refresh.dispose();
  });
  it("can refresh again after a failure without automatic retry storms", async () => {
    let requests = 0;
    const values: number[] = [],
      errors: unknown[] = [];
    const refresh = createRefresh(
      async () => {
        if (++requests === 1) throw new Error("offline");
        return requests;
      },
      (v) => values.push(v),
      (e) => errors.push(e),
      () => {},
    );
    await refresh.refresh();
    expect(errors).toHaveLength(1);
    await refresh.refresh();
    expect(values).toEqual([2]);
    refresh.dispose();
  });
});
