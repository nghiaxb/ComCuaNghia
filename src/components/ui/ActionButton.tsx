import type { ComponentProps } from "react";
import { Button as BaseButton } from "./button";
export default function Button({
  type = "button",
  variant,
  className = "",
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "danger" | "text";
}) {
  const resolved =
    variant ??
    (className.includes("danger")
      ? "danger"
      : className.includes("secondary")
        ? "secondary"
        : className.includes("text-button")
          ? "text"
          : "primary");
  return (
    <BaseButton
      type={type}
      variant={
        resolved === "danger"
          ? "destructive"
          : resolved === "secondary"
            ? "outline"
            : resolved === "text"
              ? "ghost"
              : "default"
      }
      className={className}
      {...props}
    />
  );
}
