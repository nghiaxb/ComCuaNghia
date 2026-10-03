import { test, expect } from "@playwright/test";
test("two pages share proxy autosave, totals, cancellation and menu changes through batched refresh", async ({
  context,
}) => {
  const a = await context.newPage(),
    b = await context.newPage();
  for (const p of [a, b]) {
    await p.clock.install({ time: new Date("2026-10-05T03:00:00Z") });
    await p.clock.pauseAt(new Date("2026-10-05T03:00:01Z"));
  }
  await a.goto("/tests/fixtures/realtime.html?actor=a");
  await b.goto("/tests/fixtures/realtime.html?actor=b");
  await a.getByRole("combobox", { name: "Đặt cơm cho" }).click();
  await a.getByRole("option", { name: "Lan", exact: true }).click();
  await a.getByLabel("Lý do đặt hoặc chỉnh hộ").fill("Lan nhờ");
  await a
    .getByRole("list")
    .getByRole("button", { name: /Thêm/ })
    .first()
    .click();
  await a.clock.runFor(700);
  await b.clock.runFor(300);
  const bill = b.getByRole("region", { name: "Bill trong ngày" }),
    roster = b.getByRole("region", { name: "Đơn của mọi người" });
  await b.getByRole("tab", { name: "Bill & chia tiền" }).click();
  await expect(bill).toContainText("32.500");
  await b.getByRole("tab", { name: "Đơn mọi người" }).click();
  await expect(roster).toContainText("Nghĩa · đặt/chỉnh hộ");
  await expect(b.getByRole("list").getByRole("status").first()).toHaveText("1");
  a.on("dialog", (d) => d.accept());
  await a.getByRole("button", { name: "Hủy đơn", exact: true }).click();
  await a
    .getByRole("alertdialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await b.clock.runFor(300);
  await b.getByRole("tab", { name: "Đơn mọi người" }).click();
  await expect(roster).toContainText("Đã huỷ");
  await b.getByRole("tab", { name: "Bill & chia tiền" }).click();
  await expect(bill).toContainText("0");
  await a
    .getByRole("list")
    .getByRole("button", { name: /Thêm/ })
    .first()
    .click();
  await a.clock.runFor(700);
  await b.clock.runFor(300);
  await b.getByRole("tab", { name: "Bill & chia tiền" }).click();
  await expect(bill).toContainText("32.500");
  const before = Number(
    await b.getByLabel("Số lần tải snapshot").textContent(),
  );
  await a.getByRole("button", { name: "Cập nhật giá và burst" }).click();
  await b.clock.runFor(300);
  await b.getByRole("tab", { name: "Bill & chia tiền" }).click();
  await expect(bill).toContainText("37.000");
  expect(
    Number(await b.getByLabel("Số lần tải snapshot").textContent()) - before,
  ).toBeLessThanOrEqual(2);
  await a.clock.runFor(300);
  await a.getByRole("button", { name: "Đổi tên món" }).click();
  await b.clock.runFor(300);
  await b.getByRole("tab", { name: "Đơn mọi người" }).click();
  await expect(roster).toContainText("Đã huỷ");
  await expect(b.getByRole("list").getByRole("status").first()).toHaveText("0");
  await a.getByRole("button", { name: "Khoá ngày" }).click();
  await b.clock.runFor(300);
  await expect(
    b.getByRole("list").getByRole("button", { name: /Thêm/ }).first(),
  ).toBeDisabled();
  await a.getByRole("button", { name: "Mở lại và reconnect" }).click();
  await b.getByRole("button", { name: "Reconnect", exact: true }).click();
  await b.clock.runFor(300);
  await expect(
    b.getByRole("list").getByRole("button", { name: /Thêm/ }).first(),
  ).toBeEnabled();
  await b.screenshot({ path: "test-results/shared-realtime.png" });
});
