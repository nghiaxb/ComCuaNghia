import type { ComponentProps } from "react";
import Dialog from "../components/ui/Modal";
export default function ConfirmDialog({
  title = "Xác nhận xoá menu",
  ...props
}: Omit<ComponentProps<typeof Dialog>, "title"> & { title?: string }) {
  return <Dialog title={title} {...props} />;
}
