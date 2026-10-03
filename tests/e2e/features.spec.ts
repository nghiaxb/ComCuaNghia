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
  await expect(page.getByLabel("Ảnh đã nhận")).toHaveText("0");
  await page
    .getByRole("button", { name: "Đọc menu bằng OCR", exact: true })
    .click();
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
  await expect(page.getByLabel("Ảnh đã nhận")).toHaveText("1");
  await page
    .getByRole("button", { name: "Đọc menu bằng OCR", exact: true })
    .click();
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
  await expect(
    page.getByRole("button", { name: "Tăng", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Ghi chú món")).toHaveValue("Thêm rau");
  await page.getByLabel("Lý do đặt hoặc chỉnh hộ").fill("Nhờ đặt");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  const command = JSON.parse(await page.getByLabel("Lệnh đã gửi").innerText());
  expect(command.payload.items[0]).toMatchObject({
    quantity: 3,
    note: "Thêm rau",
  });
});

test("selected and pasted menu images preview immediately and survive OCR errors", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html?ocrError");
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5WQAAAAASUVORK5CYII=",
    "base64",
  );
  await page
    .getByLabel("Chọn ảnh menu", { exact: true })
    .setInputFiles({ name: "menu.png", mimeType: "image/png", buffer: bytes });
  await expect(
    page.getByRole("img", { name: "Ảnh menu đã chọn" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Ảnh menu đã chọn" }),
  ).toHaveJSProperty("naturalWidth", 1);
  await page.evaluate(() => {
    const d = new DataTransfer();
    d.items.add(
      new File(
        [
          Uint8Array.from(
            atob(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5WQAAAAASUVORK5CYII=",
            ),
            (c) => c.charCodeAt(0),
          ),
        ],
        "pasted-menu.png",
        { type: "image/png" },
      ),
    );
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: d,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(
    page
      .getByRole("region", { name: "Ảnh menu OCR" })
      .getByText("pasted-menu.png", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Ảnh đã nhận")).toHaveText("0");
  await page
    .getByRole("button", { name: "Đọc menu bằng OCR", exact: true })
    .click();
  await expect(page.getByLabel("Lệnh đã gửi")).toHaveText("pasted-menu.png");
  await expect(page.getByRole("alert")).toHaveText(
    "Chưa xử lý được ảnh menu. Bạn có thể thử chọn hoặc dán lại ảnh.",
  );
  await expect(
    page.getByRole("img", { name: "Ảnh menu đã chọn" }),
  ).toBeVisible();
});

test("removing a mistaken menu image prevents submitting it", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html");
  await page.getByLabel("Chọn ảnh menu", { exact: true }).setInputFiles({
    name: "wrong.png",
    mimeType: "image/png",
    buffer: Buffer.from("image"),
  });
  await expect(page.getByLabel("Ảnh đã nhận")).toHaveText("0");
  await page.getByRole("button", { name: "Bỏ ảnh đã chọn" }).click();
  await expect(page.getByRole("img", { name: "Ảnh menu đã chọn" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Đọc menu bằng OCR", exact: true }),
  ).toBeDisabled();
});

test("published menu is visible and withdrawal requires an explicit reason and confirmation", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html?menus");
  const published = page.getByRole("region", { name: "Menu đã công bố" });
  await expect(published).toBeVisible();
  await published.getByRole("button", { name: "Xoá menu ngày này" }).click();
  await expect(page.getByLabel("Lệnh đã gửi")).toHaveText("");
  await expect(
    page.getByRole("button", { name: "Xác nhận gỡ menu" }),
  ).toBeDisabled();
  await page.getByLabel("Lý do gỡ menu").fill("Menu nhập nhầm");
  await page.getByRole("button", { name: "Xác nhận gỡ menu" }).click();
  const command = JSON.parse(
    (await page.getByLabel("Lệnh đã gửi").textContent()) ?? "{}",
  );
  expect(command.kind).toBe("menu.withdraw");
  expect(command.payload.reason).toBe("Menu nhập nhầm");
  expect(command.payload.dayId).toBeTruthy();
  expect(command.version).toBe(1);
});
test("published menu can be loaded for editing with row removal and draft discard", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html?menus");
  await page
    .getByRole("region", { name: "Menu đã công bố" })
    .getByRole("button", { name: "Sửa menu ngày này" })
    .click();
  const before = await page.getByLabel("Tên món", { exact: true }).count();
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Thêm món", exact: true }).click();
  await expect(page.getByLabel("Tên món", { exact: true })).toHaveCount(
    before + 1,
  );
  await page.getByRole("button", { name: "Xoá món" }).last().click();
  await expect(page.getByLabel("Tên món", { exact: true })).toHaveCount(before);
  await page.getByRole("button", { name: "Bỏ bản nháp đang sửa" }).click();
  await expect(page.getByLabel("Tên món", { exact: true })).toHaveCount(0);
});
test("editing a published day carries its source version and clears the editor after publishing", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html?menus");
  await page.getByRole("button", { name: "Sửa menu ngày này" }).click();
  await page.getByRole("button", { name: "Công bố menu", exact: true }).click();
  const command = JSON.parse(
    (await page.getByLabel("Lệnh đã gửi").textContent()) ?? "{}",
  );
  expect(command.kind).toBe("menu.publish");
  expect(
    command.payload.expectedDayVersions[command.payload.days[0].date],
  ).toBe(1);
  await expect(page.getByLabel("Tên món", { exact: true })).toHaveCount(0);
});

test("saving and reopening published edits retains their original version", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/features.html?menus&savedMenu");
  await page.getByRole("button", { name: "Sửa menu ngày này" }).click();
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  const saved = JSON.parse(
    (await page.getByLabel("Lệnh đã gửi").textContent()) ?? "{}",
  );
  expect(saved.payload.days[0].sourceVersion).toBe(1);
  await page.getByRole("button", { name: "Bỏ bản nháp đang sửa" }).click();
  await page.getByRole("button", { name: /Mở bản nháp tuần/ }).click();
  await page.getByRole("button", { name: "Công bố menu", exact: true }).click();
  const published = JSON.parse(
    (await page.getByLabel("Lệnh đã gửi").textContent()) ?? "{}",
  );
  expect(
    published.payload.expectedDayVersions[published.payload.days[0].date],
  ).toBe(1);
});
