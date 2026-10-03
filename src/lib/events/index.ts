import "server-only";
import { after } from "next/server";
import { pointsHandlers } from "./points";
import { notificationHandlers } from "./notifications";

// Domain events. Code that changes state calls emit(); feature modules react in their own handler files:
//   ./points.ts         — WagPoints earning & referral rewards
//   ./notifications.ts  — web push (and later email) notifications
// Handlers run after the response is sent (next/server `after`) and never break the triggering request.

export type DomainEvent =
  | { type: "booking.created"; bookingId: string }
  | { type: "booking.confirmed" | "booking.declined" | "booking.completed" | "booking.cancelled"; bookingId: string; actor: "OWNER" | "SITTER" | "ADMIN" }
  | { type: "message.sent"; conversationId: string; messageId: string; senderId: string; recipientId: string }
  | { type: "review.created"; reviewId: string; bookingId: string }
  | { type: "ticket.updated"; ticketId: string; recipientId: string; byAdmin: boolean }
  | { type: "user.signedUp"; userId: string };

export type EventHandler = (event: DomainEvent) => Promise<void>;

const handlers: EventHandler[] = [...pointsHandlers, ...notificationHandlers];

async function run(event: DomainEvent) {
  for (const h of handlers) {
    try {
      await h(event);
    } catch (e) {
      console.error(`[events] handler failed for ${event.type}:`, e);
    }
  }
}

export function emit(event: DomainEvent) {
  try {
    after(() => run(event));
  } catch {
    // outside a request (scripts/tests): run inline
    void run(event);
  }
}
