// Verifies every language has exactly the English keys, with the same {placeholders} and <tags>.
// Usage: npm run i18n:check   (exit code 1 on any mismatch)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = new URL("../messages/", import.meta.url).pathname;
const langs = readdirSync(dir).filter((d) => !d.includes("."));
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, String(v)]]));
const load = (lang) =>
  Object.fromEntries(
    readdirSync(join(dir, lang))
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) => flatten(JSON.parse(readFileSync(join(dir, lang, f), "utf8")), `${f.replace(".json", "")}.`)),
  );
// top-level ICU argument names and rich-text tags (plural/select bodies may legitimately differ)
const args = (s) => [...new Set([...s.matchAll(/\{\s*([a-zA-Z0-9_]+)\s*[,}]/g)].map((m) => m[1]))].sort().join(",");
const tags = (s) => [...new Set([...s.matchAll(/<\/?([a-zA-Z0-9]+)>/g)].map((m) => m[1]))].sort().join(",");

const en = load("en");
let problems = 0;
for (const lang of langs.filter((l) => l !== "en")) {
  const other = load(lang);
  for (const k of Object.keys(en)) {
    if (!(k in other)) (problems++, console.log(`${lang}: missing ${k}`));
    else if (args(en[k]) !== args(other[k])) (problems++, console.log(`${lang}: placeholders differ in ${k}: {${args(en[k])}} vs {${args(other[k])}}`));
    else if (tags(en[k]) !== tags(other[k])) (problems++, console.log(`${lang}: tags differ in ${k}: <${tags(en[k])}> vs <${tags(other[k])}>`));
  }
  for (const k of Object.keys(other)) if (!(k in en)) (problems++, console.log(`${lang}: extra key ${k}`));
}
console.log(problems ? `\n${problems} problem(s)` : `i18n OK — ${Object.keys(en).length} keys × ${langs.length} languages`);
process.exit(problems ? 1 : 0);
