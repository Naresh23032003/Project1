import { describe, expect, it } from "vitest";
import { HRA_METRO_CITIES } from "../rules/india";
import { employeePf, professionalTax, wageCodeCheck, hraExemption } from "./payroll";

describe("employee PF", () => {
  it("uses the 25,000 statutory ceiling (in force from 17 September 2026)", () => {
    // 12% of 25,000
    expect(employeePf(40_000, "ceiling")).toBe(3_000);
  });
  it("uses a ceiling the letter states, such as the old 15,000", () => {
    // 12% of 15,000
    expect(employeePf(40_000, "ceiling", 15_000)).toBe(1_800);
  });
  it("uses full basic otherwise", () => {
    // 12% of 40,000
    expect(employeePf(40_000, "full_basic")).toBe(4_800);
  });
  it("uses actual basic when below the ceiling", () => {
    // 12% of 10,000
    expect(employeePf(10_000, "ceiling")).toBe(1_200);
  });
});

describe("professional tax", () => {
  it("Karnataka: nil below 25,000 gross", () => {
    expect(professionalTax("KA", 24_999).annual).toBe(0);
  });
  it("Karnataka: 200 a month and 300 in February from 25,000", () => {
    const r = professionalTax("KA", 25_000);
    expect(r.annual).toBe(2_500);
    expect(r.monthly[1]).toBe(300);
    expect(r.monthly[0]).toBe(200);
  });
  it("Maharashtra men: 175 a month between 7,501 and 10,000", () => {
    expect(professionalTax("MH", 9_000).annual).toBe(2_100);
  });
  it("Maharashtra men: nil up to 7,500", () => {
    expect(professionalTax("MH", 7_500).annual).toBe(0);
  });
  it("Maharashtra men: 200 a month and 300 in February above 10,000", () => {
    expect(professionalTax("MH", 50_000).annual).toBe(2_500);
  });
  it("Maharashtra women: nil up to 25,000", () => {
    expect(professionalTax("MH", 25_000, { female: true }).annual).toBe(0);
  });
  it("Maharashtra women: 2,500 a year above 25,000", () => {
    expect(professionalTax("MH", 30_000, { female: true }).annual).toBe(2_500);
  });
  it("Telangana: bands at 15,000 and 20,000", () => {
    expect(professionalTax("TG", 15_000).annual).toBe(0);
    expect(professionalTax("TG", 18_000).annual).toBe(1_800); // 150 x 12
    expect(professionalTax("TG", 20_001).annual).toBe(2_400); // 200 x 12
  });
  it("West Bengal: each band", () => {
    expect(professionalTax("WB", 10_000).annual).toBe(0);
    expect(professionalTax("WB", 12_000).annual).toBe(1_320); // 110 x 12
    expect(professionalTax("WB", 20_000).annual).toBe(1_560); // 130 x 12
    expect(professionalTax("WB", 30_000).annual).toBe(1_800); // 150 x 12
    expect(professionalTax("WB", 50_000).annual).toBe(2_400); // 200 x 12
  });
  it("Tamil Nadu (Greater Chennai rates from October 2024): half-yearly bands on six months of pay", () => {
    expect(professionalTax("TN", 3_500).annual).toBe(0); // 21,000 per half year
    expect(professionalTax("TN", 4_000).annual).toBe(360); // 24,000 per half year -> 180 x 2
    expect(professionalTax("TN", 6_000).annual).toBe(850); // 36,000 -> 425 x 2
    expect(professionalTax("TN", 8_000).annual).toBe(1_860); // 48,000 -> 930 x 2
    expect(professionalTax("TN", 11_000).annual).toBe(2_050); // 66,000 -> 1,025 x 2
    expect(professionalTax("TN", 50_000).annual).toBe(2_500); // 300,000 -> 1,250 x 2
  });
  it("Gujarat: nil up to 12,000 and 200 a month above it", () => {
    expect(professionalTax("GJ", 12_000).annual).toBe(0);
    expect(professionalTax("GJ", 12_001).annual).toBe(2_400); // 200 x 12
    expect(professionalTax("GJ", 50_000).annual).toBe(2_400);
  });
  it("Kerala: half-yearly bands, nil below 12,000 a half year", () => {
    expect(professionalTax("KL", 1_500).annual).toBe(0); // 9,000 per half year
    expect(professionalTax("KL", 2_000).annual).toBe(240); // 12,000 -> 120 x 2
    expect(professionalTax("KL", 3_000).annual).toBe(360); // 18,000 -> 180 x 2
    expect(professionalTax("KL", 5_000).annual).toBe(600); // 30,000 -> 300 x 2
    expect(professionalTax("KL", 8_000).annual).toBe(900); // 48,000 -> 450 x 2
    expect(professionalTax("KL", 10_000).annual).toBe(1_200); // 60,000 -> 600 x 2
    expect(professionalTax("KL", 13_000).annual).toBe(1_500); // 78,000 -> 750 x 2
    expect(professionalTax("KL", 17_000).annual).toBe(2_000); // 102,000 -> 1,000 x 2
    expect(professionalTax("KL", 21_000).annual).toBe(2_500); // 126,000 -> 1,250 x 2
    expect(professionalTax("KL", 50_000).confidence).toBe("medium");
  });
  it("Delhi and Haryana have none", () => {
    expect(professionalTax("DL", 100_000).annual).toBe(0);
    expect(professionalTax("HR", 100_000).annual).toBe(0);
  });
  it("monthly amounts add up to the annual figure", () => {
    for (const s of ["KA", "MH", "TG", "WB", "TN", "GJ", "KL"] as const) {
      const r = professionalTax(s, 60_000);
      expect(r.monthly.reduce((a, b) => a + b, 0)).toBe(r.annual);
    }
  });
});

