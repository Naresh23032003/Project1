import { expect, test } from "@playwright/test";
import { alertBox, docx, imageOnlyPdf, LETTER, LETTER_EXTRACTION, mockDecode, noHorizontalScroll, openSample, textPdf } from "./helpers";

test.describe("sample letter", () => {
  test("shows the in-hand number, flags and questions in one click", async ({ page }) => {
    await openSample(page);
    await expect(page.getByTestId("in-hand")).toHaveText("₹55,445");
    await expect(page.getByRole("heading", { name: "Things to look at carefully" })).toBeVisible();
    await expect(page.getByText("Service bond", { exact: true })).toBeVisible();
    await expect(page.getByText("You must serve the company for at least 18 months")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Questions to ask HR" })).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("regime toggle changes the number", async ({ page }) => {
    await openSample(page);
    await page.getByLabel("Old regime").check();
    await expect(page.getByTestId("in-hand")).toHaveText("₹52,362");
    await page.getByLabel("New regime").check();
    await expect(page.getByTestId("in-hand")).toHaveText("₹55,445");
  });

  test("the calculation can be opened and ends at the same number", async ({ page }) => {
    await openSample(page);
    await page.getByText("How we got this number").click();
    await expect(page.getByRole("table").nth(1)).toContainText("Monthly in‑hand");
    await expect(page.getByRole("table").nth(1)).toContainText("₹55,445");
  });

  test("changing PF basis updates the number", async ({ page }) => {
    await openSample(page);
    await page.getByText("Change what we assumed").click();
    await page.getByLabel("On full basic").check();
    // full basic: 12% of 28,000 = 3,360 instead of 3,000 (ceiling 25,000), so in-hand drops by 360
    await expect(page.getByTestId("in-hand")).toHaveText("₹55,085");
  });

  test("copy button confirms", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openSample(page);
    await page.getByRole("button", { name: "Copy the list" }).click();
    await expect(page.getByText("Copied.")).toBeVisible();
  });
});

test.describe("paste and decode", () => {
  test("redacts before sending and shows results from the mocked API", async ({ page }) => {
    const sent = await mockDecode(page, LETTER_EXTRACTION);
    await page.goto("/");
    await page.locator("#paste").fill(`${LETTER}\nContact: someone@example.com or 98765 43210`);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await expect(page.getByRole("heading", { name: "Check what gets sent." })).toBeVisible();
    await expect(page.locator(".redacted", { hasText: "[EMAIL]" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Looks good, decode it" }).click();
    await expect(page.getByTestId("in-hand")).toBeVisible();
    expect(sent).toHaveLength(1);
    expect(sent[0]).not.toContain("someone@example.com");
    expect(sent[0]).not.toContain("98765 43210");
    expect(sent[0]).not.toContain("Nikhil");
    expect(sent[0]).toContain("4,80,000");
  });

  test("user can hide an extra phrase with the keyboard", async ({ page }) => {
    await page.goto("/");
    await page.locator("#paste").fill(LETTER);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await page.getByLabel("Hide another word or phrase").fill("Pinecone Data");
    await page.keyboard.press("Enter");
    await expect(page.locator(".letter")).not.toContainText("Pinecone Data");
  });

  test("tapping a word hides it", async ({ page }) => {
    await page.goto("/");
    await page.locator("#paste").fill(LETTER);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await expect(page.locator(".letter")).toContainText("Subject:");
    await page.locator(".letter .w", { hasText: /^Subject:$/ }).click();
    await expect(page.locator(".letter")).not.toContainText("Subject:");
    await expect(page.getByRole("status").filter({ hasText: "Hidden:" })).toContainText("names");
  });

  test("tapping a tag shows the text again", async ({ page }) => {
    await page.goto("/");
    await page.locator("#paste").fill(LETTER);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await expect(page.locator(".letter")).not.toContainText("talent@pineconedata.example.com");
    await page.locator(".redacted", { hasText: "[EMAIL]" }).first().click();
    await expect(page.locator(".letter")).toContainText("talent@pineconedata.example.com");
  });

  test("the continue button stays off until there's enough text", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Review what gets sent" })).toBeDisabled();
    await page.locator("#paste").fill("too short");
    await expect(page.getByRole("button", { name: "Review what gets sent" })).toBeDisabled();
  });
});

test.describe("files", () => {
  test("reads a text PDF in the browser", async ({ page, context }) => {
    const pdf = await textPdf(context, LETTER);
    await page.goto("/");
    await page.locator("#file").setInputFiles({ name: "offer.pdf", mimeType: "application/pdf", buffer: pdf });
    await expect(page.locator("#paste")).toHaveValue(/Your annual CTC is Rs\. 12,00,000/);
    await expect(page.locator("#paste")).toHaveValue(/Basic Salary \| 4,80,000/);
  });

  test("reads a DOCX in the browser", async ({ page }) => {
    await page.goto("/");
    await page.locator("#file").setInputFiles({ name: "offer.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await docx(LETTER) });
    await expect(page.locator("#paste")).toHaveValue(/Your annual CTC is Rs\. 12,00,000/);
  });

  test("tells you plainly when a PDF is a scan", async ({ page, context }) => {
    const pdf = await imageOnlyPdf(context);
    await page.goto("/");
    await page.locator("#file").setInputFiles({ name: "scan.pdf", mimeType: "application/pdf", buffer: pdf });
    await expect(alertBox(page)).toContainText("looks like a scan or a photo");
    await expect(page.locator("#paste")).toHaveValue("");
  });

  test("rejects unsupported files", async ({ page }) => {
    await page.goto("/");
    await page.locator("#file").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("not really") });
    await expect(alertBox(page)).toContainText("PDF, Word");
  });

  test("never uploads the file itself", async ({ page, context }) => {
    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "POST") requests.push(r.url());
    });
    const pdf = await textPdf(context, LETTER);
    await page.goto("/");
    await page.locator("#file").setInputFiles({ name: "offer.pdf", mimeType: "application/pdf", buffer: pdf });
    await expect(page.locator("#paste")).toHaveValue(/CTC/);
    expect(requests).toEqual([]);
  });
});

