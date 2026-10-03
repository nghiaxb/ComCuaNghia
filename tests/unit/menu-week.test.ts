import { expect, it } from "vitest";
import * as time from "../../shared/time";

it("defaults to next Monday when Vietnam reaches Saturday", () => {
  expect(time.defaultMenuWeek(new Date("2026-10-02T17:00:00Z"))).toBe(
    "2026-10-05",
  );
});
it("defaults to next Monday on Vietnam Sunday", () => {
  expect(time.defaultMenuWeek(new Date("2026-10-04T10:00:00Z"))).toBe(
    "2026-10-05",
  );
});
it("retains the current week on Vietnam Friday", () => {
  expect(time.defaultMenuWeek(new Date("2026-10-02T16:59:59Z"))).toBe(
    "2026-09-28",
  );
});
it("labels Monday through Friday across a year boundary", () => {
  expect(time.weekLabel("2026-12-28")).toBe("28/12/2026 – 01/01/2027");
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import Menus from "../../src/features/Menus";
import { demo } from "../../src/lib/demo";
it("renders the selected menu week as a labeled selector with adjacent navigation", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-03T10:00:00Z"));
  try {
    const html = renderToStaticMarkup(
      createElement(Menus, {
        data: demo,
        busy: false,
        readOnly: false,
        mutate: async () => ({}),
      }),
    );
    expect(html).toContain("<select");
    expect(html).toContain("Tuần kế tiếp");
    expect(html).toContain("05/10/2026 – 09/10/2026");
  } finally {
    vi.useRealTimers();
  }
});
