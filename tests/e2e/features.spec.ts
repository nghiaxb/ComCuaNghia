import { test, expect } from "@playwright/test";
test("OCR accepts drop and clipboard images once and leaves pasted text alone", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html");
  const zone = page
    .getByRole("region", { name: "Ảnh menu OCR" })
    .locator("label");
  const transfer = await page.evaluateHandle(() => {
    const d = new DataTransfer();
    d.items.add(new File(["image"], "menu.png", { type: "image/png" }));
    return d;
  });
  await zone.dispatchEvent("drop", { dataTransfer: transfer });
  await expect(page.getByLabel("Ảnh đã nhận")).toHaveText("1");
  await page.evaluate(() => {
    const d = new DataTransfer();
    d.items.add(new File(["paste"], "pasted.png", { type: "image/png" }));
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: d,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(page.getByLabel("Ảnh đã nhận")).toHaveText("2");
  const prevented = await page.evaluate(() => {
    const d = new DataTransfer();
    d.setData("text/plain", "Lunch");
    const e = new ClipboardEvent("paste", {
      clipboardData: d,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await page.evaluate(() => {
    const d = new DataTransfer();
    d.items.add(new File(["a"], "a.png", { type: "image/png" }));
    d.items.add(new File(["b"], "b.png", { type: "image/png" }));
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: d,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(page.getByRole("alert")).toHaveText(
    "Vui lòng chọn một ảnh menu mỗi lần.",
  );
  await expect(page.getByLabel("Ảnh đã nhận")).toHaveText("2");
});
test("employee edits an existing proxy cart with recipient reason and optimistic version", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html");
  await page.getByLabel("Đặt cơm cho").selectOption("colleague");
  await expect(page.getByLabel("Ghi chú món")).toHaveValue("Ít cơm");
  await expect(
    page.getByRole("button", { name: "Lưu thay đổi" }),
  ).toBeDisabled();
  await page.getByLabel("Lý do đặt hoặc chỉnh hộ").fill("Đồng nghiệp nhờ");
  await page.getByRole("button", { name: "Tăng", exact: true }).click();
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  const command = JSON.parse(await page.getByLabel("Lệnh đã gửi").innerText());
  expect(command).toMatchObject({
    kind: "order.save",
    version: 4,
    payload: {
      memberId: "colleague",
      reason: "Đồng nghiệp nhờ",
      items: [{ quantity: 3, note: "Ít cơm" }],
    },
  });
  await page.getByLabel("Đặt cơm cho").selectOption("demo-member");
  await expect(page.getByLabel("Ghi chú món")).toHaveCount(0);
});
test("manual day lock disables proxy cart", async ({ page }) => {
  await page.goto("/tests/fixtures/features.html?locked");
  await page.getByLabel("Đặt cơm cho").selectOption("colleague");
  await expect(
    page.getByRole("button", { name: "Lưu thay đổi" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Tăng", exact: true }),
  ).toBeDisabled();
});

test("snapshot refresh preserves unsaved proxy edits", async ({ page }) => {
  await page.goto("/tests/fixtures/features.html");
  await page.getByLabel("Đặt cơm cho").selectOption("colleague");
  await expect(page.getByLabel("Ghi chú món")).toHaveValue("Ít cơm");
  await page.getByLabel("Ghi chú món").fill("Thêm rau");
  await page.getByRole("button", { name: "Tăng", exact: true }).click();
  await page.getByRole("button", { name: "Refresh snapshot" }).click();
  await expect(page.getByLabel("Refresh count")).toHaveText("1");
  await expect(page.getByRole("button", { name: "Tăng", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Ghi chú món")).toHaveValue("Thêm rau");
  await page.getByLabel("Lý do đặt hoặc chỉnh hộ").fill("Nhờ đặt");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  const command = JSON.parse(await page.getByLabel("Lệnh đã gửi").innerText());
  expect(command.payload.items[0]).toMatchObject({ quantity: 3, note: "Thêm rau" });
});
