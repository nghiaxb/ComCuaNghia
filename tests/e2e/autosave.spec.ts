import { chooseRecipient } from "../helpers/recipient";
import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-05T03:00:01Z"));
  page.on("dialog", (d) => d.accept());
});
const add = async (page: any) =>
  page
    .getByRole("list", { name: "Danh sách món" })
    .getByRole("listitem")
    .first()
    .getByRole("button", { name: /Thêm/ })
    .click();
test("default autosave debounces quantity and note; manual waits for submit", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html");
  await add(page);
  await add(page);
  await page.getByLabel("Ghi chú món").fill("Ít cơm");
  await page.clock.runFor(699);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("0");
  await page.clock.runFor(1);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
  await expect(page.getByLabel("Yêu cầu")).toContainText("Ít cơm");
  await page.goto("/tests/fixtures/autosave.html?manual");
  await add(page);
  await page.clock.runFor(2000);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("0");
  await page
    .locator(".cart")
    .getByRole("button", { name: "Đặt bữa trưa" })
    .click();
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
});
test("proxy requires reason and uses actor mode; protected screens never submit", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html");
  await chooseRecipient(page, "friend");
  await add(page);
  await page.clock.runFor(1000);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("0");
  await page.getByLabel("Lý do đặt hoặc chỉnh hộ").fill("Lan nhờ");
  await page.clock.runFor(700);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
  await expect(page.getByLabel("Yêu cầu")).toContainText("friend");
  for (const mode of ["preview", "locked", "settled"]) {
    await page.goto("/tests/fixtures/autosave.html?" + mode);
    await expect(
      page.getByRole("list").getByRole("button", { name: /Thêm/ }).first(),
    ).toBeDisabled();
    await page.clock.runFor(1000);
    await expect(page.getByLabel("Số lần ghi")).toHaveText("0");
  }
});
test("navigation guards dirty cart, external update preserves draft, retry preserves request identity", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html?manual");
  await add(page);
  await page.getByRole("link", { name: "Rời màn hình" }).click();
  await expect(
    page.getByRole("dialog", { name: "Bản nháp chưa lưu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục chỉnh" }).click();
  await page.getByRole("button", { name: "Người khác sửa" }).click();
  await expect(
    page.getByRole("status", { name: "Trạng thái lưu đơn" }),
  ).toContainText("người khác");
  await expect(page.getByRole("list").getByRole("status").first()).toHaveText(
    "1",
  );
  await page.getByRole("button", { name: "Tải đơn mới nhất" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(page.getByRole("list").getByRole("status").first()).toHaveText(
    "4",
  );
  await page.goto("/tests/fixtures/autosave.html?error");
  await add(page);
  await page.clock.runFor(700);
  const request = await page.getByLabel("Yêu cầu").textContent();
  await page.getByRole("button", { name: "Thử lưu lại" }).click();
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
  await expect(page.getByLabel("Yêu cầu")).toHaveText(request!);
});
test("settings persists own preference", async ({ page }) => {
  await page.goto("/tests/fixtures/autosave.html?settings");
  await expect(page.getByLabel("Cách lưu đơn")).toHaveValue("autosave");
  await page.getByLabel("Cách lưu đơn").selectOption("manual");
  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();
  await expect(page.getByLabel("Yêu cầu")).toContainText(
    '"orderSaveMode":"manual"',
  );
});
test("recipient changes wait for in-flight acknowledgement and discard never sends to the next recipient", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html?slow");
  await add(page);
  await page.clock.runFor(700);
  await chooseRecipient(page, "friend");
  const dialog = page.getByRole("dialog", { name: "Bản nháp chưa lưu" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Bỏ bản nháp và chuyển" }),
  ).toBeDisabled();
  await page.clock.runFor(1500);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
  await dialog.getByRole("button", { name: "Bỏ bản nháp và chuyển" }).click();
  await expect(
    page.getByRole("combobox", { name: "Đặt cơm cho" }),
  ).toContainText("Lan");
  await page.clock.runFor(2000);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
  await expect(page.getByRole("list").getByRole("status").first()).toHaveText(
    "0",
  );
});
test("queued autosave cancellation removes pending edits; enabling autosave confirms a manual draft", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html");
  await add(page);
  await page.clock.runFor(700);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
  await add(page);
  await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(page.getByLabel("Số lần ghi")).toHaveText("2");
  await expect(page.getByLabel("Yêu cầu")).toContainText("order.cancel");
  await page.clock.runFor(1000);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("2");
  await page.goto("/tests/fixtures/autosave.html?manual");
  await add(page);
  await page.getByLabel("Cách lưu đơn").selectOption("autosave");
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await page.clock.runFor(700);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
});
test("browser back and logout requests are guarded while dirty", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html?router");
  await page.getByRole("link", { name: "Rời màn hình" }).click();
  await add(page);
  await page.evaluate(() => history.back());
  await expect(
    page.getByRole("dialog", { name: "Bản nháp chưa lưu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục chỉnh" }).click();
  await page.getByRole("button", { name: "Đăng xuất thử" }).click();
  await expect(
    page.getByRole("dialog", { name: "Bản nháp chưa lưu" }),
  ).toBeVisible();
  await expect(page.getByLabel("Đã đăng xuất")).toHaveText("no");
});
test("same-subject navigation keeps the controller usable after discard", async ({
  page,
}) => {
  for (const target of ["day", "week", "link"]) {
    await page.goto("/tests/fixtures/autosave.html?manual");
    await add(page);
    if (target === "day") await page.locator(".days button.selected").click();
    if (target === "week")
      await page
        .getByRole("button", { name: "Tuần hiện tại", exact: true })
        .click();
    if (target === "link")
      await page
        .getByRole("region", { name: "Đơn của mọi người" })
        .getByRole("link")
        .first()
        .click();
    const dialog = page.getByRole("dialog", { name: "Bản nháp chưa lưu" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Bỏ bản nháp và chuyển" }).click();
    await add(page);
    await expect(page.getByRole("list").getByRole("status").first()).toHaveText(
      "1",
    );
    await page
      .locator(".cart")
      .getByRole("button", { name: "Đặt bữa trưa" })
      .click();
    await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
  }
});
test("remote preference cannot autosave a dirty manual draft without consent", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html?manual");
  await add(page);
  await page.getByRole("button", { name: "Phiên khác bật tự lưu" }).click();
  await page.clock.runFor(2000);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("0");
  const dialog = page.getByRole("dialog", { name: "Bật tự lưu cho bản nháp?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Bật tự lưu và gửi" }).click();
  await page.clock.runFor(700);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
});
test("declining remote autosave keeps the current draft manual", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html?manual");
  await add(page);
  await page.getByRole("button", { name: "Phiên khác bật tự lưu" }).click();
  await page.getByRole("button", { name: "Giữ bấm gửi cho bản nháp" }).click();
  await page.clock.runFor(2000);
  await expect(page.getByLabel("Số lần ghi")).toHaveText("0");
  await page
    .locator(".cart")
    .getByRole("button", { name: "Đặt bữa trưa" })
    .click();
  await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
});
