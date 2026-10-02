import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
it("ships the complete tested schema as the initial migration", () => {
  const schema = readFileSync("supabase/schemas/core.sql", "utf8");
  expect(schema.length).toBeGreaterThan(10000);
  expect(
    readFileSync("supabase/migrations/20261002072918_core.sql", "utf8"),
  ).toBe(schema);
});
