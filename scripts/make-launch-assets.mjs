// Usage: node scripts/make-launch-assets.mjs [BASE_URL]
// Writes screenshots and the share card to launch/. Point it at the live site once it is deployed.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3100";
mkdirSync("launch", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "light" });
const page = await ctx.newPage();

await page.goto(base);
await page.waitForSelector("h1");
await page.screenshot({ path: "launch/1-start.png" });

await page.getByRole("button", { name: "Try with a sample" }).click();
await page.waitForSelector("[data-testid=in-hand]");
await page.waitForTimeout(900);
await page.screenshot({ path: "launch/2-in-hand.png" });

await page.getByText("How we got this number").click();
await page.waitForTimeout(300);
await page.locator("table.ledger").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: "launch/3-calculation.png" });

await page.getByRole("heading", { name: "Things to look at carefully" }).scrollIntoViewIfNeeded();
await page.screenshot({ path: "launch/4-flags.png" });

await page.getByRole("heading", { name: "Share your decode" }).scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const dataUrl = await page.locator("canvas").evaluate((c) => c.toDataURL("image/png"));
writeFileSync("launch/share-card.png", Buffer.from(dataUrl.split(",")[1], "base64"));

await browser.close();
console.log("wrote launch/*.png from", base);
