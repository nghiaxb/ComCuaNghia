import type { ButtonHTMLAttributes } from "react";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "text";
};
const variants = {
  primary: "primary",
  secondary: "secondary",
  danger: "primary danger",
  text: "text-button",
};
export default function Button({
  type = "button",
  variant,
  className,
  ...props
}: Props) {
  return (
    <button
      {...props}
      type={type}
      className={[variant && variants[variant], className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
