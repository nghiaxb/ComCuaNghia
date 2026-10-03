import { test, expect } from "@playwright/test";
test("shared buttons avoid accidental form submission and honor native disabled/submit", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/ui.html");
  await page.getByRole("button", { name: "Thao tác", exact: true }).click();
  await expect(page.getByLabel("Thao tác", { exact: true })).toHaveText("1");
  await expect(page.getByLabel("Gửi form", { exact: true })).toHaveText("0");
  await expect(page.getByRole("button", { name: "Đã vô hiệu" })).toBeDisabled();
  await page.getByRole("button", { name: "Gửi form" }).click();
  await expect(page.getByLabel("Gửi form", { exact: true })).toHaveText("1");
});
test("shared dialog restores focus and prevents Escape during processing", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/ui.html");
  const trigger = page.getByRole("button", { name: "Mở hộp thoại" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Hộp thoại dùng chung" });
  await expect(dialog.getByLabel("Nội dung")).toBeFocused();
  await dialog.getByRole("button", { name: "Đang xử lý" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Đã xử lý" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
