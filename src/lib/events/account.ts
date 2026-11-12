import "server-only";
import { db } from "../db";
import type { EventHandler } from "./index";

// Keeps User.emailConfirmedAt in step with Supabase (admins filter unconfirmed sign-ups on it).
export const accountHandlers: EventHandler[] = [
  async (event) => {
    if (event.type !== "user.emailConfirmed") return;
    await db.user.updateMany({ where: { id: event.userId, emailConfirmedAt: null }, data: { emailConfirmedAt: new Date() } });
  },
];
