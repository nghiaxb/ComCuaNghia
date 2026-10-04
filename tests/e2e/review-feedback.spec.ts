import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
});

test("admin sees only the save action for the current settings scope", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/fixtures/autosave.html?settings&admin");
    const system = page.getByRole("button", { name: "Lưu cài đặt hệ thống" });
    const profile = page.getByRole("button", {
      name: "Lưu hồ sơ",
      exact: true,
    });
    await expect(profile).toBeVisible();
    await expect(system).toHaveCount(0);
    await page.getByLabel("Cách lưu đơn").selectOption("manual");
    await profile.click();
    await expect(page.getByLabel("Yêu cầu")).toContainText(
      '"k":"profile.save"',
    );
    await expect(page.getByLabel("Yêu cầu")).toContainText(
      '"orderSaveMode":"manual"',
    );
    for (const tab of ["Vận hành", "Google Chat"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect(system).toBeEnabled();
      expect((await system.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    for (const tab of ["Thành viên", "Import", "Cá nhân"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect(system).toHaveCount(0);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  }
});

test("system save keeps edits from both tabs and the expected version", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/autosave.html?settings&admin");
  await page.getByRole("tab", { name: "Vận hành", exact: true }).click();
  await page.getByLabel("Giá mặc định (VND)").fill("42000");
  await page.getByRole("tab", { name: "Google Chat", exact: true }).click();
  await page.getByRole("switch").click();
  await page.getByRole("tab", { name: "Vận hành", exact: true }).click();
  await expect(page.getByLabel("Giá mặc định (VND)")).toHaveValue("42000");
  await page.getByRole("button", { name: "Lưu cài đặt hệ thống" }).click();
  const request = JSON.parse((await page.getByLabel("Yêu cầu").textContent())!);
  expect(request).toEqual({
    k: "settings.save",
    version: 1,
    p: {
      cutoffTime: "17:00",
      reminderTime: "16:45",
      holidays: [],
      defaultPrice: 42000,
      collectorId: null,
      bankCode: "",
      accountNumber: "",
      accountName: "",
      chatEnabled: false,
    },
  });
  await page.getByRole("tab", { name: "Google Chat", exact: true }).click();
  await expect(page.getByRole("switch")).not.toBeChecked();
  await page.getByRole("button", { name: "Lưu cài đặt hệ thống" }).click();
  expect(JSON.parse((await page.getByLabel("Yêu cầu").textContent())!)).toEqual(
    request,
  );
});

test("system save stays disabled in busy and readonly settings", async ({
  page,
}) => {
  for (const mode of ["busy", "preview"]) {
    await page.goto(`/tests/fixtures/autosave.html?settings&admin&${mode}`);
    for (const tab of ["Vận hành", "Google Chat"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Lưu cài đặt hệ thống" }),
      ).toBeDisabled();
    }
  }
});

test("proxy reason follows recipient before mobile day navigation", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/fixtures/autosave.html?manual");
    const recipient = page.getByRole("combobox", { name: "Đặt cơm cho" });
    await recipient.click();
    await page.getByRole("option", { name: "Lan", exact: true }).click();
    const reason = page.getByLabel("Lý do đặt hoặc chỉnh hộ");
    await expect(reason).toBeVisible();
    const reasonBox = (await reason.boundingBox())!;
    const daysBox = (await page.locator(".days").boundingBox())!;
    expect(reasonBox.y + reasonBox.height).toBeLessThanOrEqual(daysBox.y);
    await reason.fill("Đồng nghiệp nhờ đặt, kiểm tra fixture");
    await page
      .getByRole("button", { name: "Người khác sửa", exact: true })
      .click();
    await expect(reason).toHaveValue("Đồng nghiệp nhờ đặt, kiểm tra fixture");
  }
});

test("mobile roster assigns cells by meaning after column reorder", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const share of [false, true]) {
      await page.goto(
        `/tests/fixtures/shared.html${share ? "?shareWithoutOrder" : ""}`,
      );
      const roster = page.getByRole("region", { name: "Đơn của mọi người" });
      await roster.locator("tbody tr").evaluateAll((rows) => {
        for (const row of rows) row.prepend(row.children[2]);
      });
      const active = roster.locator('tr[data-order-status="active"]');
      for (const [label, area] of [
        ["Đồng nghiệp", "person"],
        ["Đơn / ghi chú", "items"],
        ["Tiền món / phần chia", "money"],
        ["Thao tác gần nhất", "activity"],
        ["", "action"],
      ]) {
        await expect(active.locator(`td[data-label="${label}"]`)).toHaveCSS(
          "grid-area",
          area,
        );
      }
      await expect(active.getByText("Ít cơm", { exact: false })).toBeVisible();
      await expect(
        active.getByText("Nghĩa · đặt/chỉnh hộ", { exact: true }),
      ).toBeVisible();
      const unordered = roster.locator('tr[data-order-status="unordered"]');
      await expect(
        unordered.locator('td[data-label="Đơn / ghi chú"]'),
      ).not.toBeVisible();
      const money = unordered.locator('td[data-label="Tiền món / phần chia"]');
      if (share)
        await expect(
          money.getByText("Chia: 64.000 ₫", { exact: true }),
        ).toBeVisible();
      else await expect(money).not.toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    }
  }
});
