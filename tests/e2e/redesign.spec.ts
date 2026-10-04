import { test, expect } from "@playwright/test";
test.setTimeout(10000);
test("mobile navigation opens accessible menu and restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/order");
  const trigger = page.getByRole("button", { name: "Mở điều hướng" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Điều hướng" });
  await expect(
    dialog.getByRole("link", { name: "Cài đặt", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test("recipient picker searches and selects an explicit colleague", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html");
  await page.getByRole("combobox", { name: "Đặt cơm cho" }).click();
  await page.getByPlaceholder("Tìm đồng nghiệp…").fill("Lan");
  await page.getByRole("option", { name: "Lan", exact: true }).click();
  await expect(page.getByLabel("Lý do đặt hoặc chỉnh hộ")).toBeVisible();
});
test("mobile cart opens as a sheet and save status stays visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/fixtures/autosave.html?manual");
  const bar = page.getByRole("region", { name: "Thao tác đơn cơm" });
  await expect(bar.getByRole("status")).toBeVisible();
  await bar.getByRole("button", { name: /Xem đơn/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Chi tiết đơn cơm" }),
  ).toBeVisible();
});
test("mobile uncertain request exposes Retry without opening cart", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/tests/fixtures/autosave.html?error");
  await page
    .getByRole("list", { name: "Danh sách món" })
    .getByRole("button", { name: /Thêm/ })
    .first()
    .click();
  await page.clock.runFor(700);
  const bar = page.getByRole("region", { name: "Thao tác đơn cơm" });
  await expect(bar.getByRole("button", { name: "Thử lưu lại" })).toBeVisible();
  const request = await page.getByLabel("Yêu cầu").textContent();
  await bar.getByRole("button", { name: "Thử lưu lại" }).click();
  await expect(page.getByLabel("Yêu cầu")).toHaveText(request!);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
});
test("mobile shared rows show compact labelled cells", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/fixtures/shared.html");
  const region = page.getByRole("region", { name: "Đơn của mọi người" });
  await expect(region.locator("tbody td").first()).toHaveCSS("display", "grid");
  await expect(region).toContainText("Ít cơm");
  await expect(
    page.getByRole("region", { name: "Bill trong ngày" }),
  ).toContainText("64.000");
});
test("realtime bill update preserves draft and its original version", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/shared.html?finance");
  await page.getByLabel("Phí thêm VND").fill("1234");
  await page.getByRole("button", { name: "Cập nhật từ đồng nghiệp" }).click();
  await expect(page.getByLabel("Phí thêm VND")).toHaveValue("1234");
  await page.getByRole("button", { name: "Lưu bill", exact: true }).click();
  await expect(page.getByLabel("Phiên bản bill gửi")).toHaveText("1");
});
test("settings separates personal and administrative groups", async ({
  page,
}) => {
  await page.goto("/order");
  await page
    .getByRole("button", { name: "Xem trước giao diện với dữ liệu mẫu →" })
    .click();
  await page.getByRole("link", { name: "Cài đặt", exact: true }).click();
  for (const name of [
    "Cá nhân",
    "Vận hành",
    "Google Chat",
    "Thành viên",
    "Import",
  ])
    await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Google Chat", exact: true }).click();
  await expect(
    page.getByLabel("Webhook mới (không hiển thị lại)"),
  ).toBeVisible();
  await page.goto("/tests/fixtures/autosave.html?settings");
  await expect(
    page.getByRole("tab", { name: "Google Chat", exact: true }),
  ).toHaveCount(0);
});
test("settlement uses an explicit accessible confirmation", async ({
  page,
}) => {
  page.on("dialog", (d) => d.dismiss());
  await page.goto("/tests/fixtures/history.html?finance&admin&locked");
  await page
    .getByLabel("Tuần công nợ", { exact: true })
    .selectOption("2026-08-03");
  await page
    .getByRole("button", { name: "Quyết toán tuần", exact: true })
    .click();
  await expect(
    page.getByRole("alertdialog", { name: "Quyết toán tuần và ghi công nợ?" }),
  ).toBeVisible();
});
test("settings tabs wrap within their bar above the active panel", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/order");
    await page
      .getByRole("button", { name: "Xem trước giao diện với dữ liệu mẫu →" })
      .click();
    if (width < 768)
      await page.getByRole("button", { name: "Mở điều hướng" }).click();
    await page.getByRole("link", { name: "Cài đặt", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Điều hướng" })).toHaveCount(
      0,
    );
    const tabs = page.getByRole("tablist");
    await expect(tabs.getByRole("tab")).toHaveCount(5);
    const bar = (await tabs.boundingBox())!;
    for (const tab of await tabs.getByRole("tab").all()) {
      const box = (await tab.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(bar.y);
      expect(box.y + box.height).toBeLessThanOrEqual(bar.y + bar.height);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    const panel = (await page.getByRole("tabpanel").boundingBox())!;
    expect(panel.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    await tabs.getByRole("tab", { name: "Import", exact: true }).click();
    await expect(
      tabs.getByRole("tab", { name: "Import", selected: true }),
    ).toBeVisible();
    await expect(page.getByRole("tabpanel")).toBeVisible();
  }
});
test("day selection exposes one current day and distinct unselected controls", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.goto("/tests/fixtures/autosave.html");
  const days = page.locator(".days");
  await expect(days.getByRole("button", { pressed: true })).toHaveCount(1);
  const selected = await days
    .getByRole("button", { pressed: true })
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  const other = await days
    .getByRole("button", { pressed: false })
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(selected).not.toBe(other);
});

test("mobile cart returns focus to its opener", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/fixtures/autosave.html?manual");
  const trigger = page
    .getByRole("region", { name: "Thao tác đơn cơm" })
    .getByRole("button", { name: /Xem đơn/ });
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
test("mobile shared cards wrap long names and notes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/tests/fixtures/shared.html");
  const cell = page
    .getByRole("region", { name: "Đơn của mọi người" })
    .locator("tbody td")
    .first();
  await cell.evaluate((e) => {
    e.textContent =
      "Nguyễn Thị Minh Phương Đặt hộ đồng nghiệp ghi chú món ăn rất dài";
  });
  await expect(cell).toHaveCSS("white-space", "normal");
  expect(await cell.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
});
test("decisions expire on subject change and wait for actions with retry", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/decision.html");
  await page.getByRole("button", { name: "Mở xác nhận" }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("change-subject")));
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByLabel("Số thao tác")).toHaveText("0");
  await page.getByRole("button", { name: "Mở xác nhận" }).click();
  const modal = page.getByRole("alertdialog");
  await modal.getByLabel("Lý do").fill("Kiểm tra bill");
  await modal.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    modal.getByRole("button", { name: "Đang xử lý…" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(modal).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("fail-action")));
  await expect(modal.getByRole("alert")).toBeVisible();
  await expect(modal.getByLabel("Lý do")).toHaveValue("Kiểm tra bill");
  await modal.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("complete-action")));
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mở xác nhận" })).toBeFocused();
});
