import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("core phone screens have accessible names, roles, and text contrast", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await expect(
    page.getByRole("heading", { name: /You’re going places/ }),
  ).toBeVisible();
  for (const name of ["Today", "Journey", "Circle", "Rewards"]) {
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("button", { name, exact: true })
      .click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations,
      `${name}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })))}`,
    ).toEqual([]);
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  // Check the rendered dialog after its entrance animation. Sampling halfway
  // through an opacity transition measures transient blended text colors.
  const dialog = page.getByRole("dialog");
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  await expect(dialog).toHaveCSS("opacity", "1");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
