import { readFileSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { SAMPLE_EXTRACTION } from "../src/lib/sample";

export const fixture = (name: string) => readFileSync(path.join(import.meta.dirname, "..", "test", "fixtures", name), "utf8");

export const LETTER = fixture("14-clean-letter.txt");
export const LETTER_EXTRACTION = JSON.parse(fixture("14-clean-letter.expected.json")).extraction;

export async function mockDecode(page: Page, extraction: unknown = SAMPLE_EXTRACTION, status = 200, body?: unknown) {
  const sent: string[] = [];
  await page.route("**/api/decode", async (route) => {
    sent.push(route.request().postData() ?? "");
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body ?? { extraction, dropped: { components: 0, clauses: 0, ctc: false }, remaining: 9 }),
    });
  });
  return sent;
}

export async function textPdf(context: BrowserContext, text: string): Promise<Buffer> {
  const page = await context.newPage();
  const html = text
    .split("\n")
    .map((l) => `<div style="font:14px Arial">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;") || "&nbsp;"}</div>`)
    .join("");
  await page.setContent(`<body>${html}</body>`);
  const pdf = await page.pdf();
  await page.close();
  return pdf;
}

export async function imageOnlyPdf(context: BrowserContext): Promise<Buffer> {
  const page = await context.newPage();
  await page.setContent("<body><canvas id=c width=600 height=300></canvas></body>");
  const url = await page.evaluate(() => {
    const c = document.getElementById("c") as HTMLCanvasElement;
    const g = c.getContext("2d")!;
    g.fillStyle = "#ddd";
    g.fillRect(0, 0, 600, 300);
    g.fillStyle = "#000";
    g.fillRect(40, 40, 400, 20);
    return c.toDataURL("image/png");
  });
  await page.setContent(`<body><img src="${url}" width="600"></body>`);
  const pdf = await page.pdf();
  await page.close();
  return pdf;
}

export async function docx(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const paras = text
    .split("\n")
    .map((l) => `<w:p><w:r><w:t xml:space="preserve">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</w:t></w:r></w:p>`)
    .join("");
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}</w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

export async function openSample(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try with a sample" }).click();
  await expect(page.getByTestId("in-hand")).toBeVisible();
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

export const alertBox = (page: Page) => page.locator("[role=alert]:not(#__next-route-announcer__)");
