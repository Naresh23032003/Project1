import { describe, expect, it } from "vitest";
import { newRegimeTax, oldRegimeTax } from "./tax";

// Expected values are worked out by hand from the slab table:
// 0-4L nil, 4-8L 5%, 8-12L 10%, 12-16L 15%, 16-20L 20%, 20-24L 25%, 24L+ 30%.
// Cumulative tax at the top of each band: 20,000 / 60,000 / 120,000 / 200,000 / 300,000.

describe("new regime slabs", () => {
  it("charges nothing up to 4 lakh", () => {
    expect(newRegimeTax(400_000).total).toBe(0);
  });

  it("charges nothing at 8 lakh because the rebate wipes the 20,000 slab tax", () => {
    const r = newRegimeTax(800_000);
    expect(r.slabTax).toBe(20_000);
    expect(r.total).toBe(0);
  });

  it("charges 5 percent between 4 and 8 lakh before the rebate", () => {
    expect(newRegimeTax(600_000).slabTax).toBe(10_000);
  });

  it("charges nothing at exactly 12 lakh", () => {
    const r = newRegimeTax(1_200_000);
    expect(r.slabTax).toBe(60_000);
    expect(r.total).toBe(0);
  });

  it("collects 1 rupee at 12,00,001 through marginal relief", () => {
    const r = newRegimeTax(1_200_001);
    expect(r.taxAfterRebate).toBe(1);
    expect(r.total).toBe(1);
  });

  it("limits tax to the income above 12 lakh at 12,10,000", () => {
    // slab tax would be 61,500; relief caps it at 10,000; cess 400
    const r = newRegimeTax(1_210_000);
    expect(r.slabTax).toBe(61_500);
    expect(r.taxAfterRebate).toBe(10_000);
    expect(r.total).toBe(10_400);
  });

  it("is still capped at 12,70,000 where excess income is 70,000", () => {
    // slab tax 60,000 + 15% of 70,000 = 70,500; capped at 70,000; cess 2,800
    const r = newRegimeTax(1_270_000);
    expect(r.taxAfterRebate).toBe(70_000);
    expect(r.total).toBe(72_800);
  });

  it("stops helping once the slab tax is below the excess (12,71,000)", () => {
    // slab 60,000 + 15% of 71,000 = 70,650 which is below the 71,000 excess; cess 2,826
    const r = newRegimeTax(1_271_000);
    expect(r.taxAfterRebate).toBe(70_650);
    expect(r.total).toBe(73_476);
  });

  it("computes the 16 lakh and 20 lakh band tops", () => {
    expect(newRegimeTax(1_600_000).total).toBe(124_800); // 120,000 + 4%
    expect(newRegimeTax(2_000_000).total).toBe(208_000); // 200,000 + 4%
  });

  it("computes 24 lakh and 30 lakh", () => {
    expect(newRegimeTax(2_400_000).total).toBe(312_000); // 300,000 + 4%
    expect(newRegimeTax(3_000_000).total).toBe(499_200); // 480,000 + 4%
  });

  it("adds no surcharge at exactly 50 lakh", () => {
    // 300,000 + 30% of 26 lakh = 1,080,000; cess 43,200
    const r = newRegimeTax(5_000_000);
    expect(r.surcharge).toBe(0);
    expect(r.total).toBe(1_123_200);
  });

  it("applies 10 percent surcharge at 60 lakh", () => {
    // slab 1,380,000; surcharge 138,000; cess 4% of 1,518,000 = 60,720
    const r = newRegimeTax(6_000_000);
    expect(r.surcharge).toBe(138_000);
    expect(r.total).toBe(1_578_720);
  });

  it("gives surcharge marginal relief just above 50 lakh", () => {
    // slab 1,095,000; capped total before cess = 1,080,000 + 50,000 = 1,130,000
    const r = newRegimeTax(5_050_000);
    expect(r.taxAfterRebate).toBe(1_095_000);
    expect(r.surcharge).toBe(35_000);
    expect(r.total).toBe(1_175_200);
  });

  it("gives surcharge marginal relief just above 1 crore", () => {
    // slab 2,595,000; at 1 crore tax+surcharge is 2,580,000 + 258,000 = 2,838,000
    // cap = 2,838,000 + 50,000 = 2,888,000; surcharge = 293,000; cess 115,520
    const r = newRegimeTax(10_050_000);
    expect(r.surcharge).toBe(293_000);
    expect(r.total).toBe(3_003_520);
  });

  it("caps the new regime surcharge at 25 percent above 5 crore", () => {
    // slab 300,000 + 30% of (6 crore - 24 lakh) = 300,000 + 17,280,000 = 17,580,000
    const r = newRegimeTax(60_000_000);
    expect(r.slabTax).toBe(17_580_000);
    expect(r.surcharge).toBe(4_395_000);
  });
});

describe("old regime slabs", () => {
  it("charges nothing at 5 lakh because of the 12,500 rebate", () => {
    const r = oldRegimeTax(500_000);
    expect(r.slabTax).toBe(12_500);
    expect(r.total).toBe(0);
  });

  it("has no marginal relief just above 5 lakh", () => {
    // 12,500 + 20% of 10,000 = 14,500; cess 580
    expect(oldRegimeTax(510_000).total).toBe(15_080);
  });

  it("computes 8 lakh", () => {
    // 12,500 + 20% of 3 lakh = 72,500; cess 2,900
    expect(oldRegimeTax(800_000).total).toBe(75_400);
  });

  it("computes 12 lakh", () => {
    // 12,500 + 100,000 + 30% of 2 lakh = 172,500; cess 6,900
    expect(oldRegimeTax(1_200_000).total).toBe(179_400);
  });

  it("charges nothing up to 2.5 lakh", () => {
    expect(oldRegimeTax(250_000).total).toBe(0);
  });
});
