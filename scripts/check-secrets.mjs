import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const roots = ["src", "shared", "worker", "supabase", "docs", "tests"];
const patterns = [
  /AIza[0-9A-Za-z_-]{30,}/,
  /https:\/\/chat\.googleapis\.com\/[^\s'"`]*[?&](?:key|token)=[^\s'"`]+/,
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
];
let errors = [];
function walk(path) {
  for (const item of readdirSync(path, { withFileTypes: true })) {
    const f = join(path, item.name);
    if (item.isDirectory()) walk(f);
    else if (/\.(?:ts|tsx|json|sql|md|py|yml)$/.test(f)) {
      const s = readFileSync(f, "utf8");
      if (patterns.some((p) => p.test(s))) errors.push(f);
    }
  }
}
roots.forEach(walk);
if (errors.length) {
  console.error("Possible secrets:", errors);
  process.exit(1);
}
console.log("Secret scan passed for source, tests, SQL and docs.");
