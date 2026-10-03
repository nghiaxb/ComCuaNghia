import { test, expect } from "@playwright/test";
test("honest setup screen on desktop and mobile", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/order");
    await expect(page.getByText("Kết nối hệ thống")).toBeVisible();
    if (width < 768)
      await page.getByRole("button", { name: "Mở điều hướng" }).click();
    await expect(page.getByRole("link", { name: "Cài đặt" })).toBeVisible();
    if (width < 768) await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("all six preview screens render without overflow on mobile and desktop", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/order");
    await page
      .getByRole("button", { name: "Xem trước giao diện với dữ liệu mẫu →" })
      .click();
    for (const name of [
      "Đặt cơm",
      "Quản lý menu",
      "Tổng hợp đơn",
      "Công nợ",
      "Nhật ký",
      "Cài đặt",
    ]) {
      if (width < 768)
        await page.getByRole("button", { name: "Mở điều hướng" }).click();
      await page.getByRole("link", { name, exact: true }).click();
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    if (width < 768)
      await page.getByRole("button", { name: "Mở điều hướng" }).click();
    await page.getByRole("link", { name: "Đặt cơm", exact: true }).click();
    await page
      .getByRole("button", { name: "Tuần hiện tại", exact: true })
      .click();
    await page.screenshot({
      path: `test-results/preview-${width}.png`,
      fullPage: true,
    });
  }
});