test.describe("errors", () => {
  test("shows the rate limit message", async ({ page }) => {
    await mockDecode(page, null, 429, { error: "rate_limited", message: "You've used today's decodes. Try again tomorrow." });
    await page.goto("/");
    await page.locator("#paste").fill(LETTER);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await page.getByRole("button", { name: "Looks good, decode it" }).click();
    await expect(page.getByRole("heading", { name: "That's all for today." })).toBeVisible();
    await expect(page.getByText("Try again tomorrow")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
  });

  test("offers a retry when the model is down", async ({ page }) => {
    await mockDecode(page, null, 502, { error: "model_unavailable", message: "The decoder is busy right now. Please try again in a minute." });
    await page.goto("/");
    await page.locator("#paste").fill(LETTER);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await page.getByRole("button", { name: "Looks good, decode it" }).click();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("says so when no pay is found", async ({ page }) => {
    await mockDecode(page, null, 422, { error: "not_an_offer", message: "We couldn't find pay details in that text. Check you pasted the full letter." });
    await page.goto("/");
    await page.locator("#paste").fill(LETTER);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await page.getByRole("button", { name: "Looks good, decode it" }).click();
    await expect(page.getByRole("heading", { name: "We couldn't find an offer in that text." })).toBeVisible();
  });

  test("does not show a half-parsed result", async ({ page }) => {
    await mockDecode(page, { ctcAnnual: "lots", components: "nope" });
    await page.goto("/");
    await page.locator("#paste").fill(LETTER);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await page.getByRole("button", { name: "Looks good, decode it" }).click();
    await expect(page.getByTestId("in-hand")).toHaveCount(0);
    await expect(alertBox(page)).toBeVisible();
  });

  test("start over clears the pasted letter", async ({ page }) => {
    await mockDecode(page, LETTER_EXTRACTION);
    await page.goto("/");
    await page.locator("#paste").fill(LETTER);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await page.getByRole("button", { name: "Looks good, decode it" }).click();
    await page.getByRole("button", { name: "Decode another letter" }).click();
    await expect(page.locator("#paste")).toHaveValue("");
  });
});

test.describe("pages", () => {
  test("privacy page explains the handling", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "How your data is handled." })).toBeVisible();
    await expect(page.getByText("There is no database.")).toBeVisible();
  });

  test("unknown routes get a friendly 404", async ({ page }) => {
    const res = await page.goto("/nope");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "That page doesn't exist." })).toBeVisible();
  });

  test("start, review and results fit the screen width", async ({ page }) => {
    await mockDecode(page, LETTER_EXTRACTION);
    await page.goto("/");
    await noHorizontalScroll(page);
    await page.locator("#paste").fill(LETTER);
    await page.getByRole("button", { name: "Review what gets sent" }).click();
    await noHorizontalScroll(page);
    await page.getByRole("button", { name: "Looks good, decode it" }).click();
    await expect(page.getByTestId("in-hand")).toBeVisible();
    await noHorizontalScroll(page);
  });
});
