import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
it("ships the initial migration and a matching current auth trigger migration", () => {
  const schema = readFileSync("supabase/schemas/core.sql", "utf8");
  expect(
    readFileSync("supabase/migrations/20261002072918_core.sql", "utf8").length,
  ).toBeGreaterThan(10000);
  const start = schema.indexOf(
    "create or replace function private.provision_member()",
  );
  const end = schema.indexOf("create trigger provision_member", start);
  expect(
    readFileSync(
      "supabase/migrations/20261002201927_defer_google_member_until_confirmed.sql",
      "utf8",
    ),
  ).toBe(schema.slice(start, end));
});
