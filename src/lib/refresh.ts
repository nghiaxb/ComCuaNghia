/** Batch row notifications and serialize snapshot reads, including manual refreshes. */
export function createRefresh<T>(
  fetchValue: () => Promise<T>,
  apply: (value: T) => void,
  onError: (error: unknown) => void,
  onBusy: (busy: boolean) => void,
) {
  let disposed = false;
  let pending = false;
  let running: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function refresh(): Promise<void> {
    if (disposed) return Promise.resolve();
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pending = true;
    if (running) return running;
    onBusy(true);
    running = (async () => {
      while (pending && !disposed) {
        pending = false;
        try {
          const value = await fetchValue();
          if (!disposed) apply(value);
        } catch (error) {
          if (!disposed) onError(error);
        }
      }
    })().finally(() => {
      running = null;
      // An event can land between the drain finishing and this microtask.
      if (pending && !disposed) return refresh();
      if (!disposed) onBusy(false);
    });
    return running;
  }

  function invalidate() {
    if (disposed) return;
    // A fixed window avoids starving refreshes during continuous activity.
    if (timer === null)
      timer = setTimeout(() => {
        timer = null;
        void refresh();
      }, 300);
  }

  function dispose() {
    disposed = true;
    pending = false;
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }
  return { refresh, invalidate, dispose };
}
