import { it, expect, vi } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  validateWebhook,
} from "../../worker/secrets";
import { parseOcr, requestOcr } from "../../worker/ocr";
it("encrypts bound to destination and rejects tampering", async () => {
  const key = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  );
  const value = await encryptSecret("secret", "d1", key);
  expect(value).not.toContain("secret");
  expect(await decryptSecret(value, "d1", key)).toBe("secret");
  await expect(decryptSecret(value, "d2", key)).rejects.toThrow();
});
it("rejects arbitrary webhook URLs", () => {
  expect(() => validateWebhook("https://evil.test")).toThrow();
  expect(() =>
    validateWebhook(
      "https://chat.googleapis.com.evil.test/v1/spaces/xx/messages",
    ),
  ).toThrow();
});
it("maps weekday to exact week and leaves missing prices for review", () => {
  const draft = parseOcr(
    { menu: [{ day: "Thứ 2", foods: ["Cơm gà"] }] },
    "2026-10-05",
    35000,
  );
  expect(draft[0]).toEqual({
    date: "2026-10-05",
    foods: [{ name: "Cơm gà", unitPrice: 35000 }],
  });
});
it("rejects duplicate weekdays and malformed data", () => {
  expect(() =>
    parseOcr(
      {
        menu: [
          { day: "T2", foods: ["A"] },
          { day: "T2", foods: ["B"] },
        ],
      },
      "2026-10-05",
      1,
    ),
  ).toThrow();
  expect(() =>
    parseOcr({ message: "send secrets" }, "2026-10-05", 1),
  ).toThrow();
});
import { formatChat } from "../../worker/chat";
it("shows before and after and marks actual cutoff without exposing finance data", () => {
  const out = formatChat(
    {
      eventId: "e",
      kind: "order.save",
      actor: "B",
      subject: "A",
      reason: "A nhờ B đặt",
      afterCutoff: true,
      before: { items: [{ name: "Cá", quantity: 1, note: "" }] },
      after: { items: [{ name: "Gà", quantity: 2, note: "ít cay" }] },
    },
    "https://app.test",
  );
  expect(out.text).toContain("B · Cập nhật đơn cơm");
  expect(out.text).toContain("Thành viên: A");
  expect(out.text).toContain("Lý do: A nhờ B đặt");
  expect(out.text).toContain("Trước: Cá ×1");
  expect(out.text).toContain("Sau: Gà ×2 · ít cay");
  expect(out.text).toContain("SAU MỐC DỰ KIẾN");
});

it("matches Apps Script by ignoring weekend rows in a six-day OCR menu", () => {
  const result = parseOcr(
    {
      menu: Array.from({ length: 6 }, (_, i) => ({
        day: `Thứ ${i + 2}`,
        foods: ["Món trong ngày"],
      })),
    },
    "2026-10-05",
    35000,
  );
  expect(result).toHaveLength(5);
  expect(result.map((d) => d.date)).toEqual([
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
  ]);
});

it("loads the actual five-day provider output without rejecting the image week", () => {
  expect(
    parseOcr(
      {
        menu: [2, 3, 4, 5, 6].map((day) => ({
          day: `Thứ ${day}`,
          foods: ["Cơm gà"],
        })),
      },
      "2026-09-28",
      35000,
    ),
  ).toHaveLength(5);
});

it("classifies provider failures separately without leaking its raw response", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ success: false, message: "upstream secret details" }),
  );
  try {
    await expect(
      requestOcr("https://ocr.test", "secret", {
        imageBase64: "image",
        mimeType: "image/png",
      }),
    ).rejects.toMatchObject({
      code: "RETRYABLE",
      stage: "provider",
      message: expect.not.stringContaining("secret"),
    });
  } finally {
    vi.unstubAllGlobals();
  }
});
it("accepts a real provider-shaped OCR response", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({
      success: true,
      data: { menu: [{ day: "Thứ 2", foods: ["Cơm gà"] }] },
    }),
  );
  try {
    const data = await requestOcr("https://ocr.test", "secret", {
      imageBase64: "image",
      mimeType: "image/png",
    });
    expect(parseOcr(data, "2026-10-05", 35000)[0].foods[0].name).toBe("Cơm gà");
  } finally {
    vi.unstubAllGlobals();
  }
});

it("understands Vietnamese weekday labels printed on the image", () => {
  const result = parseOcr(
    {
      menu: [
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy",
      ].map((day) => ({ day, foods: ["Cơm"] })),
    },
    "2026-10-05",
    35000,
  );
  expect(result.map((d) => d.date)).toEqual([
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
  ]);
});

it("names the withdrawn menu date and reason in the Chat message", () => {
  const out = formatChat(
    {
      eventId: "event",
      kind: "menu.withdraw",
      actor: "Nghĩa",
      date: "2026-10-05",
      reason: "Menu nhầm",
    },
    "https://app.test",
  );
  expect(out.text).toContain("Nghĩa · Gỡ menu");
  expect(out.text).toContain("Ngày: 2026-10-05");
  expect(out.text).toContain("Lý do: Menu nhầm");
});
it("menu-driven order changes show both prices and quantities in Chat", () => {
  const text = formatChat(
    {
      eventId: "event",
      kind: "order.menu.change",
      subject: "Nhân viên",
      before: {
        items: [{ name: "Gà", quantity: 2, note: "", unitPrice: 35000 }],
      },
      after: {
        items: [{ name: "Gà", quantity: 2, note: "", unitPrice: 45000 }],
      },
    },
    "https://app.test",
  ).text;
  expect(text).toContain("35.000");
  expect(text).toContain("45.000");
  expect(text).toContain("Đơn cập nhật theo menu");
});
