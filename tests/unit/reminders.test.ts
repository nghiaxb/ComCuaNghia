import { it, expect } from "vitest";
import { reminderDue, afterCutoff } from "../../shared/time";
it("never reminds for Monday", () =>
  expect(reminderDue("2026-10-04T09:45:00Z", "2026-10-05", "16:45")).toBe(
    false,
  ));
it("reminds Tuesday at Vietnam 16:45 Monday", () =>
  expect(reminderDue("2026-10-05T09:45:00Z", "2026-10-06", "16:45")).toBe(
    true,
  ));
it("does not send stale reminders", () =>
  expect(reminderDue("2026-10-05T10:01:00Z", "2026-10-06", "16:45")).toBe(
    false,
  ));
it("labels after cutoff without locking", () =>
  expect(afterCutoff("2026-10-05T10:01:00Z", "2026-10-06", "17:00")).toBe(
    true,
  ));
