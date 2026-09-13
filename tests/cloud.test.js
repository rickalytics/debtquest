import { beforeEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({
  responses: [],
  calls: [],
  session: { user: { id: "alice" } },
  functionResponse: { data: { deleted: true }, error: null },
}));
vi.mock("../src/supabaseClient.js", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: mock.session } }),
      signOut: vi.fn(async () => ({ error: null })),
    },
    functions: { invoke: vi.fn(async () => mock.functionResponse) },
    from(table) {
      const call = { table, eq: [] };
      mock.calls.push(call);
      return {
        select(columns) {
          call.select = columns;
          return this;
        },
        eq(k, v) {
          call.eq.push([k, v]);
          return this;
        },
        insert(row) {
          call.insert = row;
          return this;
        },
        update(row) {
          call.update = row;
          return this;
        },
        maybeSingle: async () => mock.responses.shift(),
      };
    },
  },
}));
let api;
beforeEach(async () => {
  vi.resetModules();
  mock.responses = [];
  mock.calls = [];
  mock.session = { user: { id: "alice" } };
  api = await import("../src/db.js");
});
it("does not create or overwrite records after a failed load", async () => {
  mock.responses.push({ error: new Error("offline") });
  await expect(api.loadAllData()).rejects.toThrow("offline");
  await expect(api.saveAllData({ accounts: [], payments: [] })).rejects.toThrow(
    /Reload/,
  );
  expect(mock.calls.every((c) => !c.insert && !c.update)).toBe(true);
});
it("rejects stale writes using the server timestamp", async () => {
  mock.responses.push({
    data: { payload: {}, updated_at: "2026-09-13T10:00:00Z" },
    error: null,
  });
  const d = await api.loadAllData();
  mock.responses.push({ data: null, error: null });
  await expect(api.saveAllData(d)).rejects.toThrow(/another device/);
  expect(mock.calls[1].eq).toContainEqual([
    "updated_at",
    "2026-09-13T10:00:00Z",
  ]);
});
it("creates a fresh account without silently uploading local PWA records", async () => {
  mock.responses.push({ data: null, error: null });
  const d = await api.loadAllData();
  expect(d.accounts).toEqual([]);
  expect(d.rewards.length).toBeGreaterThan(0);
  expect(mock.calls).toHaveLength(1);
  mock.responses.push({
    data: { updated_at: "2026-09-13T11:00:00Z" },
    error: null,
  });
  await api.saveAllData(d);
  expect(mock.calls[1].insert.user_id).toBe("alice");
});
it("cannot save signed-out data", async () => {
  mock.session = null;
  await expect(api.saveAllData({})).rejects.toThrow("Not signed in");
});
it("leaves an account signed in when deletion is rejected", async () => {
  mock.functionResponse = { data: null, error: new Error("unauthorized") };
  await expect(api.deleteCloudAccount("wrong")).rejects.toThrow(
    /could not be deleted/,
  );
});
