import { z } from "zod";
export const uuid = z.string().uuid();
export const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Ngày không hợp lệ",
  );
export const money = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const orderSchema = z.object({
  dayId: uuid,
  memberId: uuid,
  items: z
    .array(
      z.object({
        menuItemId: uuid,
        quantity: z.number().int().min(1).max(100),
        note: z.string().trim().max(500),
      }),
    )
    .min(1)
    .max(30),
});
export const validateOrderInput = (value: unknown) =>
  orderSchema.safeParse(value);
export type OrderInput = z.infer<typeof orderSchema>;
export type Member = {
  order_save_mode?: "autosave" | "manual";
  id: string;
  email: string;
  display_name: string;
  role: "employee" | "coordinator" | "admin";
  active: boolean;
  can_manage_finance: boolean;
  version: number;
};
export type Day = {
  id: string;
  date: string;
  locked: boolean;
  version: number;
};
export type Food = {
  id: string;
  day_id: string;
  name: string;
  unit_price: number;
  active: boolean;
};
export type Order = {
  id: string;
  day_id: string;
  member_id: string;
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    note: string;
    unitPrice: number;
  }[];
  status: string;
  version: number;
};
export type Event = {
  id: string;
  actor_id: string;
  subject_id: string | null;
  kind: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  created_at: string;
  after_cutoff: boolean;
};
export type Entry = {
  id: string;
  member_id: string;
  amount: number;
  kind: string;
  note: string;
  created_at: string;
  week_start: string | null;
};
export type Payment = {
  id: string;
  member_id: string;
  amount: number;
  reference: string;
  status: string;
  version: number;
};
export type Settings = {
  cutoffTime: string;
  reminderTime: string;
  holidays: string[];
  defaultPrice: number;
  collectorId: string | null;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  chatEnabled: boolean;
};
export type OrderActor = {
  orderId: string;
  actorId: string | null;
  actorName: string | null;
  updatedAt: string;
  kind: string;
};
export type Snapshot = {
  shared?: {
    roster: { id: string; display_name: string; active: boolean }[];
    actors: OrderActor[];
    bills: BillPreview[];
  };
  settledWeeks?: string[];
  recipients?: { id: string; display_name: string }[];
  drafts: {
    id: string;
    week_start: string;
    days: {
      date: string;
      sourceVersion?: number;
      foods: { id?: string; name: string; unitPrice: number }[];
    }[];
    version: number;
  }[];
  member: Member;
  members: Member[];
  days: Day[];
  foods: Food[];
  orders: Order[];
  events: Event[];
  entries: Entry[];
  payments: Payment[];
  settings: { version: number; data: Settings };
  destinations: { id: string; name: string; active: boolean }[];
  deliveries: {
    id: string;
    kind: string;
    status: string;
    attempts: number;
    last_error: string | null;
  }[];
};
export type Command = {
  requestId: string;
  expectedVersion: number;
  payload: Record<string, unknown>;
};
export const commandSchema = z.object({
  requestId: uuid,
  expectedVersion: z.number().int().min(0),
  payload: z.record(z.string(), z.unknown()),
});

export type BillConfig = {
  dayId: string;
  discountKind: "none" | "fixed" | "percent";
  discountValue: number;
  fee: number;
  covered: string[];
  sponsors: string[];
  version: number;
};
export type BillPreview = BillConfig & {
  state: "preview" | "settled" | "legacy";
  original: number;
  discount: number | null;
  total: number | null;
  shares: { memberId: string; amount: number }[];
  warnings: string[];
};