describe("wage code check", () => {
  it("flags basic under 50 percent of remuneration", () => {
    // remuneration = 1,000,000 - 40,000 gratuity = 960,000; wages 300,000 = 31.25%
    const r = wageCodeCheck({ basic: 300_000, da: 0, ctc: 1_000_000, gratuity: 40_000 });
    expect(r.wageShare).toBeCloseTo(0.3125, 4);
    expect(r.belowHalf).toBe(true);
    expect(r.effectiveWages).toBe(480_000);
  });
  it("is fine at 50 percent or more", () => {
    const r = wageCodeCheck({ basic: 500_000, da: 0, ctc: 1_000_000, gratuity: 0 });
    expect(r.belowHalf).toBe(false);
    expect(r.effectiveWages).toBe(500_000);
  });
  it("counts DA as wages", () => {
    const r = wageCodeCheck({ basic: 300_000, da: 200_000, ctc: 1_000_000, gratuity: 0 });
    expect(r.belowHalf).toBe(false);
  });
});

describe("metro cities for HRA", () => {
  it("lists the eight cities at 50 percent", () => {
    expect(HRA_METRO_CITIES).toEqual(["Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru", "Hyderabad", "Pune", "Ahmedabad"]);
  });
});

describe("HRA exemption", () => {
  it("takes the lowest of actual HRA, rent minus 10 percent of basic, and 50 percent of basic in a metro", () => {
    // basic 480,000; actual HRA 240,000; rent 300,000 - 48,000 = 252,000; 50% basic = 240,000
    expect(hraExemption({ basic: 480_000, hra: 240_000, rentPaid: 300_000, metro: true })).toBe(240_000);
  });
  it("uses 40 percent of basic outside metros", () => {
    // 40% of 480,000 = 192,000; rent less 10% = 252,000; actual 240,000
    expect(hraExemption({ basic: 480_000, hra: 240_000, rentPaid: 300_000, metro: false })).toBe(192_000);
  });
  it("is zero with no rent", () => {
    expect(hraExemption({ basic: 480_000, hra: 240_000, rentPaid: 0, metro: true })).toBe(0);
  });
});
