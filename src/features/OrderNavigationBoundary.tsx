import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { requestOrderNavigation } from "./useOrderDraft";
export default function OrderNavigationBoundary() {
  const blocker = useBlocker(
    () =>
      !window.dispatchEvent(
        new Event("order-navigation-check", { cancelable: true }),
      ),
  );
  useEffect(() => {
    if (blocker.state === "blocked")
      requestOrderNavigation(() => blocker.proceed());
  }, [blocker]);
  useEffect(() => {
    const cancel = () => {
      if (blocker.state === "blocked") blocker.reset();
    };
    window.addEventListener("order-navigation-cancel", cancel);
    return () => window.removeEventListener("order-navigation-cancel", cancel);
  }, [blocker]);
  return null;
}
