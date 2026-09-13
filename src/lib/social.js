import { supabase, isSupabaseConfigured } from "../supabaseClient.js";
import { isDemo } from "./demo.js";
import { dayKey, weekDays, uid } from "./journey.js";
const key = "debtquest-demo-circle-v2";
const blank = {
  viewerId: null,
  circles: [],
  members: [],
  events: [],
  blocks: [],
};
function seed() {
  const days = weekDays().filter((d) => !d.future);
  return {
    viewerId: "demo-you",
    circles: [
      {
        id: "demo-circle",
        name: "The freedom club",
        kind: "friends",
        ownerId: "demo-you",
      },
    ],
    members: [
      {
        circleId: "demo-circle",
        userId: "demo-you",
        name: "Alex",
        tone: "clay",
      },
      {
        circleId: "demo-circle",
        userId: "demo-sam",
        name: "Sam",
        tone: "sage",
      },
      {
        circleId: "demo-circle",
        userId: "demo-jordan",
        name: "Jordan",
        tone: "lavender",
      },
      {
        circleId: "demo-circle",
        userId: "demo-maya",
        name: "Maya",
        tone: "gold",
      },
    ],
    events: [
      {
        id: "demo-e1",
        circleId: "demo-circle",
        userId: "demo-sam",
        kind: "payment",
        createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
        progress: 42,
        amount: null,
        reactions: [
          { userId: "demo-jordan", emoji: "heart" },
          { userId: "demo-maya", emoji: "clap" },
        ],
      },
      {
        id: "demo-e2",
        circleId: "demo-circle",
        userId: "demo-jordan",
        kind: "checkin",
        createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        progress: null,
        amount: null,
        reactions: [{ userId: "demo-sam", emoji: "clap" }],
      },
      {
        id: "demo-e3",
        circleId: "demo-circle",
        userId: "demo-maya",
        kind: "payment",
        createdAt: new Date(Date.now() - 22 * 3600000).toISOString(),
        progress: 25,
        amount: null,
        reactions: [{ userId: "demo-sam", emoji: "heart" }],
      },
      {
        id: "demo-e4",
        circleId: "demo-circle",
        userId: "demo-you",
        kind: "checkin",
        createdAt: `${days[0].key}T14:00:00`,
        progress: null,
        amount: null,
        reactions: [],
      },
    ],
    blocks: [],
  };
}
function readDemo() {
  try {
    return JSON.parse(localStorage.getItem(key)) || seed();
  } catch {
    return seed();
  }
}
function writeDemo(state) {
  localStorage.setItem(key, JSON.stringify(state));
  return state;
}
async function rpc(name, args = {}) {
  if (!isSupabaseConfigured)
    throw new Error(
      "Sign in to connect with your people. Your device-only progress stays here.",
    );
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (error.code === "PGRST202" || error.code === "42P01")
      throw new Error(
        "Circles are not available in this build yet. Your personal progress is still saved.",
      );
    throw new Error(error.message);
  }
  return data;
}
export async function getSocial() {
  if (isDemo) {
    const state = readDemo(),
      blocked = new Set(state.blocks.map((b) => b.userId));
    return {
      ...state,
      members: state.members.filter((m) => !blocked.has(m.userId)),
      events: state.events
        .filter((e) => !blocked.has(e.userId))
        .map((e) => ({
          ...e,
          reactions: e.reactions.filter((r) => !blocked.has(r.userId)),
        })),
    };
  }
  if (!supabase) return blank;
  return rpc("dq_get_social");
}
export async function createCircle({ name, kind, displayName }) {
  if (isDemo) {
    const state = readDemo(),
      id = uid();
    state.circles.push({ id, name, kind, ownerId: state.viewerId });
    state.members.push({
      circleId: id,
      userId: state.viewerId,
      name: displayName,
      tone: "clay",
    });
    writeDemo(state);
    return id;
  }
  return rpc("dq_create_circle", {
    p_name: name,
    p_kind: kind,
    p_display_name: displayName,
  });
}
export async function createInvite(circleId) {
  if (isDemo) return { demo: true };
  return rpc("dq_create_invite", { p_circle: circleId });
}
export async function joinCircle(token, displayName) {
  if (isDemo)
    throw new Error(
      "Real invitations work after you leave the demo and sign in.",
    );
  return rpc("dq_join_circle", { p_token: token, p_display_name: displayName });
}
export async function postWin(
  circleId,
  { kind, paymentId, progress, amount, shareAmount },
) {
  if (isDemo) {
    const state = readDemo();
    const source =
      kind === "checkin" ? `checkin:${dayKey()}` : `payment:${paymentId}`;
    if (
      !state.events.some(
        (e) =>
          e.source === source &&
          e.userId === state.viewerId &&
          e.circleId === circleId,
      )
    )
      state.events.unshift({
        id: uid(),
        circleId,
        userId: state.viewerId,
        kind,
        source,
        createdAt: new Date().toISOString(),
        progress: kind === "payment" ? progress : null,
        amount: shareAmount ? amount : null,
        reactions: [],
      });
    writeDemo(state);
    return;
  }
  return rpc("dq_post_win", {
    p_circle: circleId,
    p_kind: kind,
    p_payment_id: paymentId || null,
    p_share_amount: !!shareAmount,
  });
}
export async function cheer(eventId, emoji = "clap") {
  if (isDemo) {
    const state = readDemo(),
      event = state.events.find((e) => e.id === eventId);
    if (!event) return;
    const current = event.reactions.find((r) => r.userId === state.viewerId);
    event.reactions = event.reactions.filter(
      (r) => r.userId !== state.viewerId,
    );
    if (current?.emoji !== emoji)
      event.reactions.push({ userId: state.viewerId, emoji });
    writeDemo(state);
    return;
  }
  return rpc("dq_cheer", { p_event: eventId, p_emoji: emoji });
}
export async function blockMember(userId) {
  if (isDemo) {
    const state = readDemo(),
      member = state.members.find((m) => m.userId === userId);
    if (!state.blocks.some((b) => b.userId === userId))
      state.blocks.push({ userId, name: member?.name || "Member" });
    writeDemo(state);
    return;
  }
  return rpc("dq_block_member", { p_user: userId });
}
export async function unblockMember(userId) {
  if (isDemo) {
    const state = readDemo();
    state.blocks = state.blocks.filter((b) => b.userId !== userId);
    writeDemo(state);
    return;
  }
  return rpc("dq_unblock_member", { p_user: userId });
}
export async function reportEvent(eventId, category) {
  if (isDemo) return { demo: true };
  return rpc("dq_report_event", { p_event: eventId, p_category: category });
}
export async function leaveCircle(circleId) {
  if (isDemo) {
    const state = readDemo();
    state.circles = state.circles.filter((c) => c.id !== circleId);
    state.members = state.members.filter((m) => m.circleId !== circleId);
    state.events = state.events.filter((e) => e.circleId !== circleId);
    writeDemo(state);
    return;
  }
  return rpc("dq_leave_circle", { p_circle: circleId });
}
export async function clearSharedActivity(circleId) {
  if (isDemo) {
    const state = readDemo();
    state.events = state.events.filter(
      (e) => e.circleId !== circleId || e.userId !== state.viewerId,
    );
    writeDemo(state);
    return;
  }
  return rpc("dq_clear_activity", { p_circle: circleId });
}
export function inviteLink(token) {
  const base =
    import.meta.env.VITE_PUBLIC_APP_URL ||
    (!location.protocol.startsWith("capacitor") ? location.origin : null);
  if (!base)
    throw new Error(
      "Invites need the published app link. Please use the web app to invite someone.",
    );
  const url = new URL(base);
  url.searchParams.set("join", token);
  return url.toString();
}

export async function revokeInvites(circleId) {
  if (isDemo) return;
  return rpc("dq_revoke_invites", { p_circle: circleId });
}

export async function reportMember(userId, category) {
  if (isDemo) return { demo: true };
  return rpc("dq_report_member", { p_user: userId, p_category: category });
}
export async function updateDisplayName(name) {
  if (isDemo) {
    const state = readDemo();
    state.members = state.members.map((m) =>
      m.userId === state.viewerId ? { ...m, name } : m,
    );
    writeDemo(state);
    return;
  }
  return rpc("dq_update_display_name", { p_display_name: name });
}
