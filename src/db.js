import Dexie from "dexie";
import { REWARDS } from "./lib/journey.js";
import { validateData } from "./backup.js";
import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const db = new Dexie("DebtQuestDB");

db.version(1).stores({
  appState: "id",
  accounts: "id, type, isPaidOff, createdAt",
  payments: "id, accountId, paymentDate",
  rewards: "id",
  redeemedRewards: "id, date",
});

export const DEFAULT_REWARDS = REWARDS;

export const DEFAULT_STATE = {
  id: "main",
  xp: 0,
  streak: 0,
  lastPaymentMonth: null,
  achievements: [],
  profile: { name1: "Player 1", name2: "Player 2" },
};

export { isSupabaseConfigured };

function mergeLoaded(state, accounts, payments, rewards, redeemedRewards) {
  return {
    ...(state || DEFAULT_STATE),
    accounts: accounts || [],
    payments: payments || [],
    rewards: rewards || [],
    redeemedRewards: redeemedRewards || [],
  };
}

async function initDexie() {
  const state = await db.appState.get("main");
  if (!state) {
    await db.appState.put(DEFAULT_STATE);
    await db.rewards.bulkPut(DEFAULT_REWARDS);
  }
}

async function loadDexieMerged() {
  const [state, accounts, payments, rewards, redeemedRewards] =
    await Promise.all([
      db.appState.get("main"),
      db.accounts.toArray(),
      db.payments.toArray(),
      db.rewards.toArray(),
      db.redeemedRewards.toArray(),
    ]);
  return mergeLoaded(state, accounts, payments, rewards, redeemedRewards);
}

async function saveDexie(data) {
  const { accounts, payments, rewards, redeemedRewards, ...state } = data;
  state.id = "main";
  await db.transaction(
    "rw",
    db.appState,
    db.accounts,
    db.payments,
    db.rewards,
    db.redeemedRewards,
    async () => {
      await db.appState.put(state);
      await db.accounts.clear();
      if (accounts?.length) await db.accounts.bulkPut(accounts);
      await db.payments.clear();
      if (payments?.length) await db.payments.bulkPut(payments);
      await db.rewards.clear();
      if (rewards?.length) await db.rewards.bulkPut(rewards);
      await db.redeemedRewards.clear();
      if (redeemedRewards?.length)
        await db.redeemedRewards.bulkPut(redeemedRewards);
    },
  );
}

// Remember the exact server version read by this session. Conditional updates
// prevent an older phone/desktop session from silently replacing newer data.
const cloudVersions = new Map();

async function loadCloud(userId) {
  const { data: row, error } = await supabase
    .from("debtquest_data")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const payload = row?.payload;
  const loaded =
    payload && Object.keys(payload).length
      ? validateData(payload)
      : mergeLoaded(DEFAULT_STATE, [], [], DEFAULT_REWARDS, []);
  cloudVersions.set(userId, row ? row.updated_at : null);
  // Local data moves only via an explicit backup import, never on account login.
  return loaded;
}

async function saveCloud(userId, data) {
  if (!cloudVersions.has(userId))
    throw new Error("Reload your account before saving.");
  const previous = cloudVersions.get(userId);
  const updatedAt = new Date(
    Math.max(Date.now(), (Date.parse(previous) || 0) + 1),
  ).toISOString();
  const payload = { ...data };
  delete payload.id;
  const row = { user_id: userId, payload, updated_at: updatedAt };
  const query =
    previous === null
      ? supabase.from("debtquest_data").insert(row)
      : supabase
          .from("debtquest_data")
          .update(row)
          .eq("user_id", userId)
          .eq("updated_at", previous);
  const { data: saved, error } = await query.select("updated_at").maybeSingle();
  if (error?.code === "23505" || (!error && !saved)) {
    throw new Error(
      "Your data changed on another device. Reload to get the latest version, then try your change again.",
    );
  }
  if (error) throw error;
  cloudVersions.set(userId, saved.updated_at);
}

/** IndexedDB only — no-op when using Supabase-only mode. */
export async function initDB() {
  if (!isSupabaseConfigured) await initDexie();
}

export async function loadAllData() {
  if (!isSupabaseConfigured) {
    await initDexie();
    return validateData(await loadDexieMerged());
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not signed in");
  return loadCloud(session.user.id);
}

export async function saveAllData(data, expectedUserId) {
  if (!isSupabaseConfigured) {
    await saveDexie(data);
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Not signed in");
  if (expectedUserId && session.user.id !== expectedUserId)
    throw new Error("Your account changed. Reload before saving.");
  await saveCloud(session.user.id, data);
}

export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email, password) {
  if (!supabase) throw new Error("Supabase not configured");
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  cloudVersions.clear();
}

export async function deleteCloudAccount(password) {
  if (!supabase) throw new Error("Cloud account is not configured.");
  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: { password },
  });
  if (error || !data?.deleted)
    throw new Error(
      "Account could not be deleted. Check your password and connection, then try again.",
    );
  cloudVersions.clear();
  await supabase.auth.signOut({ scope: "local" });
}

export default db;
