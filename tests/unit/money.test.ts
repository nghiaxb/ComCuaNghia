import { it, expect } from "vitest";
import { allocateVnd, splitBill } from "../../shared/money";
it("conserves odd VND with stable tie break", () =>
  expect(
    allocateVnd(100, [
      { id: "a", weight: 1 },
      { id: "b", weight: 1 },
      { id: "c", weight: 1 },
    ]),
  ).toEqual({ a: 34, b: 33, c: 33 }));
it("redistributes covered meals", () =>
  expect(
    splitBill(
      105000,
      [
        { id: "a", weight: 35000 },
        { id: "b", weight: 35000 },
        { id: "c", weight: 35000 },
      ],
      ["a"],
      ["b", "c"],
    ),
  ).toEqual({ a: 0, b: 52500, c: 52500 }));
it("rejects missing sponsor", () =>
  expect(() => splitBill(10, [{ id: "a", weight: 10 }], ["a"], [])).toThrow());
it("rejects negative and unsafe values", () => {
  expect(() => allocateVnd(-1, [{ id: "a", weight: 1 }])).toThrow();
  expect(() =>
    allocateVnd(Number.MAX_SAFE_INTEGER + 1, [{ id: "a", weight: 1 }]),
  ).toThrow();
});
it("handles zero", () =>
  expect(allocateVnd(0, [{ id: "a", weight: 0 }])).toEqual({ a: 0 }));
