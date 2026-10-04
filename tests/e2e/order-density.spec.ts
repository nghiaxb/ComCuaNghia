import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
});

test("week controls stay together on desktop and fit mobile", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/tests/fixtures/autosave.html?manual");
    const picker = page.locator(".week-picker");
    const box = (await picker.boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(Math.min(width, 600));
    for (const name of ["Tuần trước", "Tuần hiện tại", "Tuần kế tiếp"]) {
      const control = picker.getByRole("button", { name, exact: true });
      const bounds = (await control.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    }
    await expect(
      page.getByLabel("Tuần đặt cơm", { exact: true }),
    ).toBeVisible();
  }
});

test("personal settings own the save mode on desktop and mobile", async ({
  page,
}) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/tests/fixtures/autosave.html?manual");
    if (width < 768)
      await page
        .getByRole("region", { name: "Thao tác đơn cơm" })
        .getByRole("button", { name: /Xem đơn/ })
        .click();
    await expect(page.getByLabel("Cách lưu đơn")).toHaveCount(0);
    await expect(
      page.getByRole("status", { name: "Trạng thái lưu đơn" }),
    ).toContainText("Bấm gửi");
    await page.goto("/tests/fixtures/autosave.html?settings");
    await expect(page.getByLabel("Cách lưu đơn")).toBeVisible();
  }
});

test("menu and two-item cart save action fit the desktop viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/tests/fixtures/autosave.html?manual&shell");
  const add = page
    .getByRole("list", { name: "Danh sách món" })
    .getByRole("button", { name: /Thêm/ });
  await add.nth(0).click();
  await add.nth(1).click();
  await expect(page.getByLabel("Ghi chú món")).toHaveCount(2);
  await page.evaluate(() => window.scrollTo(0, 0));
  const action = (await page
    .locator(".cart")
    .getByRole("button", {
      name: "Đặt bữa trưa",
      exact: true,
    })
    .boundingBox())!;
  expect(action.y + action.height).toBeLessThanOrEqual(800);
  const menu = (await page
    .getByRole("list", { name: "Danh sách món" })
    .boundingBox())!;
  expect(menu.y + menu.height).toBeLessThanOrEqual(800);
});

test("empty week keeps the mobile date input readable", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/tests/fixtures/autosave.html?manual");
    await page.getByRole("button", { name: "Tuần kế tiếp" }).click();
    const date = page.getByLabel("Ngày ăn");
    await expect(date).toBeVisible();
    expect((await date.boundingBox())!.width).toBeGreaterThanOrEqual(200);
  }
});

test("authenticated mobile header keeps refresh inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/tests/fixtures/autosave.html?manual&shell");
  const refresh = (await page
    .getByRole("button", { name: "Tải lại dữ liệu" })
    .boundingBox())!;
  expect(refresh.x + refresh.width).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});
