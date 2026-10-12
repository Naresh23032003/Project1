import type { Clause, Extraction } from "../extract/schema";
import { formatINR, formatPercent } from "../format";

export interface Flag {
  id: string;
  level: "red" | "yellow";
  title: string;
  quote: string | null;
  why: string;
  ask: string;
}

export interface FlagContext {
  ctcAnnual: number;
  variableAnnual: number;
  assumedSplit: boolean;
  wageShareBelowHalf: boolean;
}

const NOTICE_YELLOW_DAYS = 60;
const NOTICE_RED_DAYS = 90;
const VARIABLE_YELLOW = 0.15;
const VARIABLE_RED = 0.3;
const LONG_PROBATION_MONTHS = 6;

function period(c: Clause): string {
  if (c.months) return `${c.months} months`;
  if (c.days) return `${c.days} days`;
  return "the period in the letter";
}

function fromClause(c: Clause): Flag | null {
  const base = { id: c.type, quote: c.quote };
  const money = c.amount ? formatINR(c.amount) : null;
  switch (c.type) {
    case "service_bond":
      return {
        ...base,
        level: "red",
        title: "Service bond",
        why: `If you leave before ${c.months ? `${c.months} months` : "the bond period"} are up, you may have to pay ${money ?? "a penalty"}. That can trap you in a job you want to leave.`,
        ask: "How much is the bond, how long does it run, and does the amount drop the longer I stay?",
      };
    case "training_cost_recovery":
      return {
        ...base,
        level: "red",
        title: "Training cost recovery",
        why: `The company can ask you to pay back training costs${money ? ` (up to ${money})` : ""} if you leave early. Those costs are often set at a number the company chooses.`,
        ask: "What counts as training cost, what is the maximum, and is it reduced month by month?",
      };
    case "joining_bonus_clawback":
      return {
        ...base,
        level: "red",
        title: "Joining bonus you may have to return",
        why: `The joining bonus${money ? ` of ${money}` : ""} has to be repaid if you leave within ${period(c)}. Check if it's paid before or after tax, because you may have to return the full gross amount.`,
        ask: "If I leave early, do I repay the gross amount or only what I received after tax?",
      };
    case "non_compete":
      return {
        ...base,
        level: "red",
        title: "Non-compete clause",
        why: "This restricts where you can work after you leave. Courts in India often don't enforce these after employment ends, but it can still cause trouble with a future employer.",
        ask: "Which companies or roles count as competing, and for how long does this apply?",
      };
    case "non_solicit":
      return {
        ...base,
        level: "yellow",
        title: "Non-solicitation clause",
        why: "You can't invite clients or colleagues to leave with you. This is common, but check how long it lasts.",
        ask: "How long does the non-solicitation period last and who does it cover?",
      };
    case "notice_period": {
      const days = c.days ?? (c.months ? c.months * 30 : undefined);
      if (days === undefined || days <= NOTICE_YELLOW_DAYS) return null;
      return {
        ...base,
        level: days > NOTICE_RED_DAYS ? "red" : "yellow",
        title: `Long notice period (${period(c)})`,
        why: `A notice period over ${NOTICE_YELLOW_DAYS} days makes it hard to switch jobs, because new employers often won't wait. Ask if the company can buy out or shorten it.`,
        ask: "Can the notice period be shortened or bought out, and is it the same during probation?",
      };
    }
    case "probation": {
      if (!c.months && !c.days) {
        return {
          ...base,
          level: "yellow",
          title: "Probation terms are vague",
          why: "The letter mentions probation without saying how long it lasts or how you get confirmed. That leaves the decision open to the company.",
          ask: "How long is probation and what has to happen for me to be confirmed?",
        };
      }
      const months = c.months ?? (c.days ?? 0) / 30;
      if (months > LONG_PROBATION_MONTHS) {
        return {
          ...base,
          level: "yellow",
          title: "Long probation",
          why: `Probation of ${period(c)} is longer than usual. Benefits like leave or a shorter notice period may not apply until you're confirmed.`,
          ask: "Which benefits are paused during probation, and is the notice period different?",
        };
      }
      return null;
    }
    case "unpaid_training":
      return {
        ...base,
        level: "red",
        title: "Unpaid training period",
        why: "You may work or train without a salary at the start. Check whether it counts as service and whether you'd owe money if it ends early.",
        ask: "How long is the unpaid period, and do I get a stipend or any pay for it?",
      };
    case "relocation":
      return {
        ...base,
        level: "yellow",
        title: "Relocation clause",
        why: "The company can move you to another city or you may have to repay relocation money if you leave. Check who pays for the move and what happens to your pay.",
        ask: "Who covers relocation costs, and do I have to repay anything if I leave?",
      };
    case "location_change":
      return {
        ...base,
        level: "yellow",
        title: "Location can change at the company's choice",
        why: "You may be posted anywhere with little notice. That can mean rent, travel and family costs you didn't plan for.",
        ask: "Is there any limit on transfers, and is there notice or support if I'm moved?",
      };
    case "shift_change":
      return {
        ...base,
        level: "yellow",
        title: "Shifts can change at the company's choice",
        why: "Your working hours or shift timings can be changed without your say. This matters if you depend on commute or study timings.",
        ask: "What are the normal working hours, and is there extra pay or notice for night or odd shifts?",
      };
    case "variable_pay_discretion":
      return {
        ...base,
        level: "yellow",
        title: "Variable pay at the company's discretion",
        why: "The company decides whether and how much variable pay you get. Don't count on it when you plan your monthly budget.",
        ask: "What decides the variable payout and what percentage did people receive in recent years?",
      };
    case "ctc_includes_one_time":
      return {
        ...base,
        level: "yellow",
        title: "CTC includes one-time money",
        why: "Some of the CTC is a one-time payment, so your regular yearly pay is lower than the headline number.",
        ask: "Which parts of the CTC are one-time, and what will my yearly pay be from the second year?",
      };
    case "moonlighting":
      return {
        ...base,
        level: "yellow",
        title: "Limits on other work",
        why: "The letter restricts any side work or freelancing. Check how wide this is, for example whether it covers unpaid projects or teaching.",
        ask: "Does this cover weekend projects, freelancing or teaching, and can I get written approval?",
      };
    case "ip_assignment":
      return {
        ...base,
        level: "yellow",
        title: "Company owns your work",
        why: "Anything you make may belong to the company, possibly including things you build in your own time. Check that it only covers work related to your job.",
        ask: "Does this cover only work for the company, or also things I build on my own time?",
      };
    default:
      return null;
  }
}

