import type { Tone } from "@/components/ui";

// Support tickets: shared constants (safe for client components).

export const TICKET_CATEGORIES = ["BOOKING_ISSUE", "PAYMENT", "SAFETY", "ACCOUNT", "OTHER"] as const;
export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_ON_USER", "RESOLVED", "CLOSED"] as const;
export const TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Statuses where the ticket is still being worked on. */
export const ACTIVE_TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_ON_USER"];
/** Statuses that need something from the support team (admin nav badge). */
export const NEEDS_ADMIN_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS"];

export const CATEGORY_LABELS: Record<TicketCategory, { label: string; icon: string; hint: string }> = {
  BOOKING_ISSUE: { label: "Booking issue", icon: "event_busy", hint: "No-show, lateness, care not as agreed, schedule problems" },
  PAYMENT: { label: "Payment & refunds", icon: "payments", hint: "Charges, refunds, WagPoints, payouts" },
  SAFETY: { label: "Safety concern", icon: "health_and_safety", hint: "Injury, lost pet, unsafe situation — handled first" },
  ACCOUNT: { label: "Account", icon: "manage_accounts", hint: "Sign-in, profile, verification" },
  OTHER: { label: "Something else", icon: "help", hint: "Anything that doesn't fit above" },
};

/** Labels as seen by the person who opened the ticket. */
export const STATUS_LABELS: Record<TicketStatus, { label: string; tone: Tone; icon: string }> = {
  OPEN: { label: "Open", tone: "warning", icon: "mark_email_unread" },
  IN_PROGRESS: { label: "In progress", tone: "primary", icon: "pending" },
  WAITING_ON_USER: { label: "Awaiting your reply", tone: "danger", icon: "reply" },
  RESOLVED: { label: "Resolved", tone: "success", icon: "check_circle" },
  CLOSED: { label: "Closed", tone: "neutral", icon: "lock" },
};

/** Labels in the admin queue. */
export const ADMIN_STATUS_LABELS: Record<TicketStatus, { label: string; tone: Tone; icon: string }> = {
  ...STATUS_LABELS,
  WAITING_ON_USER: { label: "Waiting on user", tone: "neutral", icon: "hourglass_top" },
};

export const PRIORITY_LABELS: Record<TicketPriority, { label: string; tone: Tone; icon: string }> = {
  LOW: { label: "Low", tone: "neutral", icon: "south" },
  NORMAL: { label: "Normal", tone: "neutral", icon: "remove" },
  HIGH: { label: "High", tone: "warning", icon: "north" },
  URGENT: { label: "Urgent", tone: "danger", icon: "priority_high" },
};

export const PRIORITY_RANK: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
export const STATUS_RANK: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, WAITING_ON_USER: 2, RESOLVED: 3, CLOSED: 4 };

export const statusLabel = (s: string) => STATUS_LABELS[s as TicketStatus] ?? { label: s, tone: "neutral" as Tone, icon: "help" };
export const adminStatusLabel = (s: string) => ADMIN_STATUS_LABELS[s as TicketStatus] ?? { label: s, tone: "neutral" as Tone, icon: "help" };
export const priorityLabel = (p: string) => PRIORITY_LABELS[p as TicketPriority] ?? { label: p, tone: "neutral" as Tone, icon: "remove" };
export const categoryLabel = (c: string) => CATEGORY_LABELS[c as TicketCategory] ?? { label: c, icon: "help", hint: "" };

export const SUBJECT_MAX = 120;
export const BODY_MAX = 4000;
