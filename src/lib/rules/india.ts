// Every number here carries a lastVerified date and a source. Government sites could not be fetched from the
// build environment, but web search returned text from several official pages. "official" below means the figure
// was confirmed in text from a government page returned by search. "secondary" means only published explainers
// and news reports agreed. Nothing here was read directly from a gazette PDF.

export const LAST_VERIFIED = "2026-10-12";

export interface Slab {
  upTo: number;
  rate: number;
}

// New regime. The slab ladder is official (income tax department ITR-2 FAQ). That a Budget 2026 left it unchanged for
// FY 2026-27 comes from news coverage (storyboard18.com). The Income-tax Act 2025 took effect on 1 April 2026 with rates
// unchanged (official press release). lastVerified 2026-10-12.
export const NEW_REGIME_SLABS: Slab[] = [
  { upTo: 400_000, rate: 0 },
  { upTo: 800_000, rate: 0.05 },
  { upTo: 1_200_000, rate: 0.1 },
  { upTo: 1_600_000, rate: 0.15 },
  { upTo: 2_000_000, rate: 0.2 },
  { upTo: 2_400_000, rate: 0.25 },
  { upTo: Infinity, rate: 0.3 },
];

// Old regime. The 2.5 lakh basic exemption and the Rs 12,500 rebate up to 5 lakh taxable income are official (incometaxindia.gov.in
// FAQs, found by search). The 5, 20 and 30 percent rates are long-standing and were not shown in the pages found.
// lastVerified 2026-10-12.
export const OLD_REGIME_SLABS: Slab[] = [
  { upTo: 250_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

// Standard deduction for salaried. New regime 75,000 is official (PIB: the 12 lakh threshold becomes 12.75 lakh for the salaried
// because of it). lastVerified 2026-10-12.
export const STANDARD_DEDUCTION_NEW = 75_000;
export const STANDARD_DEDUCTION_OLD = 50_000;

// Rebate for resident individuals. New: up to 60,000 on taxable income up to 12 lakh, with marginal relief above it
// (official: PIB and income tax department pages). Old: up to 12,500 on taxable income up to 5 lakh, no marginal relief
// (official). lastVerified 2026-10-12.
export const REBATE_NEW = { incomeLimit: 1_200_000, maxRebate: 60_000 };
export const REBATE_OLD = { incomeLimit: 500_000, maxRebate: 12_500 };

// Health and education cess. Long-standing. lastVerified 2026-10-12.
export const CESS_RATE = 0.04;

// Surcharge on tax. The new regime is capped at 25 percent. Source (secondary): tax2win.in surcharge guide. lastVerified 2026-10-12.
export const SURCHARGE_NEW: { above: number; rate: number }[] = [
  { above: 5_000_000, rate: 0.1 },
  { above: 10_000_000, rate: 0.15 },
  { above: 20_000_000, rate: 0.25 },
];
export const SURCHARGE_OLD: { above: number; rate: number }[] = [
  { above: 5_000_000, rate: 0.1 },
  { above: 10_000_000, rate: 0.15 },
  { above: 20_000_000, rate: 0.25 },
  { above: 50_000_000, rate: 0.37 },
];

export const MAX_80C = 150_000;

// Employee PF. Rate 12 percent of wages up to the statutory wage ceiling.
// The ceiling rose from Rs 15,000 to Rs 25,000 a month with effect from 17 September 2026 (Cabinet decision, gazette
// notification S.O. 5109(E)). Sources (official): PIB press releases PRID 2310973, 2311548, 2313829 and 2313790, and the
// Labour Ministry release at labour.gov.in. Those releases state the employer side; the employee side is taken to match
// (EPF Scheme para 29 sets both at 12 percent). lastVerified 2026-10-12.
export const PF_RATE = 0.12;
export const PF_WAGE_CEILING = 25_000;
export const PF_WAGE_CEILING_BEFORE_SEP_2026 = 15_000;
export const PF_CEILING_EFFECTIVE = "17 September 2026";

// HRA exemption: 50 percent of basic plus DA in metro cities, 40 percent elsewhere (old regime only).
// Income-tax Rules 2026 (notified 20 March 2026, in force 1 April 2026) keep the metro/non-metro split (official: ITR
// validation rules for AY 2026-27 on incometax.gov.in). Four cities were added to the original Delhi, Mumbai, Kolkata and
// Chennai: Bengaluru, Hyderabad, Pune and Ahmedabad (secondary: taxupdate.in, upstox.com, taxguru.in; the gazette PDF
// itself was not read). lastVerified 2026-10-12.
export const HRA_METRO_CITIES = ["Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru", "Hyderabad", "Pune", "Ahmedabad"];

// Gratuity: 15/26 of last drawn wages per year of service; about 4.81 percent of basic is the usual CTC allocation.
// Secondary. lastVerified 2026-10-12.
export const GRATUITY_PERCENT_OF_BASIC = 0.0481;

// Labour Codes in force from 21 Nov 2025. Section 2(y) of the Code on Wages: wages are basic, dearness allowance and retaining
// allowance, and if the listed excluded payments exceed one half of total remuneration the excess is added back (official: Code
// text on labour.gov.in and indiacode.nic.in, found by search). Labour Ministry FAQs say gratuity is left out of total
// remuneration for this test (official, but the extracted text was inconsistent). lastVerified 2026-10-12.
export const WAGE_SHARE_MINIMUM = 0.5;

// Default split used only when a letter gives a CTC with no breakup. All shown to the user and editable.
export const DEFAULT_SPLIT = { basicShareOfCtc: 0.4, hraShareOfBasic: 0.5 };

export type StateCode = "KA" | "MH" | "TN" | "TG" | "WB" | "GJ" | "KL" | "DL" | "HR" | "OTHER";

export const STATE_NAMES: Record<StateCode, string> = {
  KA: "Karnataka",
  MH: "Maharashtra",
  TN: "Tamil Nadu",
  TG: "Telangana",
  WB: "West Bengal",
  GJ: "Gujarat",
  KL: "Kerala",
  DL: "Delhi",
  HR: "Haryana",
  OTHER: "Another state",
};

// Professional tax. Karnataka, Maharashtra, Telangana and West Bengal were confirmed in text from official state pages
// returned by search (official). Tamil Nadu uses the revised Greater Chennai Corporation rates. Gujarat and Kerala are
// described next to each table. lastVerified 2026-10-12.

// Karnataka (official: ptax.karnataka.gov.in FAQ and employer portal). Exempt below 25,000 a month since 1 April 2023.
// 200 a month and 300 for February (notification dated 15 April 2025, as shown on the employer portal for February 2026).
export const PT_KARNATAKA = { threshold: 25_000, regular: 200, february: 300 };

// Maharashtra (official: mahagst.gov.in rate schedule updated to 31 March 2025). Men: nil to 7,500, 175 to 10,000, then
// 2,500 a year as 200 a month and 300 in February. Women: nil to 25,000, then the same 200 and 300 pattern.
export const PT_MAHARASHTRA = {
  maleBands: [
    { above: 10_000, regular: 200, february: 300 },
    { above: 7_500, regular: 175, february: 175 },
  ],
  femaleThreshold: 25_000,
  femaleRate: { regular: 200, february: 300 },
};

// Telangana (official: tgct.gov.in PT schedule and FAQ). Up to 15,000 nil, 15,001 to 20,000 150, above 20,000 200.
export const PT_TELANGANA = [
  { above: 20_000, monthly: 200 },
  { above: 15_000, monthly: 150 },
];

// West Bengal (official: wbcomtax.gov.in schedule in force from 1 April 2014). Nil up to 10,000, then 110, 130, 150, 200.
export const PT_WEST_BENGAL = [
  { above: 40_000, monthly: 200 },
  { above: 25_000, monthly: 150 },
  { above: 15_000, monthly: 130 },
  { above: 10_000, monthly: 110 },
];

// Gujarat (official: commercialtax.gujarat.gov.in rate table in force from 1 April 2022). Up to 12,000 a month nil, more
// than 12,000 is 200 a month. The older 80 and 150 bands I had here were from outdated sources.
export const PT_GUJARAT = [{ above: 12_000, monthly: 200 }];

// Half-yearly states: bands are by six months of pay, [exclusive lower bound, amount per half year].
// Tamil Nadu: Greater Chennai Corporation revised rates from 1 October 2024 (circular dated 20 January 2025). The corporation's
// own table (official) shows the 180 column for the 21,001 to 30,000 band; the full set below is from HR advisory sites that
// agree with each other (secondary). Other Tamil Nadu local bodies set their own amounts within the same income bands.
export const PT_TAMIL_NADU = [
  { above: 75_000, halfYear: 1_250 },
  { above: 60_000, halfYear: 1_025 },
  { above: 45_000, halfYear: 930 },
  { above: 30_000, halfYear: 425 },
  { above: 21_000, halfYear: 180 },
];

// Kerala: the 12,000 a half-year threshold and the 2,500 a year cap are official (Kochi Municipal Corporation, Kerala State Audit
// Department). The band amounts agree across every secondary source found (deskera, adityabirlacapital, coverfox, indiafilings,
// taxgarden), but no official page listing them was found.
export const PT_KERALA = [
  { atLeast: 125_000, halfYear: 1_250 },
  { atLeast: 100_000, halfYear: 1_000 },
  { atLeast: 75_000, halfYear: 750 },
  { atLeast: 60_000, halfYear: 600 },
  { atLeast: 45_000, halfYear: 450 },
  { atLeast: 30_000, halfYear: 300 },
  { atLeast: 18_000, halfYear: 180 },
  { atLeast: 12_000, halfYear: 120 },
];