export function buildFlags(extraction: Extraction, ctx: FlagContext): Flag[] {
  const flags: Flag[] = [];
  const seen = new Set<string>();
  const add = (f: Flag | null) => {
    if (!f || seen.has(f.id)) return;
    seen.add(f.id);
    flags.push(f);
  };

  for (const c of extraction.clauses) add(fromClause(c));

  if (ctx.ctcAnnual > 0) {
    const share = ctx.variableAnnual / ctx.ctcAnnual;
    if (share > VARIABLE_YELLOW) {
      const variable = extraction.components.find((c) => c.kind === "variable" || c.kind === "retention_bonus");
      add({
        id: "variable_share",
        level: share > VARIABLE_RED ? "red" : "yellow",
        title: `${formatPercent(share)} of your CTC is variable`,
        quote: variable?.quote ?? null,
        why: `${formatINR(ctx.variableAnnual)} a year depends on performance or conditions. If you don't get it, your real yearly pay is lower than the CTC.`,
        ask: "How is the variable paid out, and what did people in this role actually receive last year?",
      });
    }
  }

  const order = { red: 0, yellow: 1 } as const;
  return flags.map((f, i) => ({ f, i })).sort((a, b) => order[a.f.level] - order[b.f.level] || a.i - b.i).map((x) => x.f);
}

export function buildQuestions(extraction: Extraction, flags: Flag[], ctx: FlagContext): string[] {
  const q: string[] = flags.map((f) => f.ask);
  if (ctx.assumedSplit) q.push("Can you share the full salary breakup (basic, HRA and allowances) in writing?");
  if (extraction.pfBasis === "not_stated") q.push("Is PF calculated on my full basic or capped at the wage ceiling (Rs 25,000 a month since 17 September 2026)?");
  if (ctx.variableAnnual > 0 && !flags.some((f) => f.id === "variable_share")) {
    q.push("When is the variable pay paid out, and what percentage did people in this role receive last year?");
  }
  if (ctx.wageShareBelowHalf) {
    q.push("Under the new labour codes, will my PF and gratuity be calculated on a higher wage base than my basic?");
  }
  return Array.from(new Set(q));
}
