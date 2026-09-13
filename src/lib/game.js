import { BADGES, dayKey, levelOf } from "./journey.js";

export const COMPANION_STYLES = [
  {
    id: "classic",
    name: "Pip",
    at: 0,
    island: "Starter Shore",
    detail: "Every adventure starts with one small step.",
  },
  {
    id: "scarf",
    name: "Explorer scarf",
    at: 250,
    island: "Camp Courage",
    detail: "A little courage. A very good scarf.",
  },
  {
    id: "cape",
    name: "Trailblazer cape",
    at: 750,
    island: "Sky Meadow",
    detail: "Your consistency is taking you places.",
  },
  {
    id: "lantern",
    name: "Starlight lantern",
    at: 1500,
    island: "Starlight Falls",
    detail: "Look at all the light you've made.",
  },
  {
    id: "crown",
    name: "Summit crown",
    at: 3000,
    island: "Freedom Summit",
    detail: "Every little step helped build this world.",
  },
];

export function companionStyle(data) {
  return (
    COMPANION_STYLES.find(
      (s) =>
        s.id === data.journey.companionStyle && s.at <= data.journey.lifetimeXP,
    ) || COMPANION_STYLES[0]
  );
}

export function equipCompanion(data, id) {
  const style = COMPANION_STYLES.find((s) => s.id === id);
  if (!style || style.at > data.journey.lifetimeXP)
    throw new Error("Earn this companion look before equipping it.");
  return { ...data, journey: { ...data.journey, companionStyle: id } };
}

export function weeklyQuest(data, now = new Date()) {
  const today = dayKey(now);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const key = dayKey(start);
  const count = new Set(
    data.journey.checkins.filter((d) => d >= key && d <= today),
  ).size;
  const claimed = (data.journey.questChests || []).includes(key);
  return {
    key,
    count,
    goal: 3,
    points: 40,
    claimed,
    ready: count >= 3 && !claimed,
  };
}

export function claimWeeklyChest(data, now = new Date()) {
  const quest = weeklyQuest(data, now);
  if (quest.claimed) throw new Error("This week's chest is already collected.");
  if (!quest.ready)
    throw new Error(
      "Check in on three different days this week to unlock the chest.",
    );
  return {
    ...data,
    xp: data.xp + quest.points,
    journey: {
      ...data.journey,
      lifetimeXP: data.journey.lifetimeXP + quest.points,
      questChests: [...(data.journey.questChests || []), quest.key],
    },
  };
}

// Presentation is derived from the successful save. It never grants points.
export function gameResult(before, after, details = {}) {
  const lifetimeBefore = before.journey.lifetimeXP;
  const lifetimeAfter = after.journey.lifetimeXP;
  return {
    ...details,
    levelBefore: levelOf(before),
    levelAfter: levelOf(after),
    lifetimeBefore,
    lifetimeAfter,
    companion: companionStyle(after).id,
    unlocks: COMPANION_STYLES.filter(
      (s) => s.at > lifetimeBefore && s.at <= lifetimeAfter,
    ),
    badges: BADGES.filter((b) => !b.earned(before) && b.earned(after)).map(
      ({ id, name, icon }) => ({ id, name, icon }),
    ),
    balanceBefore: details.payment?.balanceBefore,
    balanceAfter: details.payment?.balanceAfter,
  };
}

export function sampleCelebration(data, scene = "payment") {
  const lifetimeBefore = scene === "level" ? 725 : 500;
  const before = {
    ...data,
    journey: { ...data.journey, lifetimeXP: lifetimeBefore },
  };
  const after = {
    ...before,
    journey: { ...before.journey, lifetimeXP: lifetimeBefore + 50 },
  };
  return gameResult(before, after, {
    preview: true,
    scene,
    type: "payment",
    points: 50,
    amount: scene === "payoff" ? 250 : 50,
    paidOff: scene === "payoff",
    payment: {
      balanceBefore: scene === "payoff" ? 250 : 1000,
      balanceAfter: scene === "payoff" ? 0 : 950,
    },
  });
}
