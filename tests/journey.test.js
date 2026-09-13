import { describe, it, expect } from "vitest";
import {
  normalizeJourney,
  recordPayment,
  awardDaily,
  levelOf,
  projectPayoff,
  totals,
  dayKey,
} from "../src/lib/journey.js";
import { parseBackup, serializeBackup } from "../src/backup.js";
const account = {
  id: "a",
  name: "Card",
  type: "credit_card",
  originalBalance: 1000,
  currentBalance: 1000,
  interestRate: 0,
  minimumPayment: 100,
  dueDate: 1,
  isPaidOff: false,
  emoji: "💳",
  color: "#123456",
  createdAt: "2026-01-01",
};
const fresh = () =>
  normalizeJourney({
    accounts: [{ ...account }],
    payments: [],
    xp: 0,
    rewards: [],
    redeemedRewards: [],
  });
describe("a sustainable payoff journey", () => {
  it("carries legacy points, rewards and balances into lifetime progress", () => {
    const data = normalizeJourney({
      ...fresh(),
      journey: undefined,
      xp: 300,
      profile: { name1: "Rick", name2: "Jane" },
      redeemedRewards: [{ cost: 200 }],
    });
    expect(data.journey.lifetimeXP).toBe(500);
    expect(data.journey.name).toBe("Rick");
    expect(data.journey.shareAmounts).toBe(false);
    expect(totals(data).remaining).toBe(1000);
  });
  it("awards showing up once a day, without penalizing missed days", () => {
    const first = awardDaily(fresh(), "checkin", "2026-01-01");
    expect(first.points).toBe(25);
    const duplicate = awardDaily(first.data, "checkin", "2026-01-01");
    expect(duplicate.points).toBe(0);
    const next = awardDaily(duplicate.data, "checkin", "2026-02-01");
    expect(next.data.xp).toBe(50);
  });
  it("rewards payment consistency equally for different amounts and never double awards one date", () => {
    let data = fresh();
    const small = recordPayment(data, {
      accountId: "a",
      amount: 1,
      date: "2026-01-01",
    });
    expect(small.points).toBe(50);
    const split = recordPayment(small.data, {
      accountId: "a",
      amount: 300,
      date: "2026-01-01",
    });
    expect(split.points).toBe(0);
    const next = recordPayment(split.data, {
      accountId: "a",
      amount: 1,
      date: "2026-01-02",
    });
    expect(next.points).toBe(50);
    expect(next.data.accounts[0].currentBalance).toBe(698);
  });
  it("rounds decimal balances and accepts actual statement balances", () => {
    const rounded = recordPayment(fresh(), {
      accountId: "a",
      amount: 0.29,
      date: "2026-01-01",
    });
    expect(rounded.data.accounts[0].currentBalance).toBe(999.71);
    const statement = recordPayment(fresh(), {
      accountId: "a",
      amount: 100,
      date: "2026-01-01",
      statementBalance: 912,
    });
    expect(statement.data.accounts[0].currentBalance).toBe(912);
    expect(statement.payment.balanceBefore).toBe(1000);
    expect(statement.payment.balanceAfter).toBe(912);
  });
  it.each([0, -5, 1001, NaN, Infinity])(
    "rejects invalid payment %s without changing a balance",
    (amount) => {
      const data = fresh();
      expect(() =>
        recordPayment(data, { accountId: "a", amount, date: dayKey() }),
      ).toThrow();
      expect(data.accounts[0].currentBalance).toBe(1000);
    },
  );
  it("rejects normalized nonexistent dates and future dates", () => {
    for (const date of ["2026-02-31", "2026-13-01", "9999-01-01"])
      expect(() =>
        recordPayment(fresh(), { accountId: "a", amount: 1, date }),
      ).toThrow();
  });
  it("records a final payment including accrued interest when the lender balance is supplied", () => {
    const result = recordPayment(fresh(), {
      accountId: "a",
      amount: 1010,
      date: "2026-01-01",
      statementBalance: 0,
    });
    expect(result.paidOff).toBe(true);
    expect(result.payment.amountPaid).toBe(1010);
    expect(result.data.accounts[0].currentBalance).toBe(0);
  });
  it("keeps lifetime levels when earned XP is spent", () => {
    const data = fresh();
    data.xp = 100;
    data.journey.lifetimeXP = 820;
    expect(levelOf(data).name).toBe("Trailblazer");
    data.xp = 0;
    expect(levelOf(data).name).toBe("Trailblazer");
  });
  it("projects zero-interest payments exactly and rolls released minimums forward", () => {
    expect(projectPayoff([account]).months).toBe(10);
    expect(projectPayoff([account], 100).months).toBe(5);
    expect(
      projectPayoff([
        { ...account, currentBalance: 100, minimumPayment: 100 },
        { ...account, id: "b", currentBalance: 900, minimumPayment: 100 },
      ]).months,
    ).toBe(5);
  });
  it("models interest and detects payments that cannot cover interest", () => {
    expect(projectPayoff([{ ...account, interestRate: 12 }]).months).toBe(11);
    expect(
      projectPayoff([{ ...account, interestRate: 120, minimumPayment: 50 }])
        .months,
    ).toBeNull();
    expect(projectPayoff([{ ...account, currentBalance: 0 }]).months).toBe(0);
  });
  it("highest interest first costs less than the snowball in a mixed-rate example", () => {
    const accounts = [
      { ...account, currentBalance: 500, interestRate: 0, minimumPayment: 25 },
      {
        ...account,
        id: "b",
        currentBalance: 3000,
        interestRate: 29.9,
        minimumPayment: 80,
      },
    ];
    expect(projectPayoff(accounts, 100, "avalanche").interest).toBeLessThan(
      projectPayoff(accounts, 100, "snowball").interest,
    );
  });
  it("round trips the new journey and rejects malformed social preference fields", () => {
    const data = fresh();
    data.journey.name = "Rick";
    expect(parseBackup(serializeBackup(data)).journey).toEqual(data.journey);
    for (const journey of [
      { checkins: {} },
      { shareAmounts: "false" },
      { lifetimeXP: -1 },
      { checkins: ["2026-02-31"] },
      { style: "public" },
    ])
      expect(() => parseBackup(serializeBackup({ ...data, journey }))).toThrow(
        "Invalid",
      );
  });
});
