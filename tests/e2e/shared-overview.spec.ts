import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.goto("/tests/fixtures/shared.html");
});
test("employee sees roster, proxy actor, statuses and live bill without finance controls", async ({
  page,
}) => {
  const roster = page.getByRole("region", { name: "Đơn của mọi người" });
  await expect(roster).toContainText("Lan");
  await expect(roster).toContainText("Chưa đặt");
  await expect(roster).toContainText("Đã huỷ");
  await expect(roster).toContainText("Nghĩa");
  await expect(roster).toContainText("Ít cơm");
  await expect(
    page.getByRole("button", { name: "Khóa ngày đặt cơm" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Lưu bill" })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Bill trong ngày" }),
  ).toContainText("64.000");
  await page.getByRole("button", { name: "Cập nhật từ đồng nghiệp" }).click();
  await expect(
    page.getByRole("region", { name: "Bill trong ngày" }),
  ).toContainText("95.500");
  await page.getByLabel("Tìm người đặt").fill("Lan");
  await expect(roster.getByRole("row")).toHaveCount(2);
  await expect(
    roster.getByRole("link", { name: "Đặt/chỉnh hộ Lan" }),
  ).toHaveAttribute("href", /date=2026-10-05.*member=friend/);
  await page.screenshot({ path: "test-results/shared-overview.png" });
});
test("mobile shared overview does not overflow page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("region", { name: "Đơn của mọi người" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
