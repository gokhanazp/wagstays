import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

// Local-only auth. Will be replaced by Supabase Auth — keep callers on getCurrentUser()/createSession().
const COOKIE = "ws_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const key = new TextEncoder().encode(process.env.SESSION_SECRET);

type Payload = { userId: string };

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId } satisfies Payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE);
}

export async function readSession(): Promise<Payload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<Payload>(token, key, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      phone: true,
      wagPointsCents: true,
      _count: { select: { pets: true, favorites: true } },
    },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
