import { it, expect } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  validateWebhook,
} from "../../worker/secrets";
import { parseOcr } from "../../worker/ocr";
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
      subject: "A",
      afterCutoff: true,
      before: { items: [{ name: "Cá", quantity: 1, note: "" }] },
      after: { items: [{ name: "Gà", quantity: 2, note: "ít cay" }] },
    },
    "https://app.test",
  );
  expect(out.text).toContain("Trước: Cá ×1");
  expect(out.text).toContain("Sau: Gà ×2 · ít cay");
  expect(out.text).toContain("SAU MỐC DỰ KIẾN");
});
