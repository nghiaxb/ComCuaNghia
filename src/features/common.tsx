import { Leaf } from "lucide-react";
import type { Snapshot } from "../../shared/contracts";
import type { Order } from "../../shared/contracts";
import type { OrderRequest } from "../lib/order-autosave";
export type PageProps = {
  commitOrder?: (request: OrderRequest) => Promise<Order>;
  connected?: boolean;
  routeBlocking?: boolean;
  data: Snapshot;
  mutate: (
    kind: string,
    payload: Record<string, unknown>,
    version?: number,
  ) => Promise<Record<string, unknown> | null>;
  busy: boolean;
  readOnly: boolean;
};
export const vnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    n,
  );
export function Empty({
  text = "Chưa có dữ liệu cho ngày này.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <span>
        <Leaf size={38} />
      </span>
      <h3>Mọi thứ còn đang trống</h3>
      <p>{text}</p>
    </div>
  );
}
export function Person({ name }: { name: string }) {
  return (
    <span className="person">
      <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
      {name}
    </span>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
