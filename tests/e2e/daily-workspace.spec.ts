import { test, expect } from "@playwright/test";

test("ordering has bill, roster and supplier summary together and preserves bill drafts across days and remote updates", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/fixtures/shared.html?order&admin&finance");
    await expect(
      page.getByRole("region", { name: "Đơn của mọi người" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Bill trong ngày" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Đơn gửi quán" }),
    ).toBeVisible();
    await page.getByLabel("Loại giảm giá").selectOption("percent");
    await page.getByLabel("Giá trị giảm giá").fill("10");
    await page.getByLabel("Phí thêm VND").fill("1234");
    await page.locator(".days").getByRole("button").nth(1).click();
    await expect(page.getByLabel("Phí thêm VND")).toHaveValue("0");
    await page.locator(".days").getByRole("button").first().click();
    await expect(page.getByLabel("Phí thêm VND")).toHaveValue("1234");
    await page
      .getByRole("button", { name: "Tuần kế tiếp", exact: true })
      .click();
    await expect(page.getByLabel("Phí thêm VND")).toHaveCount(0);
    await page.getByRole("button", { name: "Tuần trước", exact: true }).click();
    await expect(page.getByLabel("Phí thêm VND")).toHaveValue("1234");
    await page.getByRole("button", { name: "Cập nhật từ đồng nghiệp" }).click();
    await expect(page.getByLabel("Phí thêm VND")).toHaveValue("1234");
    await page.getByRole("button", { name: "Lưu bill", exact: true }).click();
    const command = JSON.parse(
      await page.getByLabel("Lệnh ngày gửi").innerText(),
    );
    expect(command).toMatchObject({
      kind: "bill.save",
      version: 1,
      payload: {
        dayId: "day",
        discountKind: "percent",
        discountValue: 10,
        fee: 1234,
      },
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  }
});

test("a bill save acknowledged after changing day advances the cached version without losing its draft", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  for (const returnBeforeAck of [false, true]) {
    await page.goto(
      "/tests/fixtures/shared.html?order&admin&finance&delayBill",
    );
    await page.getByLabel("Phí thêm VND").fill("1234");
    await page.getByRole("button", { name: "Lưu bill", exact: true }).click();
    await page.locator(".days").getByRole("button").nth(1).click();
    if (returnBeforeAck)
      await page.locator(".days").getByRole("button").first().click();
    await page
      .getByRole("button", { name: "Xác nhận lưu bill", exact: true })
      .click();
    if (!returnBeforeAck)
      await page.locator(".days").getByRole("button").first().click();
    await expect(page.getByLabel("Phí thêm VND")).toHaveValue("1234");
    await expect(page.locator(".bill-editor .notice")).toHaveCount(0);
    await page.getByLabel("Phí thêm VND").fill("2222");
    await page.getByRole("button", { name: "Lưu bill", exact: true }).click();
    expect(
      JSON.parse(await page.getByLabel("Lệnh ngày gửi").innerText()),
    ).toMatchObject({
      kind: "bill.save",
      version: 2,
      payload: { dayId: "day", fee: 2222 },
    });
    await page
      .getByRole("button", { name: "Xác nhận lưu bill", exact: true })
      .click();
  }
});

