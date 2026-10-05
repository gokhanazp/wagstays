// Gives a handful of DEMO sitters realistic add-on rates (extra pets, holiday rate, puppy surcharge) so the
// multi-pet pricing is visible on search, profiles and checkout. Idempotent: it sets fixed target values and
// only touches services of the demo slugs below whose account is a seeded `@wagstays.ca` user.
// Every other sitter stays one-pet-only. Prints each service before → after.
//
// Usage: node --env-file=.env node_modules/.bin/tsx scripts/demo-addon-rates.ts [--dry-run]
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

type Rates = { maxPetsPerBooking?: number; additionalPetPriceCents?: number | null; holidayPriceCents?: number | null; puppyPriceCents?: number | null };
type Plan = { boardingCapacity?: number; services: Partial<Record<"DOG_WALKING" | "BOARDING" | "DAY_CARE" | "DROP_IN", Rates>> };

const PLANS: Record<string, Plan> = {
  "sarah-mitchell": {
    boardingCapacity: 2,
    services: {
      DOG_WALKING: { maxPetsPerBooking: 2, additionalPetPriceCents: 1200 },
      BOARDING: { maxPetsPerBooking: 2, additionalPetPriceCents: 2500, holidayPriceCents: 8500, puppyPriceCents: 800 },
      DROP_IN: { maxPetsPerBooking: 3, additionalPetPriceCents: 600 },
    },
  },
  "ryan-s": {
    services: {
      DOG_WALKING: { maxPetsPerBooking: 3, additionalPetPriceCents: 1000 },
      BOARDING: { holidayPriceCents: 6800 + 1500 }, // base $68 → $83 on statutory holidays
    },
  },
  "emma-wilson": {
    boardingCapacity: 2,
    services: { BOARDING: { maxPetsPerBooking: 2, additionalPetPriceCents: 2000 } },
  },
  "liam-and-priya": {
    services: { BOARDING: { puppyPriceCents: 1000 } },
  },
  "chloe-and-ethan-d": {
    services: { DROP_IN: { maxPetsPerBooking: 3, additionalPetPriceCents: 500 } },
  },
};

const money = (c: number | null) => (c == null ? "—" : `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`);
const describe = (s: { maxPetsPerBooking: number; additionalPetPriceCents: number | null; holidayPriceCents: number | null; puppyPriceCents: number | null }) =>
  `max ${s.maxPetsPerBooking} · extra ${money(s.additionalPetPriceCents)} · holiday ${money(s.holidayPriceCents)} · puppy ${money(s.puppyPriceCents)}`;

(async () => {
  for (const [slug, plan] of Object.entries(PLANS)) {
    const sitter = await db.sitterProfile.findUnique({ where: { slug }, include: { services: true, user: { select: { email: true } } } });
    if (!sitter) {
      console.log(`skip ${slug}: not found`);
      continue;
    }
    if (!sitter.user.email.endsWith("@wagstays.ca")) {
      console.log(`skip ${slug}: not a demo account`);
      continue;
    }
    console.log(`\n${sitter.displayName} (${slug})`);
    if (plan.boardingCapacity !== undefined) {
      // capacity must cover the most pets a boarding / day-care booking may include
      const cap = Math.max(plan.boardingCapacity, sitter.boardingCapacity);
      console.log(`  boardingCapacity ${sitter.boardingCapacity} → ${cap}`);
      if (!dryRun && cap !== sitter.boardingCapacity) await db.sitterProfile.update({ where: { id: sitter.id }, data: { boardingCapacity: cap } });
    }
    for (const [type, rates] of Object.entries(plan.services)) {
      const svc = sitter.services.find((s) => s.type === type);
      if (!svc) {
        console.log(`  ${type}: no such service, skipped`);
        continue;
      }
      const after = { ...svc, ...rates };
      console.log(`  ${type.padEnd(11)} ${describe(svc)}\n  ${" ".repeat(11)} → ${describe(after)}`);
      if (!dryRun) await db.service.update({ where: { id: svc.id }, data: rates });
    }
  }
  console.log(dryRun ? "\n(dry run — nothing written)" : "\nDone.");
  await db.$disconnect();
})();
