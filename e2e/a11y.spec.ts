import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { LETTER, LETTER_EXTRACTION, mockDecode, openSample } from "./helpers";

for (const scheme of ["light", "dark"] as const) {
  test.describe(`axe (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    const scan = async (page: import("@playwright/test").Page) => {
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    };

    test("start screen", async ({ page }) => {
      await page.goto("/");
      await scan(page);
    });

    test("review screen", async ({ page }) => {
      await page.goto("/");
      await page.locator("#paste").fill(LETTER);
      await page.getByRole("button", { name: "Review what gets sent" }).click();
      await expect(page.locator(".letter")).toBeVisible();
      await scan(page);
    });

    test("results screen with everything open", async ({ page }) => {
      await openSample(page);
      await page.getByText("How we got this number").click();
      await page.getByText("Change what we assumed").click();
      await scan(page);
    });

    test("results screen from a decoded letter", async ({ page }) => {
      await mockDecode(page, LETTER_EXTRACTION);
      await page.goto("/");
      await page.locator("#paste").fill(LETTER);
      await page.getByRole("button", { name: "Review what gets sent" }).click();
      await page.getByRole("button", { name: "Looks good, decode it" }).click();
      await expect(page.getByTestId("in-hand")).toBeVisible();
      await scan(page);
    });

    test("privacy page", async ({ page }) => {
      await page.goto("/privacy");
      await scan(page);
    });
  });
}

test("keyboard: the sample flow works without a mouse and focus is visible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab"); // skip link
  await page.keyboard.press("Tab"); // theme toggle
  await page.keyboard.press("Tab"); // upload label? (input is visually hidden)
  let found = false;
  for (let i = 0; i < 8 && !found; i++) {
    const name = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    if (name === "Try with a sample") found = true;
    else await page.keyboard.press("Tab");
  }
  expect(found).toBe(true);
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("in-hand")).toBeVisible();
});
