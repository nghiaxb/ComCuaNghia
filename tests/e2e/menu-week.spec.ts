import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-03T10:00:00Z") });
  await page.goto("/tests/fixtures/menu-week.html");
});
test("weekend menu targets next Monday and navigates history with visible interval", async ({
  page,
}) => {
  await expect(page.getByLabel("Tuần menu", { exact: true })).toHaveValue(
    "2026-10-05",
  );
  await expect(
    page.getByText("05/10/2026 – 09/10/2026", { exact: true }).last(),
  ).toBeVisible();
  await page
    .getByLabel("Tuần menu", { exact: true })
    .selectOption("2026-09-21");
  await expect(page.getByLabel("Tuần menu", { exact: true })).toHaveValue(
    "2026-09-21",
  );
  await page.getByRole("button", { name: "Tuần kế tiếp" }).click();
  await expect(page.getByLabel("Tuần menu", { exact: true })).toHaveValue(
    "2026-09-28",
  );
  await page
    .getByRole("button", { name: "Tuần hiện tại", exact: true })
    .click();
  await expect(page.getByLabel("Tuần menu", { exact: true })).toHaveValue(
    "2026-09-28",
  );
});
test("menu edits preserve ids and source version after saving and reopening", async ({
  page,
}) => {
  await page
    .getByLabel("Tuần menu", { exact: true })
    .selectOption("2026-09-28");
  await page.getByRole("button", { name: "Sửa menu ngày này" }).click();
  await expect(
    page.getByLabel("Thông báo Google Chat", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Thông báo Google Chat", { exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Tên món", { exact: true }).fill("Cơm gà mới");
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  const saved = JSON.parse(await page.getByLabel("Lệnh menu").innerText());
  expect(saved.payload.days[0]).toMatchObject({
    sourceVersion: 3,
    foods: [{ id: "food-monday", name: "Cơm gà mới" }],
  });
  await page.getByRole("button", { name: "Bỏ bản nháp đang sửa" }).click();
  await page.getByRole("button", { name: /Mở bản nháp tuần/ }).click();
  await page.getByRole("button", { name: "Công bố menu", exact: true }).click();
  const published = JSON.parse(await page.getByLabel("Lệnh menu").innerText());
  expect(published.payload).toMatchObject({
    weekStart: "2026-09-28",
    clearExistingOrders: false,
    notifyChat: true,
    expectedDayVersions: { "2026-09-28": 3 },
    days: [{ foods: [{ id: "food-monday" }] }],
  });
});
test("clearing orders confirms the entire target week count and cancellation submits nothing", async ({
  page,
}) => {
  await page
    .getByLabel("Tuần menu", { exact: true })
    .selectOption("2026-09-28");
  await page.getByRole("button", { name: "Sửa menu ngày này" }).click();
  await expect(
    page.getByLabel("Xóa các đơn đã đặt trong tuần này", { exact: true }),
  ).not.toBeChecked();
  await page
    .getByLabel("Xóa các đơn đã đặt trong tuần này", { exact: true })
    .check();
  await expect(page.getByText(/2 đơn đang hoạt động/)).toBeVisible();
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("2 đơn");
    return dialog.dismiss();
  });
  await page.getByRole("button", { name: "Công bố menu", exact: true }).click();
  await expect(page.getByLabel("Lệnh menu")).toHaveText("");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Công bố menu", exact: true }).click();
  expect(
    JSON.parse(await page.getByLabel("Lệnh menu").innerText()).payload,
  ).toMatchObject({ weekStart: "2026-09-28", clearExistingOrders: true });
});

test("initial publication allows opting out of Chat while retaining orders", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Hoặc nhập menu thủ công" }).click();
  const names = page.getByLabel("Tên món", { exact: true });
  for (let i = 0; i < (await names.count()); i++)
    await names.nth(i).fill(`Món ${i + 1}`);
  await expect(
    page.getByLabel("Thông báo Google Chat", { exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Thông báo Google Chat", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Công bố menu", exact: true }).click();
  expect(
    JSON.parse(await page.getByLabel("Lệnh menu").innerText()).payload,
  ).toMatchObject({
    weekStart: "2026-10-05",
    clearExistingOrders: false,
    notifyChat: false,
  });
});

test("OCR keeps all week-changing controls disabled until image processing completes", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.createImageBitmap = () => new Promise<ImageBitmap>(() => {});
  });
  await page.getByLabel("Chọn ảnh menu", { exact: true }).setInputFiles({
    name: "menu.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  await page
    .getByRole("button", { name: "Đọc menu bằng OCR", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Đang đọc menu…" }),
  ).toHaveText("Đang đọc menu…");
  await expect(page.getByLabel("Tuần menu", { exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Tuần trước", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Tuần hiện tại", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Tuần kế tiếp", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Hoặc nhập menu thủ công" }),
  ).toBeDisabled();
});
