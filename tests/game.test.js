import { describe, it, expect } from "vitest";
import { normalizeJourney, recordPayment } from "../src/lib/journey.js";
import {
  claimWeeklyChest,
  weeklyQuest,
  equipCompanion,
  companionStyle,
  gameResult,
  sampleCelebration,
} from "../src/lib/game.js";
import { parseBackup, serializeBackup } from "../src/backup.js";

const fresh = () => normalizeJourney({ accounts: [], payments: [], xp: 20 });
const sunday = new Date(2026, 8, 13, 12);
const ready = () => {
  const data = fresh();
  data.journey.checkins = ["2026-09-07", "2026-09-09", "2026-09-11"];
  data.journey.lifetimeXP = 725;
  return data;
};

describe("earned game progress", () => {
  it("counts distinct days this week, excluding old and future check-ins", () => {
    const data = fresh();
    data.journey.checkins = [
      "2026-09-06",
      "2026-09-07",
      "2026-09-07",
      "2026-09-14",
    ];
    expect(weeklyQuest(data, sunday)).toMatchObject({
      key: "2026-09-07",
      count: 1,
      ready: false,
    });
    expect(() => claimWeeklyChest(data, sunday)).toThrow(
      /three different days/,
    );
    expect(data.xp).toBe(20);
  });
  it("awards a guaranteed chest once and preserves its claim through a backup", () => {
    const before = ready();
    const after = claimWeeklyChest(before, sunday);
    expect(after.xp).toBe(60);
    expect(after.journey.lifetimeXP).toBe(765);
    expect(after.accounts).toEqual(before.accounts);
    expect(before.journey.questChests).toEqual([]);
    const restored = normalizeJourney(parseBackup(serializeBackup(after)));
    expect(() => claimWeeklyChest(restored, sunday)).toThrow(
      /already collected/,
    );
    const result = gameResult(before, after, { type: "chest", points: 40 });
    expect(result.levelAfter.index).toBe(3);
    expect(result.unlocks.map((s) => s.id)).toEqual(["cape"]);
  });
  it("starts a new week without removing earned points or making old days count", () => {
    const after = claimWeeklyChest(ready(), sunday);
    expect(weeklyQuest(after, new Date(2026, 8, 14, 0, 1))).toMatchObject({
      key: "2026-09-14",
      count: 0,
      claimed: false,
      ready: false,
    });
    after.journey.checkins.push("2026-09-14", "2026-09-15", "2026-09-16");
    const next = claimWeeklyChest(after, new Date(2026, 8, 16, 12));
    expect(next.xp).toBe(100);
    expect(next.journey.questChests).toEqual(["2026-09-07", "2026-09-14"]);
  });
  it("keeps earned looks after spending XP and rejects unearned equipment", () => {
    const after = claimWeeklyChest(ready(), sunday);
    after.xp = 0;
    const equipped = equipCompanion(after, "cape");
    expect(companionStyle(equipped).id).toBe("cape");
    expect(companionStyle(parseBackup(serializeBackup(equipped))).id).toBe(
      "cape",
    );
    expect(() => equipCompanion(after, "crown")).toThrow(/Earn/);
    expect(() => equipCompanion(after, "unknown")).toThrow(/Earn/);
    expect(after.journey.companionStyle).toBe("classic");
  });
  it.each([
    { companionStyle: "unknown" },
    { questChests: {} },
    { questChests: ["2026-02-31"] },
  ])("rejects malformed game backup fields: %j", (fields) => {
    const data = fresh();
    Object.assign(data.journey, fields);
    expect(() => parseBackup(serializeBackup(data))).toThrow(/Invalid/);
  });
  it("celebrates saved statement balances faithfully and never awards duplicate payment XP", () => {
    const data = fresh();
    data.accounts = [
      { id: "card", name: "Card", currentBalance: 1000, originalBalance: 1000 },
    ];
    const first = recordPayment(data, {
      accountId: "card",
      amount: 50,
      date: "2026-09-01",
      statementBalance: 1010,
    });
    const win = gameResult(data, first.data, first);
    expect(win).toMatchObject({
      balanceBefore: 1000,
      balanceAfter: 1010,
      points: 50,
      paidOff: false,
    });
    const second = recordPayment(first.data, {
      accountId: "card",
      amount: 10,
      date: "2026-09-01",
    });
    expect(gameResult(first.data, second.data, second)).toMatchObject({
      balanceBefore: 1010,
      balanceAfter: 1000,
      points: 0,
      lifetimeAfter: 70,
    });
  });
  it("keeps sample celebrations separate from financial and game records", () => {
    const data = ready(),
      snapshot = structuredClone(data);
    for (const scene of ["payment", "level", "payoff"]) {
      const result = sampleCelebration(data, scene);
      expect(result.preview).toBe(true);
      if (scene === "level") expect(result.unlocks[0].id).toBe("cape");
      if (scene === "payoff") expect(result.balanceAfter).toBe(0);
    }
    expect(data).toEqual(snapshot);
  });
});
