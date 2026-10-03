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
it("rejects untrusted company identity", async () => {
  await expect(
    db.query(
      "insert into auth.users values(gen_random_uuid(),'x@rivercrane.vn.evil.test',now(),'{\"provider\":\"google\"}')",
    ),
  ).rejects.toThrow();
});
it("rejects employee settings changes", async () => {
  await actor(employee);
  await expect(command("settings.save", { defaultPrice: 1 })).rejects.toThrow(
    /FORBIDDEN/,
  );
});
it("publishes without destroying orders, enforces ownership and lock, idempotency and audit", async () => {
  await actor(admin);
  await command("menu.publish", {
    days: [
      { date: "2026-10-06", foods: [{ name: "Cơm gà", unitPrice: 35000 }] },
    ],
    notifyChat: false,
  });
  const day = (await db.query<any>("select * from public.days")).rows[0];
  const food = (await db.query<any>("select * from public.foods")).rows[0];
  await actor(employee);
  const payload = {
    dayId: day.id,
    memberId: employee,
    items: [{ menuItemId: food.id, quantity: 1, note: "Ít cơm" }],
  };
  const request = crypto.randomUUID();
  const order = await command("order.save", payload, 0, request);
  expect(order.items[0].unitPrice).toBe(35000);
  expect((await command("order.save", payload, 0, request)).id).toBe(order.id);
  await expect(
    command("order.save", { ...payload, memberId: admin }),
  ).rejects.toThrow(/VALIDATION/);
  await expect(command("order.save", payload, 0)).rejects.toThrow(/CONFLICT/);
  await actor(admin);
  await command(
    "day.lock",
    { dayId: day.id, locked: true, reason: "Chốt" },
    day.version,
  );
  await expect(
    command(
      "order.save",
      { ...payload, reason: "Điều phối chỉnh hộ" },
      order.version,
    ),
  ).rejects.toThrow(/LOCKED/);
  expect(
    Number(
      (
        await db.query<any>(
          "select count(*) n from public.audit_events where kind='order.save'",
        )
      ).rows[0].n,
    ),
  ).toBe(1);
});
it("old JWT cannot read after disabling membership", async () => {
  await db.query("update public.members set active=false where id=$1", [
    employee,
  ]);
  await actor(employee);
  await db.exec("set role authenticated");
  const r = await db.query("select * from public.orders");
  expect(r.rows).toHaveLength(0);
  await db.exec("reset role");
  await db.query("update public.members set active=true where id=$1", [
    employee,
  ]);
});
it("employee cannot bypass commands with direct writes", async () => {
  await actor(employee);
  await db.exec("set role authenticated");
  await expect(
    db.query("update public.members set role='admin' where id=$1", [employee]),
  ).rejects.toThrow();
  await db.exec("reset role");
});
it("does not subtract reported payment until confirmed once", async () => {
  await actor(employee);
  const report = await command("payment.report", {
    amount: 35000,
    reference: "PAY-001",
  });
  expect(
    (await db.query("select * from public.ledger_entries")).rows,
  ).toHaveLength(0);
  await actor(admin);
  await command("payment.confirm", { paymentId: report.id }, report.version);
  await expect(
    command("payment.confirm", { paymentId: report.id }, report.version),
  ).rejects.toThrow(/CONFLICT/);
  expect(
    (
      await db.query<any>(
        "select sum(amount) amount from public.ledger_entries",
      )
    ).rows[0].amount,
  ).toBe("-35000");
});
it("protects final admin and audits secret changes without retaining ciphertext", async () => {
  await actor(admin);
  await expect(
    command(
      "member.update",
      { id: admin, role: "employee", active: true, canManageFinance: false },
      1,
    ),
  ).rejects.toThrow(/last administrator/);
  await command("destination.save", {
    name: "Nhóm cơm",
    active: true,
    ciphertext: "cipher-private",
  });
  const a = (
    await db.query<any>(
      "select * from public.audit_events where kind='destination.save'",
    )
  ).rows[0];
  expect(JSON.stringify(a)).not.toContain("cipher-private");
});
it("claims delivery with lease and exposes only redacted status", async () => {
  await actor(employee);
  await command("payment.report", { amount: 1, reference: "PAY-002" });
  const claim = (await db.query<any>("select public.claim_deliveries() result"))
    .rows[0].result;
  expect(claim.length).toBeGreaterThan(0);
  expect(
    (await db.query<any>("select public.claim_deliveries() result")).rows[0]
      .result,
  ).toHaveLength(0);
  await actor(admin);
  await db.exec("set role authenticated");
  const status = (await db.query<any>("select public.delivery_status() result"))
    .rows[0].result;
  expect(JSON.stringify(status)).not.toContain("cipher-private");
  await db.exec("reset role");
});
it("rejects absent provider and incomplete settings", async () => {
  await expect(
    db.query(
      "insert into auth.users values(gen_random_uuid(),'missing@rivercrane.vn',now(),'{}')",
    ),
  ).rejects.toThrow(/FORBIDDEN/);
  await actor(admin);
  await expect(command("settings.save", {}, 1)).rejects.toThrow(/VALIDATION/);
});
it("rejects duplicate sponsorship and fractional payment before creating ledger data", async () => {
  await actor(employee);
  await expect(
    command("payment.report", { amount: 1.5, reference: "fraction" }),
  ).rejects.toThrow(/VALIDATION/);
  await actor(admin);
  const cfg = (await db.query<any>("select * from public.settings")).rows[0];
  await command(
    "settings.save",
    { ...cfg.data, collectorId: admin },
    cfg.version,
  );
  const day = (await db.query<any>("select * from public.days")).rows[0];
  await expect(
    command("finance.settle", {
      weekStart: "2026-10-05",
      totals: { [day.id]: 35000 },
      covered: { [day.id]: [employee, employee] },
      sponsors: { [day.id]: [admin] },
    }),
  ).rejects.toThrow(/VALIDATION/);
});
it("republication does not duplicate active menu names", async () => {
  await actor(admin);
  const day = (await db.query<any>("select * from public.days")).rows[0];
  await command(
    "day.lock",
    { dayId: day.id, locked: false, reason: "Thử menu" },
    day.version,
  );
  await command("menu.publish", {
    days: [{ date: day.date, foods: [{ name: "Cơm gà", unitPrice: 36000 }] }],
    notifyChat: false,
  });
  const foods = (await db.query<any>("select * from public.foods where active"))
    .rows;
  expect(foods.filter((f) => f.name === "Cơm gà")).toHaveLength(1);
  const order = (await db.query<any>("select * from public.orders")).rows[0];
  expect(order.items[0].unitPrice).toBe(35000);
});
it("stores menu drafts without publishing or notifying", async () => {
  await actor(admin);
  const before = Number(
    (await db.query<any>("select count(*) n from public.menu_versions")).rows[0]
      .n,
  );
  const draft = await command("menu.draft.save", {
    weekStart: "2026-10-05",
    days: [
      { date: "2026-10-06", foods: [{ name: "Món nháp", unitPrice: 35000 }] },
    ],
  });
  expect(draft.id).toBeTruthy();
  expect(
    Number(
      (await db.query<any>("select count(*) n from public.menu_versions"))
        .rows[0].n,
    ),
  ).toBe(before);
  expect(
    (
      await db.query<any>(
        "select * from private.deliveries where kind='menu.draft.save'",
      )
    ).rows,
  ).toHaveLength(0);
});
it("creates a legacy member then binds verified login without changing member id", async () => {
  await actor(admin);
  const legacy = await command("member.legacy", {
    displayName: "Legacy test",
    email: "legacy@rivercrane.vn",
  });
  const uid = "33333333-3333-4333-8333-333333333333";
  await db.query(
    "insert into auth.users values($1,'legacy@rivercrane.vn',now(),'{\"provider\":\"google\"}')",
    [uid],
  );
  await actor(uid);
  await db.exec("set role authenticated");
  const snapshot = (await db.query<any>("select public.snapshot() data"))
    .rows[0].data;
  expect(snapshot.member.id).toBe(legacy.id);
  expect(snapshot.member.auth_user_id).toBe(uid);
  await db.exec("reset role");
});
it("applies opening balances once and refuses rollback after later activity", async () => {
  await actor(admin);
  const fresh = await command("member.legacy", {
    displayName: "Import member",
    email: "",
  });
  const importedMember = fresh.id;
  const batch = crypto.randomUUID();
  const result = await command("import.apply", {
    batchId: batch,
    fingerprint: "fixture-1",
    weekStart: "2026-09-28",
    balances: [{ memberId: importedMember, amount: 12345 }],
    reconciled: true,
  });
  expect(result.applied).toBe(true);
  await expect(
    command("import.apply", {
      batchId: batch,
      fingerprint: "fixture-1",
      weekStart: "2026-09-28",
      balances: [{ memberId: importedMember, amount: 12345 }],
      reconciled: true,
    }),
  ).rejects.toThrow(/CONFLICT/);
  await command("finance.adjust", {
    memberId: importedMember,
    amount: 1,
    note: "later",
  });
  await expect(
    command("import.rollback", { batchId: batch, reason: "test" }),
  ).rejects.toThrow(/CONFLICT/);
});
it("settles integer VND exactly and reverses only meal charges on reopen", async () => {
  await actor(admin);
  await command("menu.publish", {
    days: [
      {
        date: "2026-10-13",
        foods: [{ name: "Test finance", unitPrice: 35000 }],
      },
    ],
    notifyChat: false,
  });
  const day = (
    await db.query<any>("select * from public.days where date='2026-10-13'")
  ).rows[0];
  const food = (
    await db.query<any>("select * from public.foods where day_id=$1", [day.id])
  ).rows[0];
  await command("order.save", {
    dayId: day.id,
    memberId: admin,
    items: [{ menuItemId: food.id, quantity: 1, note: "" }],
  });
  await actor(employee);
  await command("order.save", {
    dayId: day.id,
    memberId: employee,
    items: [{ menuItemId: food.id, quantity: 1, note: "" }],
  });
  await actor(admin);
  await command(
    "day.lock",
    { dayId: day.id, locked: true, reason: "settle" },
    day.version,
  );
  const collector = (
    await db.query<any>(
      "select * from public.members where display_name='Import member'",
    )
  ).rows[0];
  const cfg = (await db.query<any>("select * from public.settings")).rows[0];
  await command(
    "settings.save",
    { ...cfg.data, collectorId: collector.id },
    cfg.version,
  );
  const result = await command("finance.settle", {
    weekStart: "2026-10-12",
    totals: { [day.id]: 70001 },
    covered: {},
    sponsors: {},
  });
  const total = (
    await db.query<any>(
      "select sum(amount) n from public.ledger_entries where settlement_id=$1",
      [result.id],
    )
  ).rows[0];
  expect(total.n).toBe("70001");
  await command("finance.reopen", {
    weekStart: "2026-10-12",
    reason: "test reopen",
  });
  expect(
    (
      await db.query<any>(
        "select sum(amount) n from public.ledger_entries where settlement_id=$1",
        [result.id],
      )
    ).rows[0].n,
  ).toBe("0");
  await expect(
    command("finance.reopen", { weekStart: "2026-10-12", reason: "repeat" }),
  ).rejects.toThrow(/CONFLICT/);
});
it("authenticated callers can execute snapshot and commands through public wrappers", async () => {
  await actor(employee);
  await db.exec("set role authenticated");
  const s = (await db.query<any>("select public.snapshot() s")).rows[0].s;
  expect(s.member.id).toBe(employee);
  expect(s.members.map((m: any) => m.id)).toEqual([employee]);
  expect(s.entries.every((e: any) => e.member_id === employee)).toBe(true);
  expect(s.payments.every((p: any) => p.member_id === employee)).toBe(true);
  await command(
    "profile.save",
    { displayName: "Updated employee" },
    s.member.version,
  );
  await db.exec("reset role");
});
it("rejects missing order items and preserves proxy change reasons", async () => {
  await actor(admin);
  await command("menu.publish", {
    days: [{ date: "2027-03-01", foods: [{ name: "Rice", unitPrice: 100 }] }],
    notifyChat: false,
  });
  const day = (
    await db.query<any>("select * from public.days where date='2027-03-01'")
  ).rows[0];
  const food = (
    await db.query<any>("select * from public.foods where day_id=$1", [day.id])
  ).rows[0];
  await expect(
    command("order.save", {
      dayId: day.id,
      memberId: employee,
      reason: "requested",
    }),
  ).rejects.toThrow(/VALIDATION/);
  const result = await command("order.save", {
    dayId: day.id,
    memberId: employee,
    reason: "requested",
    items: [{ menuItemId: food.id, quantity: 1 }],
  });
  const log = (
    await db.query<any>(
      "select after from public.audit_events where entity_id=$1",
      [result.id],
    )
  ).rows[0];
  expect(log.after.reason).toBe("requested");
});
it("finance delegate sees all members and orders under authenticated RLS", async () => {
  await db.query(
    "update public.members set can_manage_finance=true where id=$1",
    [employee],
  );
  await actor(employee);
  await db.exec("set role authenticated");
  try {
    const r = (await db.query<any>("select public.snapshot() s")).rows[0].s;
    expect(r.members.some((m: any) => m.id === admin)).toBe(true);
  } finally {
    await db.exec("reset role");
    await db.query(
      "update public.members set can_manage_finance=false where id=$1",
      [employee],
    );
  }
});
it("rolls back imported history and accepts a corrected replacement without double debt", async () => {
  await actor(admin);
  const legacy = await command("member.legacy", {
    displayName: "Import rollback fixture",
  });
  const payload = {
    batchId: crypto.randomUUID(),
    fingerprint: "rollback-fixture",
    reconciled: true,
    weekStart: "2027-04-05",
    balances: [{ memberId: legacy.id, amount: 500 }],
    days: [
      {
        date: "2027-04-05",
        orders: [
          {
            memberId: legacy.id,
            items: [{ name: "Rice", quantity: 1, unitPrice: 500 }],
          },
        ],
      },
    ],
  };
  await command("import.apply", payload);
  await command("import.rollback", {
    batchId: payload.batchId,
    reason: "Correct source",
  });
  expect(
    (await db.query<any>("select * from public.days where date='2027-04-05'"))
      .rows,
  ).toHaveLength(0);
  await command("import.apply", {
    ...payload,
    batchId: crypto.randomUUID(),
    balances: [{ memberId: legacy.id, amount: 600 }],
  });
  expect(
    Number(
      (
        await db.query<any>(
          "select sum(amount) total from public.ledger_entries where member_id=$1",
          [legacy.id],
        )
      ).rows[0].total,
    ),
  ).toBe(600);
  await expect(
    db.query("select public.command($1,$2,null,$3)", [
      "profile.save",
      { displayName: "Invalid" },
      crypto.randomUUID(),
    ]),
  ).rejects.toThrow(/VALIDATION/);
});
it("does not treat adjustment notes as import provenance", async () => {
  await actor(admin);
  const legacy = await command("member.legacy", {
    displayName: "Provenance fixture",
  });
  const batchId = crypto.randomUUID();
  await command("import.apply", {
    batchId,
    fingerprint: "provenance-fixture",
    reconciled: true,
    weekStart: "2027-06-07",
    balances: [{ memberId: legacy.id, amount: 500 }],
  });
  await command("finance.adjust", {
    memberId: legacy.id,
    amount: 100,
    note: "Import " + batchId,
  });
  await expect(
    command("import.rollback", { batchId, reason: "Wrong import" }),
  ).rejects.toThrow(/CONFLICT/);
});
it("defers membership until Google signup confirms email in its follow-up update", async () => {
  const id = crypto.randomUUID();
  await db.query(
    "insert into auth.users values($1,'oauth-flow@rivercrane.vn',null,'{\"provider\":\"google\"}')",
    [id],
  );
  expect(
    (
      await db.query("select id from public.members where auth_user_id=$1", [
        id,
      ])
    ).rows,
  ).toHaveLength(0);
  await db.query("update auth.users set email_confirmed_at=now() where id=$1", [
    id,
  ]);
  expect(
    (
      await db.query("select id from public.members where auth_user_id=$1", [
        id,
      ])
    ).rows,
  ).toHaveLength(1);
});
it("lets employees place, change and cancel proxy orders with reasons until manual lock", async () => {
  await actor(admin);
  await command("menu.publish", {
    days: [
      { date: "2025-01-06", foods: [{ name: "Proxy rice", unitPrice: 35000 }] },
    ],
    notifyChat: false,
  });
  const day = (
    await db.query<any>("select * from public.days where date='2025-01-06'")
  ).rows[0];
  const food = (
    await db.query<any>("select * from public.foods where day_id=$1", [day.id])
  ).rows[0];
  await actor(employee);
  await db.exec("set role authenticated");
  try {
    const snapshot = (await db.query<any>("select public.snapshot() s")).rows[0]
      .s;
    expect(snapshot.members.some((m: any) => m.id === admin)).toBe(false);
    const recipients = (
      await db.query<any>("select public.proxy_recipients() r")
    ).rows[0].r;
    expect(recipients.some((m: any) => m.id === admin)).toBe(true);
    expect(Object.keys(recipients[0]).sort()).toEqual(["display_name", "id"]);
    const payload = {
      dayId: day.id,
      memberId: admin,
      reason: "Colleague asked",
      items: [{ menuItemId: food.id, quantity: 2, note: "No chili" }],
    };
    await expect(
      command("order.save", { ...payload, reason: "   " }),
    ).rejects.toThrow(/VALIDATION/);
    const saved = await command("order.save", payload);
    const changed = await command(
      "order.save",
      { ...payload, items: [{ menuItemId: food.id, quantity: 3 }] },
      saved.version,
    );
    const logs = (
      await db.query<any>(
        "select * from public.audit_events where entity_id=$1 order by created_at",
        [saved.id],
      )
    ).rows;
    expect(logs.at(-1)).toMatchObject({
      actor_id: employee,
      subject_id: admin,
      after_cutoff: true,
    });
    expect(logs.at(-1).after.reason).toBe("Colleague asked");
    expect(
      (
        await db.query("select id from public.orders where member_id=$1", [
          admin,
        ])
      ).rows.length,
    ).toBe(0);
    expect(
      (
        await db.query<any>("select public.proxy_order($1,$2) o", [
          day.id,
          admin,
        ])
      ).rows[0].o.id,
    ).toBe(saved.id);
    await expect(command("order.save", payload, saved.version)).rejects.toThrow(
      /CONFLICT/,
    );
    await command(
      "order.cancel",
      { orderId: saved.id, reason: "Colleague cancelled" },
      changed.version,
    );
  } finally {
    await db.exec("reset role");
  }
  await actor(admin);
  await command(
    "day.lock",
    { dayId: day.id, locked: true, reason: "Supplier final" },
    day.version,
  );
  await actor(employee);
  await expect(
    command(
      "order.save",
      {
        dayId: day.id,
        memberId: admin,
        reason: "Colleague asked",
        items: [{ menuItemId: food.id, quantity: 1 }],
      },
      3,
    ),
  ).rejects.toThrow(/LOCKED/);
});
