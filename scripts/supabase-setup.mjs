// One-shot Supabase setup: reads .env.supabase, writes .env, configures Auth URLs, runs migrations + seed.
// Usage: node scripts/supabase-setup.mjs [--no-seed]
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const REF = "yvateuufdvxmaowgcjch";
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3100";
const API = "https://api.supabase.com/v1";

const parseEnv = (file) =>
  existsSync(file)
    ? Object.fromEntries(
        readFileSync(file, "utf8")
          .split("\n")
          .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
          .filter(Boolean)
          .map(([, k, v]) => [k, v.trim().replace(/^"|"$/g, "")]),
      )
    : {};

const cfg = parseEnv(".env.supabase");
const token = cfg.SUPABASE_ACCESS_TOKEN;
const password = cfg.SUPABASE_DB_PASSWORD;
const mgmt = async (path, init = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

let anon = cfg.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let service = cfg.SUPABASE_SERVICE_ROLE_KEY;
let databaseUrl = cfg.DATABASE_URL;
let directUrl = cfg.DIRECT_URL;

if (token) {
  if (!anon || !service) {
    console.log("• Reading API keys via the Management API…");
    const keys = await mgmt(`/projects/${REF}/api-keys?reveal=true`);
    anon ||= keys.find((k) => k.name === "anon")?.api_key;
    service ||= keys.find((k) => k.name === "service_role")?.api_key;
  }
  if (password && !databaseUrl) {
    const pooler = await mgmt(`/projects/${REF}/config/database/pooler`);
    const p = (Array.isArray(pooler) ? pooler : [pooler]).find((x) => x.database_type === "PRIMARY") ?? pooler[0];
    const host = p.db_host;
    const user = p.db_user ?? `postgres.${REF}`;
    const pw = encodeURIComponent(password);
    databaseUrl = `postgresql://${user}:${pw}@${host}:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20&connect_timeout=10&socket_timeout=30`;
    directUrl = `postgresql://${user}:${pw}@${host}:5432/postgres`;
  }
  console.log("• Configuring Auth site URL and redirect allow-list…");
  try {
    await mgmt(`/projects/${REF}/config/auth`, {
      method: "PATCH",
      body: JSON.stringify({ site_url: SITE_URL, uri_allow_list: `${SITE_URL}/**,http://localhost:3000/**` }),
    });
  } catch (e) {
    console.warn(`  ! Skipped (${e.message.slice(0, 160)}). Set Site URL / Redirect URLs in Auth → URL Configuration.`);
  }
}

const missing = Object.entries({ anon, service, databaseUrl, directUrl }).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Missing: ${missing.join(", ")}. Fill .env.supabase (access token + DB password, or keys + DATABASE_URL/DIRECT_URL).`);
  process.exit(1);
}

writeFileSync(
  ".env",
  [
    `DATABASE_URL="${databaseUrl}"`,
    `DIRECT_URL="${directUrl}"`,
    `NEXT_PUBLIC_SUPABASE_URL="https://${REF}.supabase.co"`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY="${anon}"`,
    `SUPABASE_SERVICE_ROLE_KEY="${service}"`,
    `NEXT_PUBLIC_SITE_URL="${SITE_URL}"`,
    "",
  ].join("\n"),
);
console.log("• Wrote .env");

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
run("npx prisma migrate deploy");
run("npx prisma generate");
if (!process.argv.includes("--no-seed")) run("npx prisma db seed");
console.log("✓ Supabase is ready.");
