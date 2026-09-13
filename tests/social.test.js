import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
let db;
const alice = "10000000-0000-4000-8000-000000000001",
  bob = "10000000-0000-4000-8000-000000000002",
  eve = "10000000-0000-4000-8000-000000000003";
async function as(user, fn) {
  await db.exec(
    `reset role; set request.jwt.claim.sub='${user || ""}'; set role ${user ? "authenticated" : "anon"};`,
  );
  return fn();
}
async function call(name, args = []) {
  const r = await db.query(
    `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
    args,
  );
  return r.rows[0].result;
}
async function admin(sql, args = []) {
  await db.exec("reset role");
  return db.query(sql, args);
}
let circle, token, event;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  await db.exec(await readFile("supabase/schema.sql", "utf8"));
  await db.exec(
    "grant select,insert,update on public.debtquest_data to authenticated",
  );
  await db.exec(
    await readFile(
      "supabase/migrations/202609130001_private_circles.sql",
      "utf8",
    ),
  );
  await db.query("insert into auth.users(id) values($1),($2),($3)", [
    alice,
    bob,
    eve,
  ]);
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("private circles with real Postgres permissions", () => {
  it("creates an invite-only circle and stores only a hashed invitation", async () => {
    circle = await as(alice, () =>
      call("dq_create_circle", ["Our next chapter", "couple", "Alice"]),
    );
    const invite = await as(alice, () => call("dq_create_invite", [circle]));
    token = invite.token;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const rows = await admin("select * from public.dq_invites");
    expect(JSON.stringify(rows.rows)).not.toContain(token);
    expect(await as(bob, () => call("dq_join_circle", [token, "Bob"]))).toBe(
      circle,
    );
  });
  it("enforces circle capacity and prevents anonymous access", async () => {
    await expect(
      as(eve, () => call("dq_join_circle", [token, "Eve"])),
    ).rejects.toThrow("full");
    await expect(as(null, () => call("dq_get_social"))).rejects.toThrow(
      "permission denied",
    );
  });
  it("does not let a stranger read the circle or create invitations", async () => {
    const social = await as(eve, () => call("dq_get_social"));
    expect(social.circles).toEqual([]);
    await expect(
      as(eve, () => call("dq_create_invite", [circle])),
    ).rejects.toThrow("not available");
  });
  it("protects every direct social table and internal helper", async () => {
    for (const table of [
      "dq_profiles",
      "dq_circles",
      "dq_members",
      "dq_invites",
      "dq_events",
      "dq_reactions",
      "dq_reports",
      "dq_blocks",
      "dq_name_filters",
    ])
      await expect(
        as(alice, () => db.query(`select * from public.${table}`)),
      ).rejects.toThrow("permission denied");
    await expect(as(eve, () => call("dq_set_name", ["Eve"]))).rejects.toThrow(
      "permission denied",
    );
  });
  it("derives a shared payment from the caller’s private tracker without leaking its name, notes, or balances", async () => {
    const payload = {
      accounts: [
        {
          name: "Private medical debt",
          originalBalance: 1000,
          currentBalance: 750,
        },
      ],
      payments: [
        { id: "payment-alice", amountPaid: 250, note: "Private treatment" },
      ],
      journey: { checkins: [new Date().toISOString().slice(0, 10)] },
    };
    await as(alice, () =>
      db.query(
        "insert into public.debtquest_data(user_id,payload) values($1,$2)",
        [alice, payload],
      ),
    );
    event = await as(alice, () =>
      call("dq_post_win", [circle, "payment", "payment-alice", false]),
    );
    const social = await as(bob, () => call("dq_get_social"));
    const shared = social.events.find((e) => e.id === event);
    expect(shared.progress).toBe(25);
    expect(shared.amount).toBeNull();
    expect(JSON.stringify(social)).not.toMatch(
      /medical|treatment|originalBalance|currentBalance|750/,
    );
    expect(
      (await as(bob, () => db.query("select * from public.debtquest_data")))
        .rows,
    ).toEqual([]);
  });
  it("requires membership and a saved payment, and keeps repeated shares idempotent", async () => {
    await expect(
      as(eve, () =>
        call("dq_post_win", [circle, "payment", "payment-alice", true]),
      ),
    ).rejects.toThrow("not available");
    await expect(
      as(bob, () =>
        call("dq_post_win", [circle, "payment", "payment-alice", true]),
      ),
    ).rejects.toThrow("Save your private");
    expect(
      await as(alice, () =>
        call("dq_post_win", [circle, "payment", "payment-alice", true]),
      ),
    ).toBe(event);
    const s = await as(bob, () => call("dq_get_social"));
    expect(s.events.filter((e) => e.id === event)).toHaveLength(1);
    expect(s.events.find((e) => e.id === event).amount).toBeNull();
  });
  it("publishes amounts only on a newly and explicitly shared payment", async () => {
    await admin(
      `update public.debtquest_data set payload=jsonb_set(payload,'{payments}',payload->'payments'||'[{"id":"payment-two","amountPaid":50}]'::jsonb) where user_id=$1`,
      [alice],
    );
    const id = await as(alice, () =>
      call("dq_post_win", [circle, "payment", "payment-two", true]),
    );
    expect(
      (await as(bob, () => call("dq_get_social"))).events.find(
        (e) => e.id === id,
      ).amount,
    ).toBe(50);
  });
  it("makes daily check-ins idempotent and allows one reaction per person", async () => {
    const one = await as(alice, () =>
      call("dq_post_win", [circle, "checkin", null, false]),
    );
    const two = await as(alice, () =>
      call("dq_post_win", [circle, "checkin", null, false]),
    );
    expect(two).toBe(one);
    await as(bob, () => call("dq_cheer", [event, "clap"]));
    await as(bob, () => call("dq_cheer", [event, "heart"]));
    let s = await as(alice, () => call("dq_get_social"));
    expect(s.events.find((e) => e.id === event).reactions).toEqual([
      { userId: bob, emoji: "heart" },
    ]);
    await as(bob, () => call("dq_cheer", [event, "heart"]));
    s = await as(alice, () => call("dq_get_social"));
    expect(s.events.find((e) => e.id === event).reactions).toEqual([]);
    await expect(
      as(alice, () => call("dq_cheer", [event, "clap"])),
    ).rejects.toThrow("not available");
  });
  it("queues a private report and blocks activity in both directions", async () => {
    await as(bob, () => call("dq_report_event", [event, "privacy"]));
    expect(
      (await admin("select category,status from public.dq_reports")).rows,
    ).toEqual([{ category: "privacy", status: "open" }]);
    await as(bob, () => call("dq_block_member", [alice]));
    const a = await as(alice, () => call("dq_get_social")),
      b = await as(bob, () => call("dq_get_social"));
    expect(a.members.some((m) => m.userId === bob)).toBe(false);
    expect(b.events.some((e) => e.userId === alice)).toBe(false);
    await expect(
      as(bob, () => call("dq_cheer", [event, "clap"])),
    ).rejects.toThrow("not available");
    await as(bob, () => call("dq_unblock_member", [alice]));
    expect(
      (await as(bob, () => call("dq_get_social"))).events.some(
        (e) => e.userId === alice,
      ),
    ).toBe(true);
  });
  it("filters display names and rejects arbitrary circle content", async () => {
    await expect(
      as(eve, () =>
        call("dq_create_circle", ["Buy my product", "friends", "Eve"]),
      ),
    ).rejects.toThrow("Choose a circle");
    await expect(
      as(eve, () =>
        call("dq_create_circle", [
          "Team fresh start",
          "friends",
          "https://spam.test",
        ]),
      ),
    ).rejects.toThrow("first name");
  });
  it("reports a member without posts and updates a display name without exposing private data", async () => {
    await as(bob, () => call("dq_report_member", [alice, "harassment"]));
    expect(
      (
        await admin(
          "select count(*)::int as total from public.dq_reports where member_report",
        )
      ).rows[0].total,
    ).toBe(1);
    await expect(
      as(eve, () => call("dq_report_member", [alice, "privacy"])),
    ).rejects.toThrow("not in your circles");
    await as(alice, () => call("dq_update_display_name", ["Allie"]));
    expect(
      (await as(bob, () => call("dq_get_social"))).members.find(
        (m) => m.userId === alice,
      ).name,
    ).toBe("Allie");
  });
  it("lets an operator suspend social access and hides suspended activity", async () => {
    await admin(
      "update public.dq_profiles set suspended=true where user_id=$1",
      [alice],
    );
    await expect(as(alice, () => call("dq_get_social"))).rejects.toThrow(
      "paused",
    );
    expect(
      (await as(bob, () => call("dq_get_social"))).events.some(
        (e) => e.userId === alice,
      ),
    ).toBe(false);
    await admin(
      "update public.dq_profiles set suspended=false where user_id=$1",
      [alice],
    );
  });
  it("revokes invitation links and expires them server-side", async () => {
    await as(alice, () => call("dq_revoke_invites", [circle]));
    await expect(
      as(eve, () => call("dq_join_circle", [token, "Eve"])),
    ).rejects.toThrow("invalid or expired");
    const invite = await as(alice, () => call("dq_create_invite", [circle]));
    await admin(
      "update public.dq_invites set expires_at=now()-interval '1 day'",
    );
    await expect(
      as(eve, () => call("dq_join_circle", [invite.token, "Eve"])),
    ).rejects.toThrow("invalid or expired");
  });
  it("clears only the caller’s activity, transfers ownership on leave, and cascades account deletion", async () => {
    await as(alice, () => call("dq_clear_activity", [circle]));
    let s = await as(bob, () => call("dq_get_social"));
    expect(s.events.some((e) => e.userId === alice)).toBe(false);
    expect(s.events.some((e) => e.userId === bob)).toBe(true);
    await as(alice, () => call("dq_leave_circle", [circle]));
    s = await as(bob, () => call("dq_get_social"));
    expect(s.circles[0].ownerId).toBe(bob);
    expect(s.members).toHaveLength(1);
    await admin("delete from auth.users where id=$1", [bob]);
    expect((await admin("select * from public.dq_circles")).rows).toEqual([]);
    expect((await admin("select * from public.dq_events")).rows).toEqual([]);
  });
});
