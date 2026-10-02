import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";

const TTL_HOURS = { SETUP: 72, RESET: 2 } as const;
export type TokenPurpose = keyof typeof TTL_HOURS;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Creates a one-time link (older unused links for the same user are revoked). Returns an absolute URL. */
export async function createPasswordLink(userId: string, purpose: TokenPurpose) {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.passwordToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
    db.passwordToken.create({
      data: { userId, purpose, tokenHash: hash(token), expiresAt: new Date(Date.now() + TTL_HOURS[purpose] * 3_600_000) },
    }),
  ]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  return { url: `${origin}/set-password?token=${token}`, expiresInHours: TTL_HOURS[purpose] };
}

/** Looks up a still-valid token. */
export async function findValidToken(token: string) {
  if (!token) return null;
  const row = await db.passwordToken.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: { select: { id: true, email: true, firstName: true, suspended: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date() || row.user.suspended) return null;
  return row;
}
