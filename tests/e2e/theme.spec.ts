import { test, expect } from "@playwright/test";

test("first paint follows the device even before React loads", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.route("**/src/main.tsx", (route) => route.abort());
  await page.goto("/order");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.evaluate(() =>
    localStorage.setItem("com-cua-nghia:theme", "light"),
  );
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await page.evaluate(() =>
    localStorage.setItem("com-cua-nghia:theme", "unknown"),
  );
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("theme defaults to system, remembers override and follows system again", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/order");
  const trigger = page.getByRole("button", { name: "Đổi giao diện" });
  const bounds = await trigger.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(44);
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  await trigger.click();
  const menu = page.getByRole("dialog", { name: "Chọn giao diện" });
  await expect(
    menu.getByRole("button", { name: "Theo thiết bị", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await menu.getByRole("button", { name: "Sáng", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("body")).toHaveCSS("color", "rgb(32, 53, 43)");
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Đổi giao diện" }).click();
  await page
    .getByRole("dialog", { name: "Chọn giao diện" })
    .getByRole("button", { name: "Theo thiết bị", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("theme applies immediately in personal settings and preserves an order draft", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html?settings");
  await page.getByLabel("Giao diện", { exact: true }).selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByLabel("Yêu cầu")).toBeEmpty();
  await page.goto("/tests/fixtures/autosave.html?manual&shell");
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.reload();
  await page
    .getByRole("list", { name: "Danh sách món" })
    .getByRole("button", { name: /Thêm/ })
    .first()
    .click();
  await page.getByLabel("Ghi chú món").fill("Giữ nháp khi đổi giao diện");
  await page.getByRole("button", { name: "Đổi giao diện" }).click();
  await page
    .getByRole("dialog", { name: "Chọn giao diện" })
    .getByRole("button", { name: "Sáng", exact: true })
    .click();
  await expect(page.getByLabel("Ghi chú món")).toHaveValue(
    "Giữ nháp khi đổi giao diện",
  );
  await expect(page.getByLabel("Số lần ghi")).toHaveText("0");
});

test("theme preference synchronizes tabs and remains usable without storage", async ({
  page,
  context,
}) => {
  await page.goto("/order");
  const other = await context.newPage();
  await other.goto("/order");
  await page.getByRole("button", { name: "Đổi giao diện" }).click();
  await page
    .getByRole("dialog", { name: "Chọn giao diện" })
    .getByRole("button", { name: "Tối", exact: true })
    .click();
  await expect(other.locator("html")).toHaveClass(/dark/);
  await other.close();
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await page.getByRole("button", { name: "Đổi giao diện" }).click();
  await page
    .getByRole("dialog", { name: "Chọn giao diện" })
    .getByRole("button", { name: "Tối", exact: true })
    .click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
