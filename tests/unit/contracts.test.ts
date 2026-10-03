import { describe, it, expect } from "vitest";
import { validateOrderInput } from "../../shared/contracts";
const id = "11111111-1111-4111-8111-111111111111";
describe("order input", () => {
  it("accepts bounded positive quantity", () => {
    expect(
      validateOrderInput({
        dayId: id,
        memberId: id,
        items: [{ menuItemId: id, quantity: 1, note: "" }],
      }).success,
    ).toBe(true);
  });
  it.each([0, -1, 1.5, 101])("rejects quantity %s", (quantity) => {
    expect(
      validateOrderInput({
        dayId: id,
        memberId: id,
        items: [{ menuItemId: id, quantity, note: "" }],
      }).success,
    ).toBe(false);
  });
});
