import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Order } from "../../shared/contracts";
import {
  createOrderAutosave,
  type AutosaveState,
  type CartItem,
  type OrderRequest,
} from "../lib/order-autosave";
export function requestOrderNavigation(action: () => void) {
  const event = new CustomEvent("order-navigation-request", {
    cancelable: true,
    detail: action,
  });
  if (window.dispatchEvent(event)) action();
}
export function useOrderDraft(options: {
  routeBlocking?: boolean;
  dayId: string;
  memberId: string;
  order?: Order;
  automatic: boolean;
  enabled: boolean;
  reason: string;
  submit: (r: OrderRequest) => Promise<Order>;
}) {
  const subject = options.dayId + ":" + options.memberId;
  const submitRef = useRef(options.submit);
  submitRef.current = options.submit;
  const controller = useRef<ReturnType<typeof createOrderAutosave> | undefined>(
    undefined,
  );
  const [stored, setStored] = useState<{
    subject: string;
    state: AutosaveState;
  }>();
  const [navigation, setNavigation] = useState<(() => void) | null>(null);
  const bypass = useRef(false);
  const [automatic, setAutomatic] = useState(options.automatic);
  const [modeConsent, setModeConsent] = useState(false);
  const approvedMode = useRef(false);
  // A subject change starts a fresh controller. Realtime acknowledgements and configuration
  // updates below must preserve its in-flight request and unsaved cart.
  const initialize = useEffectEvent(() => options);
  useEffect(() => {
    const initial = initialize();
    const c = createOrderAutosave({
      ...initial,
      submit: (r) => submitRef.current(r),
      onChange: (state) => setStored({ subject, state }),
    });
    controller.current = c;
    setAutomatic(initial.automatic);
    setModeConsent(false);
    setStored({ subject, state: c.getState() });
    return () => {
      c.dispose();
      if (controller.current === c) controller.current = undefined;
    };
  }, [subject]);
  useEffect(
    () => controller.current?.acknowledge(options.order),
    [subject, options.order],
  );
  const currentAutomatic = useEffectEvent(() => automatic);
  useEffect(() => {
    if (
      options.automatic &&
      !currentAutomatic() &&
      controller.current?.getState().dirty &&
      !approvedMode.current
    ) {
      setModeConsent(true);
      return;
    }
    approvedMode.current = false;
    setAutomatic(options.automatic);
    setModeConsent(false);
  }, [subject, options.automatic]);
  useEffect(() => {
    controller.current?.configure({
      automatic,
      enabled: options.enabled,
      reason: options.reason,
    });
  }, [subject, automatic, options.enabled, options.reason]);
  const state =
    stored?.subject === subject
      ? stored.state
      : {
          cart:
            options.order?.status === "active"
              ? options.order.items.map(({ menuItemId, quantity, note }) => ({
                  menuItemId,
                  quantity,
                  note,
                }))
              : [],
          order: options.order,
          dirty: false,
          status: "idle" as const,
          message: "",
        };
  useEffect(() => {
    if (!state.dirty && options.automatic && !automatic) {
      setAutomatic(true);
      setModeConsent(false);
    }
  }, [state.dirty, options.automatic, automatic]);
  const guard = (action: () => void) => {
    if (controller.current?.getState().dirty) setNavigation(() => action);
    else action();
  };
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (controller.current?.getState().dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const navigate = (e: Event) => {
      if (controller.current?.getState().dirty) {
        e.preventDefault();
        setNavigation(() => (e as CustomEvent<() => void>).detail);
      }
    };
    const check = (e: Event) => {
      if (controller.current?.getState().dirty) e.preventDefault();
    };
    const click = (e: MouseEvent) => {
      if (bypass.current) {
        bypass.current = false;
        return;
      }
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
        return;
      const anchor = (e.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (options.routeBlocking && anchor?.origin === location.origin) return;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.href === location.href ||
        !controller.current?.getState().dirty
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      setNavigation(() => () => {
        bypass.current = true;
        anchor.click();
      });
    };
    window.addEventListener("order-navigation-check", check);
    window.addEventListener("beforeunload", unload);
    window.addEventListener("order-navigation-request", navigate);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("order-navigation-check", check);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("order-navigation-request", navigate);
      document.removeEventListener("click", click, true);
    };
  }, [options.routeBlocking]);
  return {
    state,
    automatic,
    modeConsent,
    allowAutomatic: () => {
      approvedMode.current = true;
    },
    approveMode: () => {
      setModeConsent(false);
      setAutomatic(true);
    },
    keepManual: () => setModeConsent(false),
    setCart: (next: CartItem[] | ((old: CartItem[]) => CartItem[])) => {
      const c = controller.current;
      if (c)
        c.edit(typeof next === "function" ? next(c.getState().cart) : next);
    },
    submit: () => controller.current?.submit(),
    retry: () => controller.current?.retry(),
    discard: () => controller.current?.discard(),
    guard,
    navigation,
    closeNavigation: () => {
      setNavigation(null);
      window.dispatchEvent(new Event("order-navigation-cancel"));
    },
    leave: () => {
      if (state.status === "saving") return;
      controller.current?.discard(true);
      setNavigation(null);
      navigation?.();
    },
    cancel: () => {
      const c = controller.current;
      if (
        !c ||
        ["saving", "uncertain", "conflict"].includes(c.getState().status)
      )
        return;
      c.edit([]);
      return c.submit();
    },
  };
}
