import { describe, expect, it } from "vitest";
import { itemsToText, looksScanned } from "./pdf-lines";

const item = (str: string, x: number, y: number, width = str.length * 5) => ({ str, transform: [1, 0, 0, 1, x, y], width, hasEOL: false });

describe("itemsToText", () => {
  it("puts items on the same baseline on one line", () => {
    expect(itemsToText([item("Your CTC is", 10, 700), item("Rs. 6,00,000", 70, 700)])).toBe("Your CTC is Rs. 6,00,000");
  });

  it("starts a new line when the baseline moves", () => {
    expect(itemsToText([item("First line", 10, 700), item("Second line", 10, 680)])).toBe("First line\nSecond line");
  });

  it("separates table cells with a bar when there is a wide gap", () => {
    expect(itemsToText([item("Basic", 10, 700), item("1,44,000", 300, 700)])).toBe("Basic | 1,44,000");
  });

  it("keeps words that touch together", () => {
    expect(itemsToText([item("Rs.", 10, 700, 15), item("6,00,000", 25, 700, 40)])).toBe("Rs. 6,00,000");
  });

  it("respects explicit line ends", () => {
    expect(itemsToText([{ str: "One", transform: [1, 0, 0, 1, 10, 700], width: 15, hasEOL: true }, { str: "Two", transform: [1, 0, 0, 1, 10, 700], width: 15, hasEOL: false }])).toBe("One\nTwo");
  });

  it("skips empty items", () => {
    expect(itemsToText([item("", 10, 700), item("Hello", 10, 700)])).toBe("Hello");
  });
});

describe("looksScanned", () => {
  it("flags a document with almost no text", () => {
    expect(looksScanned("  \n ", 2)).toBe(true);
    expect(looksScanned("Page 1", 3)).toBe(true);
  });
  it("accepts a real letter", () => {
    expect(looksScanned("We are pleased to offer you the position. ".repeat(10), 1)).toBe(false);
  });
});
