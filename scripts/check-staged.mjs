import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const all = process.argv.includes("--all");
const cmd = all ? "git ls-files" : "git diff --cached --name-only --diff-filter=ACM";
const files = execSync(cmd, { encoding: "utf8" }).split("\n").filter(Boolean);

const skipPath = [
  /^\.claude\/skills\//,
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/,
  /^docs\/KICKOFF\.md$/,
  /^CLAUDE\.md$/,
  /^scripts\/check-staged\.mjs$/,
  /\.(png|jpe?g|gif|webp|ico|pdf|docx|woff2?|ttf)$/i,
];

const dash = new RegExp("[" + String.fromCharCode(0x2014, 0x2013) + "]");
const secret = /(sk-ant-[A-Za-z0-9_-]{20,}|gsk_[A-Za-z0-9]{20,})/;
const banned = new RegExp(
  "\\b(delve|leverage[sd]?|seamless(ly)?|robust|elevate[sd]?|unlock(s|ed|ing)?|empower(s|ed|ing)?|game-changer|cutting-edge|revolutionize[sd]?|supercharge[sd]?|tapestry|testament|navigate the complexities|in today's fast-paced world|it's worth noting|furthermore|moreover)\\b|(^|[.!?]\\s+)additionally\\b",
  "i",
);

let failed = false;
for (const f of files) {
  const secretOnly = skipPath.some((re) => re.test(f));
  if (/\.(png|jpe?g|gif|webp|ico|pdf|docx|woff2?|ttf)$/i.test(f)) continue;
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  text.split("\n").forEach((line, i) => {
    if (secret.test(line) && f !== "scripts/check-staged.mjs") {
      console.error(`${f}:${i + 1}: looks like an API key`);
      failed = true;
    }
    if (secretOnly) return;
    if (dash.test(line)) {
      console.error(`${f}:${i + 1}: em or en dash`);
      failed = true;
    }
    if (banned.test(line)) {
      console.error(`${f}:${i + 1}: banned word`);
      failed = true;
    }
  });
}
if (failed) process.exit(1);
