import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
let db: PGlite;
const admin = "11111111-1111-4111-8111-111111111111",
  employee = "22222222-2222-4222-8222-222222222222";
async function actor(id: string) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function command(
  kind: string,
  payload: unknown,
  version = 0,
  requestId = crypto.randomUUID(),
) {
  const r = await db.query<{ result: any }>(
    "select public.command($1,$2,$3,$4) result",
    [kind, payload, version, requestId],
  );
  return r.rows[0].result;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_app_meta_data jsonb);create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
  await db.query(
    "insert into auth.users values($1,'admin@rivercrane.vn',now(),'{\"provider\":\"google\"}'),($2,'employee@rivercrane.vn',now(),'{\"provider\":\"google\"}')",
    [admin, employee],
  );
  await db.query(
    "update public.members set role='admin',can_manage_finance=true where id=$1",
    [admin],
  );
}, 30000);
afterAll(() => db.close());
it("shares colleague orders and safe actor roster while keeping finance and profile private", async () => {
  await actor(admin);
  await command("menu.publish", {
    days: [
      {
        date: "2030-01-07",
        foods: [{ name: "Shared dish", unitPrice: 35000 }],
      },
    ],
  });
  const day = (
    await db.query<any>("select * from public.days where date='2030-01-07'")
  ).rows[0];
  const food = (
    await db.query<any>("select * from public.foods where day_id=$1", [day.id])
  ).rows[0];
  const order = await command("order.save", {
    dayId: day.id,
    memberId: admin,
    items: [{ menuItemId: food.id, quantity: 1, note: "No chili" }],
  });
  await db.query(
    "insert into public.ledger_entries(member_id,amount,kind,note) values($1,100,'adjustment','Private')",
    [admin],
  );
  await actor(employee);
  await db.exec("set role authenticated");
  try {
    const s = (await db.query<any>("select public.snapshot() s")).rows[0].s;
    expect(s.orders.map((o: any) => o.id)).toContain(order.id);
    expect(s.members.map((m: any) => m.id)).not.toContain(admin);
    expect(s.entries).toHaveLength(0);
    expect(s.shared.roster.find((m: any) => m.id === admin)).toEqual({
      id: admin,
      display_name: "admin",
      active: true,
    });
    expect(
      s.shared.actors.find((a: any) => a.orderId === order.id).actorId,
    ).toBe(admin);
    expect(JSON.stringify(s.shared)).not.toContain("admin@rivercrane.vn");
    expect(JSON.stringify(s.shared)).not.toContain("Private");
    await expect(
      command(
        "day.lock",
        { dayId: day.id, locked: true, reason: "unauthorized" },
        day.version,
      ),
    ).rejects.toThrow(/FORBIDDEN/);
    await expect(
      db.query("update public.orders set status='cancelled' where id=$1", [
        order.id,
      ]),
    ).rejects.toThrow(/permission denied/);
  } finally {
    await db.exec("reset role");
  }
});
it("persists own autosave preference and preserves it with legacy profile updates", async () => {
  await actor(employee);
  const initial = (
    await db.query<any>("select * from public.members where id=$1", [employee])
  ).rows[0];
  expect(initial.order_save_mode).toBe("autosave");
  const updated = await command(
    "profile.save",
    { displayName: "Employee", orderSaveMode: "manual", id: admin },
    initial.version,
  );
  expect(updated.order_save_mode).toBe("manual");
  const legacy = await command(
    "profile.save",
    { displayName: "Employee" },
    updated.version,
  );
  expect(legacy.order_save_mode).toBe("manual");
  await expect(
    command(
      "profile.save",
      { displayName: "Employee", orderSaveMode: "wrong" },
      legacy.version,
    ),
  ).rejects.toThrow(/VALIDATION/);
  expect(
    (
      await db.query<any>(
        "select order_save_mode from public.members where id=$1",
        [admin],
      )
    ).rows[0].order_save_mode,
  ).toBe("autosave");
});
it("inactive member cannot access overview", async () => {
  await db.query("update public.members set active=false where id=$1", [
    employee,
  ]);
  await actor(employee);
  await db.exec("set role authenticated");
  try {
    await expect(db.query("select public.snapshot()")).rejects.toThrow(
      /FORBIDDEN/,
    );
    expect((await db.query("select * from public.orders")).rows).toHaveLength(
      0,
    );
  } finally {
    await db.exec("reset role");
    await db.query("update public.members set active=true where id=$1", [
      employee,
    ]);
  }
});
it("recalculates shared bill after each order mutation and preserves settled allocation", async () => {
  await actor(admin);
  const day = (
    await db.query<any>("select * from public.days where date='2030-01-07'")
  ).rows[0];
  const food = (
    await db.query<any>("select * from public.foods where day_id=$1", [day.id])
  ).rows[0];
  const preview = () =>
    db
      .query<any>("select private.bill_preview($1) b", [day.id])
      .then((r) => r.rows[0].b);
  expect((await preview()).total).toBe(35000);
  const config = await command("bill.save", {
    dayId: day.id,
    discountKind: "percent",
    discountValue: 10,
    fee: 1000,
    covered: [],
    sponsors: [],
  });
  expect((await preview()).total).toBe(32500);
  await actor(employee);
  await command("order.save", {
    dayId: day.id,
    memberId: employee,
    items: [{ menuItemId: food.id, quantity: 2, note: "" }],
  });
  let bill = await preview();
  expect(bill.original).toBe(105000);
  expect(bill.total).toBe(95500);
  expect(bill.shares.reduce((s: number, i: any) => s + i.amount, 0)).toBe(
    bill.total,
  );
  await expect(
    command(
      "bill.save",
      {
        dayId: day.id,
        discountKind: "fixed",
        discountValue: 1,
        fee: 0,
        covered: [],
        sponsors: [],
      },
      config.version,
    ),
  ).rejects.toThrow(/FORBIDDEN/);
  await actor(admin);
  const settings = (await db.query<any>("select * from public.settings"))
    .rows[0];
  await command(
    "settings.save",
    { ...settings.data, collectorId: admin },
    settings.version,
  );
  const current = (
    await db.query<any>("select * from public.days where id=$1", [day.id])
  ).rows[0];
  await command(
    "day.lock",
    { dayId: day.id, locked: true, reason: "Settle" },
    current.version,
  );
  await expect(
    command("finance.settle", {
      weekStart: "2030-01-07",
      totals: { [day.id]: 1 },
    }),
  ).rejects.toThrow(/CONFLICT|VALIDATION/);
  const settled = await command("finance.settle", {
    weekStart: "2030-01-07",
    billVersions: { [day.id]: config.version },
  });
  bill = await preview();
  expect(bill.state).toBe("settled");
  expect(bill.total).toBe(95500);
  expect(bill.shares.reduce((s: number, i: any) => s + i.amount, 0)).toBe(
    95500,
  );
  await expect(
    command(
      "bill.save",
      {
        dayId: day.id,
        discountKind: "none",
        discountValue: 0,
        fee: 0,
        covered: [],
        sponsors: [],
      },
      config.version,
    ),
  ).rejects.toThrow(/LOCKED/);
  const stored = (
    await db.query<any>("select snapshot from public.settlements where id=$1", [
      settled.id,
    ])
  ).rows[0].snapshot;
  expect(stored.billDetails[day.id].total).toBe(95500);
});
it("validates bill metadata and caps fixed discount when the original subtotal drops", async () => {
  await actor(admin);
  await command("menu.publish", {
    days: [
      {
        date: "2030-01-14",
        foods: [
          { name: "Cheap", unitPrice: 100 },
          { name: "Free", unitPrice: 0 },
        ],
      },
    ],
  });
  const day = (
    await db.query<any>("select * from public.days where date='2030-01-14'")
  ).rows[0];
  const foods = (
    await db.query<any>(
      "select * from public.foods where day_id=$1 order by unit_price",
      [day.id],
    )
  ).rows;
  let order = await command("order.save", {
    dayId: day.id,
    memberId: employee,
    reason: "Test",
    items: [{ menuItemId: foods[1].id, quantity: 2, note: "" }],
  });
  const payload = {
    dayId: day.id,
    discountKind: "fixed",
    discountValue: 150,
    fee: 0,
    covered: [],
    sponsors: [],
  };
  const cfg = await command("bill.save", payload);
  await expect(
    command("bill.save", { ...payload, fee: -1 }, cfg.version),
  ).rejects.toThrow(/VALIDATION/);
  await expect(
    command(
      "bill.save",
      { ...payload, discountKind: "percent", discountValue: 101 },
      cfg.version,
    ),
  ).rejects.toThrow(/VALIDATION/);
  order = await command(
    "order.save",
    {
      dayId: day.id,
      memberId: employee,
      reason: "Test",
      items: [{ menuItemId: foods[1].id, quantity: 1, note: "" }],
    },
    order.version,
  );
  let b = (await db.query<any>("select private.bill_preview($1) b", [day.id]))
    .rows[0].b;
  expect(b.discount).toBe(100);
  expect(b.total).toBe(0);
  await command(
    "bill.save",
    { ...payload, discountKind: "none", discountValue: 0, fee: 50 },
    cfg.version,
  );
  await command(
    "order.save",
    {
      dayId: day.id,
      memberId: employee,
      reason: "Test",
      items: [{ menuItemId: foods[0].id, quantity: 1, note: "" }],
    },
    order.version,
  );
  b = (await db.query<any>("select private.bill_preview($1) b", [day.id]))
    .rows[0].b;
  expect(b.warnings.length).toBeGreaterThan(0);
  expect(b.shares).toHaveLength(0);
});
it("blocks settlement when a sponsor cancels, rejects duplicate configuration, and redistributes exactly", async () => {
  await actor(admin);
  await command("menu.publish", {
    days: [
      {
        date: "2030-01-21",
        foods: [{ name: "Sponsored meal", unitPrice: 101 }],
      },
    ],
  });
  const day = (
    await db.query<any>("select * from public.days where date='2030-01-21'")
  ).rows[0];
  const food = (
    await db.query<any>("select * from public.foods where day_id=$1", [day.id])
  ).rows[0];
  const sponsor = await command("order.save", {
    dayId: day.id,
    memberId: admin,
    items: [{ menuItemId: food.id, quantity: 1, note: "" }],
  });
  await command("order.save", {
    dayId: day.id,
    memberId: employee,
    reason: "Test",
    items: [{ menuItemId: food.id, quantity: 1, note: "" }],
  });
  const payload = {
    dayId: day.id,
    discountKind: "none",
    discountValue: 0,
    fee: 1,
    covered: [employee],
    sponsors: [admin],
  };
  await expect(
    command("bill.save", { ...payload, sponsors: [admin, admin] }),
  ).rejects.toThrow(/VALIDATION/);
  const cfg = await command("bill.save", payload);
  let b = (await db.query<any>("select private.bill_preview($1) b", [day.id]))
    .rows[0].b;
  expect(b.shares.find((x: any) => x.memberId === admin).amount).toBe(203);
  expect(b.shares.find((x: any) => x.memberId === employee).amount).toBe(0);
  await command("order.cancel", { orderId: sponsor.id }, sponsor.version);
  b = (await db.query<any>("select private.bill_preview($1) b", [day.id]))
    .rows[0].b;
  expect(b.warnings.join(" ")).toMatch(/không còn đơn/);
  expect(b.shares).toHaveLength(0);
  await command(
    "day.lock",
    { dayId: day.id, locked: true, reason: "Test" },
    day.version,
  );
  await expect(
    command("finance.settle", {
      weekStart: "2030-01-21",
      billVersions: { [day.id]: cfg.version },
    }),
  ).rejects.toThrow(/VALIDATION/);
});
it("queues public bill metadata for Chat without exposing private finance data", async () => {
  await actor(admin);
  const destination = (
    await db.query<any>(
      "insert into public.destinations(name,active) values('Fixture only',true) returning id",
    )
  ).rows[0].id;
  await db.query(
    "insert into private.destination_secrets(id,ciphertext) values($1,'fixture-ciphertext')",
    [destination],
  );
  const day = (
    await db.query<any>("select * from public.days where date='2030-01-14'")
  ).rows[0];
  const current = (
    await db.query<any>("select * from public.daily_bills where day_id=$1", [
      day.id,
    ])
  ).rows[0];
  await command(
    "bill.save",
    {
      dayId: day.id,
      discountKind: "percent",
      discountValue: 10,
      fee: 1000,
      covered: [],
      sponsors: [],
    },
    current.version,
  );
  const delivery = (
    await db.query<any>(
      "select payload from private.deliveries where kind='bill.save' limit 1",
    )
  ).rows[0].payload;
  expect(delivery.after.discount_kind).toBe("percent");
  expect(delivery.after.fee).toBe(1000);
  expect(delivery.date).toBe("2030-01-14");
});
