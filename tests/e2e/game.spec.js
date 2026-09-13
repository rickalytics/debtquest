import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("a weekly chest unlocks a persistent companion look and cannot be collected twice", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-13T12:00:00Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: /Open chest/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("+40 XP earned")).toBeVisible();
  await expect(
    dialog.getByText("Trailblazer cape", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Equip", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Equipped ✓" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Continue quest" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Chest collected" }),
  ).toBeDisabled();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("debtquest-social-demo-v2")),
  );
  expect(saved.xp).toBe(460);
  expect(saved.journey.lifetimeXP).toBe(765);
  expect(saved.journey.companionStyle).toBe("cape");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Rewards", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Trailblazer cape equipped" }),
  ).toBeDisabled();
});

test("sample celebrations are accessible with reduced motion and never change records", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?demo=1");
  await expect(
    page.getByRole("heading", { name: /Your next adventure/ }),
  ).toBeVisible();
  const read = () =>
    page.evaluate(() => localStorage.getItem("debtquest-social-demo-v2"));
  const before = await read();
  await page.getByRole("button", { name: /Try a payment celebration/ }).click();
  for (const [scene, heading] of [
    ["Payment", "A little debt. Gone."],
    ["Level up", "LEVEL UP!"],
    ["Debt cleared", "DEBT DEFEATED!"],
  ]) {
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: scene, exact: true }).click();
    await expect(
      dialog.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Calm effects" }),
    ).toBeDisabled();
    await expect(
      dialog.getByRole("button", { name: "Sound off" }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.locator(".victory-confetti").first()).toBeHidden();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations,
      JSON.stringify(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ),
    ).toEqual([]);
  }
  await page.getByRole("button", { name: "Continue quest" }).click();
  expect(await read()).toBe(before);
});

test("a real payoff is celebrated after saving without a second payment XP award", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?demo=1");
  await page
    .getByRole("button", { name: "Log a payment", exact: true })
    .click();
  await page.getByLabel("Amount paid", { exact: true }).fill("4250");
  await page.getByRole("button", { name: "Log payment", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "DEBT DEFEATED!" }),
  ).toBeVisible();
  await expect(
    dialog.getByText(/already earned payment XP for this date/),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("debtquest-social-demo-v2")),
  );
  expect(saved.accounts.find((a) => a.id === "demo-card").currentBalance).toBe(
    0,
  );
  expect(saved.payments.at(-1).amountPaid).toBe(4250);
  expect(saved.xp).toBe(420);
});

test("a failed payment save keeps the form open and never shows a reward", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await page
    .getByRole("button", { name: "Log a payment", exact: true })
    .click();
  await page.getByLabel("Amount paid", { exact: true }).fill("25");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "debtquest-social-demo-v2")
        throw new Error("Storage unavailable");
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Log payment", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("Storage unavailable"),
  ).toBeVisible();
  await expect(page.getByLabel("Amount paid", { exact: true })).toHaveValue(
    "25",
  );
  await expect(page.locator(".game-celebration")).toHaveCount(0);
});