test("daily controls respect coordinator, finance, employee, readonly and settled permissions", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  for (const [query, lock, bill] of [
    ["admin&finance", true, true],
    ["coordinator", true, false],
    ["finance", false, true],
    ["", false, false],
  ] as const) {
    await page.goto("/tests/fixtures/shared.html?order&" + query);
    await expect(
      page.getByRole("button", { name: "Khóa ngày đặt cơm" }),
    ).toHaveCount(lock ? 1 : 0);
    await expect(
      page.getByRole("button", { name: "Lưu bill", exact: true }),
    ).toHaveCount(bill ? 1 : 0);
  }
  await page.goto("/tests/fixtures/shared.html?order&admin&finance&readonly");
  await expect(
    page.getByRole("button", { name: "Khóa ngày đặt cơm" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Lưu bill", exact: true }),
  ).toBeDisabled();
  await page.goto("/tests/fixtures/shared.html?order&admin&finance&settled");
  await expect(
    page.getByRole("button", { name: "Khóa ngày đặt cơm" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Lưu bill", exact: true }),
  ).toHaveCount(0);
});

test("locking directly from ordering binds the day, reason and expected version", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.goto("/tests/fixtures/shared.html?order&admin&finance");
  await page.getByRole("button", { name: "Khóa ngày đặt cơm" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Lý do", { exact: true }).fill("Chốt gửi quán");
  await dialog.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mở khóa ngày" }),
  ).toBeVisible();
  expect(
    JSON.parse(await page.getByLabel("Lệnh ngày gửi").innerText()),
  ).toMatchObject({
    kind: "day.lock",
    version: 1,
    payload: { dayId: "day", locked: true, reason: "Chốt gửi quán" },
  });
  await expect(
    page
      .getByRole("list", { name: "Danh sách món" })
      .getByRole("button", { name: /Thêm/ })
      .first(),
  ).toBeDisabled();
  await page.locator(".days").getByRole("button").nth(1).click();
  await expect(
    page.getByRole("button", { name: "Khóa ngày đặt cơm" }),
  ).toBeEnabled();
});

test("locking first protects a manual order draft and cancelling never sends a day command", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.goto("/tests/fixtures/shared.html?order&admin&finance&manual");
  await page
    .getByRole("list", { name: "Danh sách món" })
    .getByRole("button", { name: /Thêm/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Khóa ngày đặt cơm" }).click();
  await expect(
    page.getByRole("dialog", { name: "Bản nháp chưa lưu" }),
  ).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tiếp tục chỉnh", exact: true })
    .click();
  await expect(page.getByLabel("Lệnh ngày gửi")).toBeEmpty();
  await page.getByRole("button", { name: "Khóa ngày đặt cơm" }).click();
  await page
    .getByRole("button", { name: "Bỏ bản nháp và chuyển", exact: true })
    .click();
  await expect(
    page.getByRole("alertdialog", { name: "Lý do khóa ngày" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Quay lại", exact: true }).click();
  await expect(page.getByLabel("Lệnh ngày gửi")).toBeEmpty();
  await expect(
    page.getByRole("button", { name: "Khóa ngày đặt cơm" }),
  ).toBeFocused();
});

test("session restoration never flashes login while auth or the first snapshot is pending", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-05T03:00:01Z"));
  await page.goto("/tests/fixtures/auth.html");
  await expect(
    page.getByRole("button", { name: "Đăng nhập với Google" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("status", { name: "Đang khôi phục phiên" }),
  ).toBeVisible();
  await page.clock.runFor(1000);
  await expect(
    page.getByRole("status", { name: "Đang tải dữ liệu" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đăng nhập với Google" }),
  ).toHaveCount(0);
  await page.clock.runFor(800);
  await expect(
    page.getByRole("heading", { name: "Đặt cơm", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đăng nhập với Google" }),
  ).toHaveCount(0);
});

test("a failed session restoration stays outside login and can retry", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-05T03:00:01Z"));
  await page.goto("/tests/fixtures/auth.html?error");
  await page.clock.runFor(1000);
  await expect(page.getByRole("alert")).toHaveText("Phiên chưa tải được");
  await expect(
    page.getByRole("button", { name: "Đăng nhập với Google" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Thử khôi phục phiên" }).click();
  await page.clock.runFor(1000);
  await expect(
    page.getByRole("status", { name: "Đang tải dữ liệu" }),
  ).toBeVisible();
  await page.clock.runFor(800);
  await expect(
    page.getByRole("heading", { name: "Đặt cơm", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Đăng nhập với Google" }),
  ).toHaveCount(0);
});

test("signed out state wins over an older getSession response and empty sessions show login", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-05T03:00:01Z"));
  await page.goto("/tests/fixtures/auth.html");
  await page.getByRole("button", { name: "Phiên đã đăng xuất" }).click();
  await page.clock.runFor(2000);
  await expect(
    page.getByRole("button", { name: "Đăng nhập với Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Đặt cơm", exact: true }),
  ).toHaveCount(0);
  await page.goto("/tests/fixtures/auth.html?empty");
  await page.clock.runFor(1000);
  await expect(
    page.getByRole("button", { name: "Đăng nhập với Google" }),
  ).toBeVisible();
});

test("a saved order is a status badge and editing brings the save action back", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-05T03:00:01Z"));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/fixtures/autosave.html");
    await expect(
      page.getByRole("button", { name: "Đã lưu", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("list", { name: "Danh sách món" })
      .getByRole("button", { name: /Thêm/ })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "Lưu ngay", exact: true }),
    ).toBeEnabled();
    await page.clock.runFor(700);
    await expect(page.getByLabel("Số lần ghi")).toHaveText("1");
    await expect(
      page.getByRole("button", { name: "Đã lưu", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("status").filter({ hasText: "Đã lưu" }).first(),
    ).toBeVisible();
    await page
      .getByRole("list", { name: "Danh sách món" })
      .getByRole("button", { name: /Thêm/ })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "Lưu ngay", exact: true }),
    ).toBeEnabled();
  }
});
