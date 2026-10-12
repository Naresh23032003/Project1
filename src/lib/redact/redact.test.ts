import { describe, expect, it } from "vitest";
import { applyRedactions, findRedactions, redact } from "./redact";

describe("contact details", () => {
  it("removes email addresses", () => {
    const r = redact("Write to hr.team+offers@acme-tech.co.in for questions.");
    expect(r.redacted).not.toContain("@");
    expect(r.redacted).toContain("[EMAIL]");
  });

  it.each([
    "+91 98765 43210",
    "+91-9876543210",
    "98765-43210",
    "9876543210",
    "080 2345 6789",
    "080-23456789",
    "+91 80 4567 8901",
    "+91-44-4000-1122",
    "+91 124 456 7890",
  ])("removes the phone number %s", (phone) => {
    const r = redact(`Call us on ${phone} today.`);
    expect(r.redacted).toContain("[PHONE]");
    expect(r.redacted).not.toMatch(/\d{4}/);
  });

  it("removes PAN", () => {
    const r = redact("PAN: ABCDE1234F is on file.");
    expect(r.redacted).toContain("[PAN]");
    expect(r.redacted).not.toContain("ABCDE1234F");
  });

  it("removes Aadhaar style numbers with and without spaces", () => {
    expect(redact("Aadhaar 1234 5678 9012").redacted).toContain("[AADHAAR]");
    expect(redact("Aadhaar 123456789012").redacted).toContain("[AADHAAR]");
  });

  it("removes employee and reference ids but keeps the label", () => {
    const r = redact("Employee ID: EMP-10234\nRef No: HR/OFF/2026/0098");
    expect(r.redacted).toContain("Employee ID:");
    expect(r.redacted).not.toContain("10234");
    expect(r.redacted).not.toContain("0098");
  });

  it("removes street address lines but keeps the work city", () => {
    const r = redact("Plot 14, 3rd Cross, Indiranagar, Bengaluru - 560038\nWork location: Bengaluru");
    expect(r.redacted).not.toContain("Indiranagar");
    expect(r.redacted).not.toContain("560038");
    expect(r.redacted).toContain("Work location: Bengaluru");
  });

  it("removes address lines that end in a PIN code even without a street word", () => {
    expect(redact("H.No. 8-2-120, Banjara Hills, Hyderabad - 500034").redacted).not.toContain("Banjara");
    expect(redact("Infopark, Kakkanad, Kochi - 682042").redacted).not.toContain("Kakkanad");
  });

  it("keeps pay lines that happen to end in six digits", () => {
    const line = "Basic salary, per year, Rs - 600000";
    expect(redact(line).redacted).toBe(line);
  });

  it("removes a PIN code that follows a PIN label", () => {
    expect(redact("PIN code: 560038").redacted).not.toContain("560038");
  });
});

describe("names", () => {
  it("removes a titled name in the greeting", () => {
    const r = redact("Dear Mr. Rahul Sharma,\nWe are pleased to offer you");
    expect(r.redacted).not.toContain("Rahul");
    expect(r.redacted).not.toContain("Sharma");
    expect(r.redacted).toContain("[NAME]");
  });

  it("removes a bare first name in the greeting", () => {
    const r = redact("Dear Priya,\nWelcome");
    expect(r.redacted).not.toContain("Priya");
  });

  it("removes an uppercase titled name on the To line", () => {
    const r = redact("To,\nMR. PRAKASH KUMAR\nFLAT 7");
    expect(r.redacted).not.toContain("PRAKASH");
    expect(r.redacted).not.toContain("KUMAR");
  });

  it("keeps generic greetings", () => {
    expect(redact("Dear Candidate,\nWelcome").redacted).toContain("Dear Candidate");
    expect(redact("Dear Sir/Madam,\nWelcome").redacted).toContain("Dear Sir/Madam");
  });

  it("removes labelled names", () => {
    const r = redact("Candidate Name: Anita Verma\nDesignation: Software Engineer");
    expect(r.redacted).not.toContain("Anita");
    expect(r.redacted).toContain("Software Engineer");
  });

  it("removes the signatory name but keeps the designation", () => {
    const r = redact("Regards,\nSuresh Iyer\nHR Manager\nAcme Technologies Pvt Ltd");
    expect(r.redacted).not.toContain("Suresh");
    expect(r.redacted).toContain("HR Manager");
    expect(r.redacted).toContain("Acme Technologies Pvt Ltd");
  });

  it("removes father and spouse names", () => {
    const r = redact("Anita Verma, D/o Mahesh Verma, resident of Pune");
    expect(r.redacted).not.toContain("Mahesh");
  });

  it("keeps the company name", () => {
    expect(redact("Acme Technologies Pvt Ltd is pleased to offer").redacted).toContain("Acme Technologies Pvt Ltd");
  });
});

describe("money and dates stay", () => {
  it.each([
    "Basic salary: Rs. 20,000 per month",
    "Annual CTC of ₹ 12,00,000",
    "Your CTC is 8.5 LPA",
    "Fixed pay 1200000 per annum",
    "Total 1,20,00,000 per year",
    "Joining bonus Rs 50,000 payable within 30 days",
    "Date of joining: 15th July 2026",
    "Date: 15/07/2026",
    "Variable pay 15% of CTC",
    "HRA 10,000 Special allowance 25,000 Basic 20,000",
    "Notice period 90 days",
  ])("keeps: %s", (line) => {
    const r = redact(line);
    expect(r.redacted).toBe(line);
    expect(r.spans).toHaveLength(0);
  });
});

describe("spans", () => {
  it("reports spans against the original text", () => {
    const text = "Mail me@x.com now";
    const spans = findRedactions(text);
    expect(spans).toHaveLength(1);
    expect(text.slice(spans[0]!.start, spans[0]!.end)).toBe("me@x.com");
    expect(spans[0]!.kind).toBe("email");
  });

  it("applies manual spans too", () => {
    const text = "Joining Zenith Corp soon";
    const out = applyRedactions(text, [{ start: 8, end: 14, kind: "name" }]);
    expect(out).toBe("Joining [NAME] Corp soon");
  });

  it("merges overlapping matches", () => {
    const spans = findRedactions("Employee ID: ABCDE1234F");
    expect(spans.length).toBeLessThanOrEqual(1);
  });
});
