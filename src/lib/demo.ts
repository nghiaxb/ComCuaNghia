import type { Snapshot } from "../../shared/contracts";
import { weekStart, vietnamDate, addDays } from "../../shared/time";
const member = {
  id: "demo-member",
  email: "demo@rivercrane.vn",
  display_name: "Người dùng mẫu",
  role: "admin" as const,
  active: true,
  can_manage_finance: true,
  version: 1,
};
const week = weekStart(vietnamDate());
export const demo: Snapshot = {
  drafts: [],
  member,
  members: [member],
  days: Array.from({ length: 5 }, (_, i) => ({
    id: "day" + i,
    date: addDays(week, i),
    locked: false,
    version: 1,
  })),
  foods: Array.from({ length: 5 }, (_, d) =>
    [
      "Cơm gà nướng mật ong",
      "Cá kho tộ & rau luộc",
      "Bún thịt nướng",
      "Đậu hũ sốt nấm",
    ].map((name, i) => ({
      id: `food${d}-${i}`,
      day_id: "day" + d,
      name,
      unit_price: 35000,
      active: true,
    })),
  ).flat(),
  orders: [],
  events: [],
  entries: [],
  payments: [],
  settings: {
    version: 1,
    data: {
      cutoffTime: "17:00",
      reminderTime: "16:45",
      holidays: [],
      defaultPrice: 35000,
      collectorId: null,
      bankCode: "",
      accountNumber: "",
      accountName: "",
      chatEnabled: true,
    },
  },
  destinations: [],
  deliveries: [],
};
