import { it, expect } from "vitest";
import { validateImage } from "../../worker/image";
it("rejects claimed image with non-image bytes", () =>
  expect(() => validateImage(btoa("not an image"), "image/png")).toThrow());
it("rejects decompression-bomb dimensions", () => {
  const b = new Uint8Array(24);
  b.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(b.buffer).setUint32(16, 50000);
  new DataView(b.buffer).setUint32(20, 50000);
  expect(() =>
    validateImage(btoa(String.fromCharCode(...b)), "image/png"),
  ).toThrow();
});
