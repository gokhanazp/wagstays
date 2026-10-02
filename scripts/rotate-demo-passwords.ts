// Gives every seeded account a unique random password and writes them to .demo-credentials (git-ignored).
// Usage: node --env-file=.env node_modules/.bin/tsx scripts/rotate-demo-passwords.ts
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const db = new PrismaClient();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const strong = () => randomBytes(15).toString("base64url"); // 20 chars

(async () => {
  const users = await db.user.findMany({
    where: { OR: [{ email: { endsWith: "@wagstays.ca" } }, { email: { endsWith: "@example.ca" } }] },
    select: { id: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });
  const lines = ["# WagStays demo accounts — keep private. Regenerate with scripts/rotate-demo-passwords.ts", ""];
  for (const u of users) {
    const password = strong();
    const { error } = await supabase.auth.admin.updateUserById(u.id, { password });
    if (error) throw new Error(`${u.email}: ${error.message}`);
    lines.push(`${u.role.padEnd(7)} ${u.email.padEnd(36)} ${password}`);
  }
  writeFileSync(".demo-credentials", lines.join("\n") + "\n", { mode: 0o600 });
  console.log(`Rotated ${users.length} passwords → .demo-credentials`);
  await db.$disconnect();
})();
