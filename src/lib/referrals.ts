import "server-only";
import { randomInt } from "node:crypto";
import { db } from "./db";

// Referral programme helpers: share codes, the `ws_ref` cookie and lookups for the signup banner.

export const REF_COOKIE = "ws_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// No ambiguous characters (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** Normalises a code from a URL/cookie; returns null if it can't be a referral code. */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{4,16}$/.test(s) ? s : null;
}

function randomCode() {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** A referral code not used by any user yet. */
export async function generateReferralCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    if (!(await db.user.findUnique({ where: { referralCode: code }, select: { id: true } }))) return code;
  }
  throw new Error("Could not generate a unique referral code");
}

/** Returns the user's referral code, creating one if they don't have it yet (e.g. users created by admin flows). */
export async function ensureReferralCode(userId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (!user) throw new Error("User not found");
  if (user.referralCode) return user.referralCode;
  for (let i = 0; i < 5; i++) {
    const code = await generateReferralCode();
    const res = await db.user.updateMany({ where: { id: userId, referralCode: null }, data: { referralCode: code } }).catch(() => null);
    if (res) {
      if (res.count === 1) return code;
      // someone else set it concurrently
      const again = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
      if (again?.referralCode) return again.referralCode;
    }
  }
  throw new Error("Could not assign a referral code");
}

/** The active (not closed, not suspended) user who owns this code, for the cookie route, signup and the banner. */
export async function findReferrer(rawCode: string | null | undefined) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;
  return db.user.findFirst({
    where: { referralCode: code, deletedAt: null, suspended: false },
    select: {
      id: true,
      firstName: true,
      referralCode: true,
      pets: { where: { archivedAt: null }, orderBy: { createdAt: "asc" }, take: 1, select: { name: true } },
    },
  });
}

/** WagPoints (cents) earned for a booking subtotal at the given rate (basis points). */
export const pointsForSubtotal = (subtotalCents: number, earnRateBps: number) => Math.max(0, Math.round((subtotalCents * earnRateBps) / 10000));
