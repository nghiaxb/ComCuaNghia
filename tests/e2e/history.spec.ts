import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
});
test("employee can access an arbitrary older week and stored retired menu items", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/history.html");
  await page
    .getByLabel("Tuần đặt cơm", { exact: true })
    .selectOption("2026-08-03");
  await expect(
    page.getByText("Stored retired meal", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".cart").getByText("Original menu name", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lưu thay đổi" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Thêm Stored retired meal" }),
  ).toHaveCount(0);
  await expect(page.locator(".cart-total")).toContainText("85.000");
  await page
    .getByLabel("Tuần đặt cơm", { exact: true })
    .selectOption("2026-10-05");
  await expect(
    page.getByText("Stored retired meal", { exact: true }),
  ).toHaveCount(0);
});
test("manual lock and settled week protect historical carts", async ({
  page,
}) => {
  for (const protection of ["locked", "settled"]) {
    await page.goto(`/tests/fixtures/history.html?${protection}`);
    await page
      .getByLabel("Tuần đặt cơm", { exact: true })
      .selectOption("2026-08-03");
    await expect(
      page.getByRole("button", { name: "Lưu thay đổi" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Tăng", exact: true }).first(),
    ).toBeDisabled();
  }
});
test("finance history scopes entries and meals to week while total debt stays global and private", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/history.html?finance");
  await page
    .getByLabel("Tuần công nợ", { exact: true })
    .selectOption("2026-08-03");
  await expect(page.getByText("Old week debt", { exact: true })).toBeVisible();
  await expect(page.getByText("New week debt", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Secret debt", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Private colleague", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Stored retired meal ×2", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".stats article").first()).toContainText("95.000");
  await expect(page.locator(".stats article").first()).toContainText(
    "tất cả các tuần",
  );
});
test("administrator switches aggregate history by week", async ({ page }) => {
  await page.goto("/tests/fixtures/history.html?summary&admin");
  await page
    .getByLabel("Tuần tổng hợp", { exact: true })
    .selectOption("2026-08-03");
  await expect(
    page.getByRole("cell", { name: "Stored retired meal", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Tuần tổng hợp", { exact: true })
    .selectOption("2026-10-05");
  await expect(
    page.getByRole("cell", { name: "Stored retired meal", exact: true }),
  ).toHaveCount(0);
});

test("administrator sees totals for every day of selected week", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/history.html?summary&admin&weekAggregate");
  await page
    .getByLabel("Tuần tổng hợp", { exact: true })
    .selectOption("2026-08-03");
  await expect(page.getByLabel("Tổng hợp cả tuần")).toContainText("6 suất");
  await expect(page.getByLabel("Tổng hợp cả tuần")).toContainText("170.000");
});
test("cancelled historical order retains its stored details", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/history.html?cancelled");
  await page
    .getByLabel("Tuần đặt cơm", { exact: true })
    .selectOption("2026-08-03");
  await expect(page.getByRole("region", { name: "Đơn đã hủy" })).toContainText(
    "Stored retired meal",
  );
  await expect(page.getByRole("region", { name: "Đơn đã hủy" })).toContainText(
    "85.000",
  );
});
test("ordering again after cancellation uses the current menu name and price", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/history.html?cancelled");
  await page
    .getByLabel("Tuần đặt cơm", { exact: true })
    .selectOption("2026-08-03");
  await page.getByRole("button", { name: "Thêm New menu name" }).click();
  await expect(page.locator(".cart-total")).toContainText("99.000");
  await expect(
    page.locator(".cart").getByText("New menu name", { exact: true }),
  ).toBeVisible();
});
