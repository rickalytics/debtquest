import { normalizeJourney, REWARDS, dayKey, weekDays } from "./journey.js";
import { validateData } from "../backup.js";
export const isDemo =
  new URLSearchParams(window.location.search).get("demo") === "1";
const demoKey = "debtquest-social-demo-v2";
export function createDemo() {
  const today = dayKey(),
    days = weekDays()
      .filter((d) => !d.future)
      .map((d) => d.key);
  const data = normalizeJourney({
    accounts: [
      {
        id: "demo-card",
        name: "Everyday card",
        type: "credit_card",
        originalBalance: 10000,
        currentBalance: 4250,
        interestRate: 19.9,
        minimumPayment: 250,
        dueDate: 20,
        isPaidOff: false,
        emoji: "💳",
        color: "#b87850",
        createdAt: today,
      },
      {
        id: "demo-auto",
        name: "The adventure mobile",
        type: "auto",
        originalBalance: 18000,
        currentBalance: 14600,
        interestRate: 5.9,
        minimumPayment: 390,
        dueDate: 15,
        isPaidOff: false,
        emoji: "🚗",
        color: "#3b756a",
        createdAt: today,
      },
      {
        id: "demo-student",
        name: "Student loan",
        type: "student",
        originalBalance: 7000,
        currentBalance: 3300,
        interestRate: 4.5,
        minimumPayment: 160,
        dueDate: 1,
        isPaidOff: false,
        emoji: "🎓",
        color: "#8c89ad",
        createdAt: today,
      },
    ],
    payments: [
      {
        id: "demo-payment",
        accountId: "demo-card",
        paymentDate: today,
        amountPaid: 250,
        balanceBefore: 4500,
        balanceAfter: 4250,
        note: "A little closer",
      },
    ],
    rewards: REWARDS,
    redeemedRewards: [],
    xp: 420,
    streak: 3,
    profile: { name1: "Alex", name2: "Sam" },
    achievements: [],
    journey: {
      name: "Alex",
      why: "Our next adventure",
      onboarded: true,
      lifetimeXP: 620,
      checkins: days.slice(0, 3),
      cheerDays: [days[0]],
      paymentDays: [today],
      shareWins: true,
      shareAmounts: false,
    },
  });
  return data;
}
export function loadDemo() {
  try {
    const saved = JSON.parse(localStorage.getItem(demoKey));
    if (saved) return normalizeJourney(validateData(saved));
  } catch {}
  return createDemo();
}
export function saveDemo(data) {
  localStorage.setItem(demoKey, JSON.stringify(data));
}
export function resetDemo() {
  localStorage.removeItem(demoKey);
  localStorage.removeItem("debtquest-demo-circle-v2");
  location.reload();
}
