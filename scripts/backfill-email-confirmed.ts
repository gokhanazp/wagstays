// One-off / re-runnable: copies Supabase auth email_confirmed_at into User.emailConfirmedAt.
// node --env-file=.env node_modules/.bin/tsx scripts/backfill-email-confirmed.ts
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  let page = 1, updated = 0, unconfirmed = 0;
  for (;;) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
    const { users } = (await res.json()) as { users: { id: string; email_confirmed_at: string | null }[] };
    if (!users?.length) break;
    for (const u of users) {
      if (!u.email_confirmed_at) { unconfirmed++; continue; }
      const r = await db.user.updateMany({ where: { id: u.id, emailConfirmedAt: null }, data: { emailConfirmedAt: new Date(u.email_confirmed_at) } });
      updated += r.count;
    }
    if (users.length < 200) break;
    page++;
  }
  console.log({ updated, unconfirmed });
  await db.$disconnect();
})();
