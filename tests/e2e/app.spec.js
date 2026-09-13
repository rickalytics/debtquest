import { test, expect } from "@playwright/test";
const nav = (page, name) =>
  page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name, exact: true });
async function onboard(page) {
  await page.goto("/");
  await page.getByLabel("What should we call you?").fill("Taylor");
  await page.getByRole("button", { name: "For myself", exact: true }).click();
  await page
    .getByRole("button", { name: "Let’s do this", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start my journey", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Your next adventure, Taylor/ }),
  ).toBeVisible();
}
test("mobile journey: onboarding, debt, payment, durable reload, backup, privacy", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await onboard(page);
  await page
    .getByRole("button", { name: "Add your first debt", exact: true })
    .click();
  await page.getByLabel("Account name", { exact: true }).fill("Test Car");
  await page.getByLabel("Starting balance").fill("10000");
  await page.getByLabel("Current balance").fill("9000");
  await page.getByLabel("Interest rate (APR %)").fill("5");
  await page.getByLabel("Minimum monthly payment").fill("300");
  await page
    .getByRole("button", { name: "Add to my journey", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Log a payment", exact: true })
    .click();
  await page.getByLabel("Amount paid", { exact: true }).fill("500");
  await page
    .getByLabel("A note to yourself (optional)")
    .fill("A little breathing room");
  await page.getByRole("button", { name: "Log payment", exact: true }).click();
  await expect(page.getByText("+50 XP earned")).toBeVisible();
  await page.getByRole("button", { name: "Continue quest" }).click();
  await page.reload();
  await nav(page, "Debts").click();
  await expect(page.getByRole("button", { name: /Test Car/ })).toContainText(
    "$8,500.00",
  );
  await page.locator("#extra-payment").fill("100");
  await expect(page.getByText(/months sooner/)).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(
    /debtquest-backup.*json/,
  );
  await page.getByRole("link", { name: "Privacy policy" }).click();
  await expect(
    page.getByRole("heading", { name: "Privacy policy", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Help & support" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "We've got your next step.",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("the sample circle is interactive, private, and isolated from real tracker storage", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?demo=1");
  await expect(
    page.getByRole("heading", { name: /Your next adventure, Alex/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(async () =>
      (await indexedDB.databases()).some((d) => d.name === "DebtQuestDB"),
    ),
  ).toBe(false);
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("debtquest-social-demo-v2")),
  );
  await nav(page, "Circle").click();
  await page
    .getByRole("button", { name: "Cheer for Sam’s win", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cheer for Sam’s win", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Invite your people" }).click();
  await expect(page.getByText(/This is a sample circle/)).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await nav(page, "Rewards").click();
  await page
    .locator(".reward-card")
    .filter({ hasText: "A cozy night in" })
    .getByRole("button", { name: "Claim this moment" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Claim this moment" })
    .click();
  await expect(
    page.getByRole("heading", { name: "This moment is yours." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue quest" }).click();
  await expect(
    page.getByRole("heading", { name: "Moments you’ve made room for" }),
  ).toBeVisible();
  await nav(page, "Circle").click();
  await page
    .getByRole("button", { name: "Manage activity from Sam", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Report activity", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("demo");
  await page
    .getByRole("button", { name: "Manage activity from Sam", exact: true })
    .click();
  await page.getByRole("button", { name: "Block Sam", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Manage activity from Sam", exact: true }),
  ).toHaveCount(0);
  for (const name of ["Quest", "Debts", "Circle", "Rewards"]) {
    await nav(page, name).click();
    await page.setViewportSize({ width: 320, height: 750 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/");
  await expect(page.getByLabel("What should we call you?")).toBeVisible();
  expect(errors).toEqual([]);
});
test("a malformed journey backup cannot replace saved personal data", async ({
  page,
}) => {
  await onboard(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        accounts: [],
        payments: [],
        journey: { checkins: {} },
      }),
    ),
  });
  await expect(page.getByText(/Invalid DebtQuest backup/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Your next adventure, Taylor/ }),
  ).toBeVisible();
});
test("check-ins award once per day and a custom circle can be created in the demo", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-13T12:00:00Z"));
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: /I’m here for future me/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /I’m here for future me/ })
    .click();
  await expect(page.getByText("+25 XP earned")).toBeVisible();
  await page.getByRole("button", { name: "Continue quest" }).click();
  await expect(
    page.getByRole("button", { name: "You showed up today" }),
  ).toBeDisabled();
  await nav(page, "Circle").click();
  await page
    .getByRole("button", { name: "Start or join another circle" })
    .click();
  await page.getByRole("button", { name: /Just us two/ }).click();
  await page.getByRole("button", { name: "Create my circle" }).click();
  await expect(page.getByLabel("Choose your circle")).toBeVisible();
  await expect(page.getByText(/Private couple’s circle/)).toBeVisible();
});
