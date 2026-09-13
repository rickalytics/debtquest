export const money = (value, cents = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents ? 2 : 0,
  }).format(Number(value) || 0);
export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const uid = () => crypto.randomUUID();
export const LEVELS = [
  { name: "Fresh start", at: 0 },
  { name: "Pathfinder", at: 250 },
  { name: "Trailblazer", at: 750 },
  { name: "Waymaker", at: 1500 },
  { name: "Freedom builder", at: 3000 },
];
export const REWARDS = [
  {
    id: "dq-cozy",
    name: "A cozy night in",
    desc: "Your favorite movie. Phones away. Snacks ready.",
    emoji: "popcorn",
    cost: 100,
  },
  {
    id: "dq-morning",
    name: "The slow morning",
    desc: "Sleep in. Someone else is on coffee duty.",
    emoji: "coffee",
    cost: 150,
  },
  {
    id: "dq-date",
    name: "A little adventure",
    desc: "Choose a free local adventure together.",
    emoji: "sun",
    cost: 250,
  },
  {
    id: "dq-playlist",
    name: "Passenger-seat DJ",
    desc: "You pick the soundtrack for the next drive.",
    emoji: "music",
    cost: 75,
  },
];
export function normalizeJourney(data) {
  const redeemed = data.redeemedRewards || [];
  const legacyName = data.profile?.name1;
  return {
    ...data,
    accounts: data.accounts || [],
    payments: data.payments || [],
    rewards: data.rewards || [],
    redeemedRewards: redeemed,
    achievements: data.achievements || [],
    xp: data.xp || 0,
    journey: {
      lifetimeXP:
        (data.xp || 0) + redeemed.reduce((sum, r) => sum + (r.cost || 0), 0),
      checkins: [],
      cheerDays: [],
      paymentDays: [],
      questChests: [],
      companionStyle: "classic",
      name: legacyName && legacyName !== "Player 1" ? legacyName : "",
      why: "More room to breathe",
      shareWins: false,
      shareAmounts: false,
      onboarded: !!data.accounts?.length,
      ...data.journey,
    },
  };
}
export function totals(data) {
  const original = data.accounts.reduce((n, a) => n + a.originalBalance, 0);
  const remaining = data.accounts.reduce((n, a) => n + a.currentBalance, 0);
  const cleared = Math.max(0, original - remaining);
  return {
    original,
    remaining,
    cleared,
    percent: original > 0 ? Math.min(100, (cleared / original) * 100) : 0,
  };
}
export function levelOf(data) {
  const lifetime = data.journey.lifetimeXP;
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++)
    if (lifetime >= LEVELS[i].at) index = i;
  const current = LEVELS[index],
    next = LEVELS[index + 1];
  return {
    ...current,
    index: index + 1,
    next,
    progress: next
      ? Math.min(100, ((lifetime - current.at) / (next.at - current.at)) * 100)
      : 100,
  };
}
export function awardDaily(data, kind, date = dayKey()) {
  const fields = {
    checkin: ["checkins", 25],
    payment: ["paymentDays", 50],
    cheer: ["cheerDays", 15],
  };
  const [field, points] = fields[kind];
  if (data.journey[field].includes(date)) return { data, points: 0 };
  return {
    points,
    data: {
      ...data,
      xp: data.xp + points,
      journey: {
        ...data.journey,
        lifetimeXP: data.journey.lifetimeXP + points,
        [field]: [...data.journey[field], date],
      },
    },
  };
}
export function recordPayment(
  data,
  { accountId, amount, date, note = "", statementBalance },
) {
  const account = data.accounts.find((a) => a.id === accountId);
  if (!account) throw new Error("Choose a debt first.");
  const hasStatement = statementBalance !== "" && statementBalance != null;
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1e12 ||
    (amount > account.currentBalance && !hasStatement)
  )
    throw new Error(
      "Enter an amount above zero and no more than the remaining balance.",
    );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + "T12:00:00")) ||
    dayKey(new Date(date + "T12:00:00")) !== date ||
    date > dayKey()
  )
    throw new Error("Choose today or an earlier payment date.");
  const balance =
    statementBalance === "" || statementBalance == null
      ? Math.max(0, Math.round((account.currentBalance - amount) * 100) / 100)
      : Number(statementBalance);
  if (!Number.isFinite(balance) || balance < 0 || balance > 1e12)
    throw new Error("Enter a valid statement balance.");
  const payment = {
    id: uid(),
    accountId,
    amountPaid: amount,
    paymentDate: date,
    balanceBefore: account.currentBalance,
    balanceAfter: balance,
    note: note.slice(0, 500),
  };
  const updated = {
    ...data,
    accounts: data.accounts.map((a) =>
      a.id === accountId
        ? { ...a, currentBalance: balance, isPaidOff: balance === 0 }
        : a,
    ),
    payments: [...data.payments, payment],
  };
  // One award per actual payment date prevents splitting one payment for more XP.
  const awarded = awardDaily(updated, "payment", date);
  return { ...awarded, payment, paidOff: balance === 0 };
}
export function projectPayoff(accounts, extra = 0, strategy = "avalanche") {
  const debts = accounts
    .filter((a) => a.currentBalance > 0)
    .map((a) => ({ ...a, balance: a.currentBalance }));
  if (!debts.length)
    return { months: 0, interest: 0, points: [{ month: 0, balance: 0 }] };
  const budget =
    debts.reduce((n, a) => n + a.minimumPayment, 0) +
    Math.max(0, Number(extra) || 0);
  const points = [
    { month: 0, balance: debts.reduce((n, a) => n + a.balance, 0) },
  ];
  let interest = 0;
  if (budget <= 0) return { months: null, interest: 0, points };
  for (let month = 1; month <= 600; month++) {
    const monthlyInterest = debts.reduce(
      (n, d) => n + d.balance * (d.interestRate / 1200),
      0,
    );
    if (month === 1 && monthlyInterest >= budget)
      return { months: null, interest: 0, points };
    interest += monthlyInterest;
    debts.forEach((d) => {
      d.balance += d.balance * (d.interestRate / 1200);
    });
    let available = budget;
    for (const d of debts) {
      const paid = Math.min(d.balance, d.minimumPayment, available);
      d.balance -= paid;
      available -= paid;
    }
    const order = [...debts].sort(
      strategy === "snowball"
        ? (a, b) => a.balance - b.balance
        : (a, b) => b.interestRate - a.interestRate,
    );
    for (const d of order) {
      const paid = Math.min(d.balance, available);
      d.balance -= paid;
      available -= paid;
    }
    const total = debts.reduce((n, d) => n + d.balance, 0);
    if (month % 3 === 0 || total < 0.01)
      points.push({ month, balance: Math.round(total) });
    if (total < 0.01)
      return { months: month, interest: Math.round(interest), points };
  }
  return { months: null, interest: Math.round(interest), points };
}
export function payoffLabel(months) {
  if (months === 0) return "Debt free";
  if (months == null) return "Adjust your plan";
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
export function weekDays() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return {
      key: dayKey(d),
      label: ["M", "T", "W", "T", "F", "S", "S"][i],
      today: dayKey(d) === dayKey(now),
      future: dayKey(d) > dayKey(now),
    };
  });
}
export const BADGES = [
  {
    id: "first",
    name: "First step",
    desc: "Log your first payment",
    icon: "footprints",
    earned: (d) => d.payments.length > 0,
  },
  {
    id: "week",
    name: "Showing up",
    desc: "Check in on 3 different days",
    icon: "sun",
    earned: (d) => d.journey.checkins.length >= 3,
  },
  {
    id: "team",
    name: "Good company",
    desc: "Encourage your circle",
    icon: "heart",
    earned: (d) => d.journey.cheerDays.length > 0,
  },
  {
    id: "quarter",
    name: "A lighter load",
    desc: "Clear 25% of your starting debt",
    icon: "feather",
    earned: (d) => totals(d).percent >= 25,
  },
  {
    id: "one",
    name: "One less thing",
    desc: "Pay off a debt",
    icon: "flag",
    earned: (d) => d.accounts.some((a) => a.isPaidOff),
  },
  {
    id: "free",
    name: "Wide open",
    desc: "Pay off every debt",
    icon: "sparkles",
    earned: (d) =>
      d.accounts.length > 0 && d.accounts.every((a) => a.isPaidOff),
  },
];
