// Fails if a secret or a server-only variable name shows up in the code shipped to browsers.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = ".next/static";
const needles = [
  /sk-ant-/,
  /gsk_[A-Za-z0-9]{10,}/,
  /GROQ_API_KEY/,
  /ANTHROPIC_API_KEY/,
  /TURNSTILE_SECRET_KEY/,
  /UPSTASH_REDIS_REST_TOKEN/,
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let bad = 0;
let files = 0;
for (const f of walk(root)) {
  if (!/\.(js|css|html|json|map|txt)$/.test(f)) continue;
  files++;
  const text = readFileSync(f, "utf8");
  for (const re of needles) {
    if (re.test(text)) {
      console.error(`${f}: matches ${re}`);
      bad++;
    }
  }
}
console.log(`scanned ${files} files in ${root}, ${bad} problems`);
process.exit(bad ? 1 : 0);
