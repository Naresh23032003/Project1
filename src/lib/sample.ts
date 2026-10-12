import type { Extraction } from "./extract/schema";

// Pre-recorded extraction for the "Try with a sample" button. No model call is made.
export const SAMPLE_LETTER = `Brightfield Technologies Pvt Ltd
Whitefield, Bengaluru

Dear [NAME],

Subject: Offer of employment as Associate Software Engineer

We are pleased to offer you the position of Associate Software Engineer at our Bengaluru office.
Your annual CTC is Rs. 8,40,000.

Component | Amount (INR per annum)
Basic Salary | 3,36,000
House Rent Allowance | 1,68,000
Special Allowance | 1,99,838
Employer PF Contribution | 36,000
Gratuity | 16,162
Variable Pay (target) | 84,000

You will also receive a one-time joining bonus of Rs. 30,000 with your first salary.
The joining bonus is repayable in full if you leave within 12 months of joining.
You must serve the company for at least 18 months from your date of joining or pay Rs. 75,000 to the company.
PF is calculated on the statutory wage ceiling of Rs. 25,000 per month.
The notice period is 90 days.
Your probation period is 3 months.

Regards,
[NAME]
HR Manager
Brightfield Technologies Pvt Ltd
`;

const q = (needle: string) => SAMPLE_LETTER.split("\n").find((l) => l.includes(needle))!.trim();

export const SAMPLE_EXTRACTION: Extraction = {
  employerName: "Brightfield Technologies Pvt Ltd",
  jobTitle: "Associate Software Engineer",
  location: "Bengaluru",
  stateForProfessionalTax: "KA",
  ctcAnnual: 840000,
  components: [
    { label: "Basic Salary", kind: "basic", amount: 336000, frequency: "annual", quote: q("Basic Salary |") },
    { label: "House Rent Allowance", kind: "hra", amount: 168000, frequency: "annual", quote: q("House Rent Allowance |") },
    { label: "Special Allowance", kind: "special_allowance", amount: 199838, frequency: "annual", quote: q("Special Allowance |") },
    { label: "Employer PF Contribution", kind: "employer_pf", amount: 36000, frequency: "annual", quote: q("Employer PF Contribution |") },
    { label: "Gratuity", kind: "gratuity", amount: 16162, frequency: "annual", quote: q("Gratuity |") },
    { label: "Variable Pay (target)", kind: "variable", amount: 84000, frequency: "annual", quote: q("Variable Pay (target)") },
    { label: "Joining bonus", kind: "joining_bonus", amount: 30000, frequency: "one_time", quote: q("one-time joining bonus") },
  ],
  pfBasis: "ceiling",
  pfCeilingAmount: 25000,
  clauses: [
    { type: "joining_bonus_clawback", quote: q("repayable in full"), months: 12, amount: 30000 },
    { type: "service_bond", quote: q("at least 18 months"), months: 18, amount: 75000 },
    { type: "notice_period", quote: q("The notice period is 90 days"), days: 90 },
    { type: "probation", quote: q("Your probation period is 3 months"), months: 3 },
  ],
  notes: [],
};
