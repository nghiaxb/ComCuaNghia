import { test, expect } from "@playwright/test";
test.setTimeout(10000);

test("menu deletion opens a focused modal and Escape restores the delete button", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html?menus");
  await page
    .getByRole("button", { name: "Tuần hiện tại", exact: true })
    .click();
  const remove = page.getByRole("button", { name: "Xoá menu ngày này" });
  await remove.click();
  const dialog = page.getByRole("dialog", { name: "Xác nhận xoá menu" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Lý do gỡ menu")).toBeFocused();
  await expect(
    dialog.getByRole("button", { name: "Xác nhận gỡ menu" }),
  ).toBeDisabled();
  await page.screenshot({ path: "test-results/menu-modal.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(remove).toBeFocused();
  await expect(page.getByLabel("Lệnh đã gửi")).toHaveText("");
});

test("compact menu allows selecting and removing portions directly from its list", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html");
  await page
    .getByRole("button", { name: "Tuần hiện tại", exact: true })
    .click();
  const menu = page.getByRole("list", { name: "Danh sách món" });
  await expect(menu).toBeVisible();
  const first = menu.getByRole("listitem").first();
  expect((await first.boundingBox())!.height).toBeLessThan(110);
  await first.getByRole("button", { name: /Thêm/ }).click();
  await first.getByRole("button", { name: /Thêm/ }).click();
  await expect(first.getByRole("status")).toHaveText("2");
  await first.getByRole("button", { name: /Giảm/ }).click();
  await expect(first.getByRole("status")).toHaveText("1");
  await first.getByRole("button", { name: /Giảm/ }).click();
  await expect(first.getByRole("status")).toHaveText("0");
  await expect(
    page.getByRole("button", { name: "Đặt bữa trưa" }),
  ).toBeDisabled();
});

test("mobile order toolbar stays visible and saves the selected quantities", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/fixtures/features.html");
  await page
    .getByRole("button", { name: "Tuần hiện tại", exact: true })
    .click();
  await page
    .getByRole("list", { name: "Danh sách món" })
    .getByRole("listitem")
    .first()
    .getByRole("button", { name: /Thêm/ })
    .click();
  const toolbar = page.getByRole("region", { name: "Thao tác đơn cơm" });
  await expect(toolbar).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const box = (await toolbar.boundingBox())!;
  expect(box.y).toBeGreaterThan(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await toolbar.getByRole("button", { name: "Lưu đơn", exact: true }).click();
  const command = JSON.parse(
    (await page.getByLabel("Lệnh đã gửi").textContent())!,
  );
  expect(command.kind).toBe("order.save");
  expect(command.payload.items[0].quantity).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
