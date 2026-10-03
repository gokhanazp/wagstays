"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getAdminOrNull } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { emit } from "@/lib/events";
import { BODY_MAX, SUBJECT_MAX, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type TicketStatus } from "@/lib/support";

export type SupportFormState =
  | { ok?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

const NOT_ALLOWED = { error: "You don't have permission to do that." } as const;
const NOT_FOUND = { error: "We couldn't find that ticket — it may have been removed." } as const;
const id = z.string().trim().min(1).max(64);
const body = z
  .string("Please write a message.")
  .trim()
  .min(2, "Please write a message.")
  .max(BODY_MAX, `Please keep messages under ${BODY_MAX.toLocaleString("en-CA")} characters.`);

function fail(err: z.ZodError): SupportFormState {
  const fieldErrors = z.flattenError(err).fieldErrors as Record<string, string[] | undefined>;
  return { error: Object.values(fieldErrors).flat()[0] ?? "Please check the form.", fieldErrors };
}

async function currentUser() {
  const user = await getCurrentUser();
  return user && !user.suspended ? user : null;
}

function revalidateTicket(ticketId: string) {
  revalidatePath("/account/support");
  revalidatePath(`/account/support/${ticketId}`);
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin", "layout");
}

/** Bookings a user may attach to a ticket: ones they own or ones they sit for. */
function myBookingWhere(userId: string): Prisma.BookingWhereInput {
  return { OR: [{ ownerId: userId }, { sitter: { userId } }] };
}

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
const newReference = () => `T-${randomInt(10000, 100000)}`;

// ---------------------------------------------------------------------------------------------
// User side
// ---------------------------------------------------------------------------------------------

const CreateSchema = z.object({
  category: z.enum(TICKET_CATEGORIES, "Please choose what this is about."),
  subject: z.string("Please add a subject.").trim().min(4, "Please add a short subject (at least 4 characters).").max(SUBJECT_MAX, `Please keep the subject under ${SUBJECT_MAX} characters.`),
  body: body.min(10, "Please describe what happened (at least 10 characters)."),
  bookingId: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => v || null),
});

export async function createTicket(_: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const user = await currentUser();
  if (!user) return { error: "Please sign in again to contact support." };
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const { category, subject, bookingId } = parsed.data;

  if (bookingId) {
    const mine = await db.booking.count({ where: { AND: [{ id: bookingId }, myBookingWhere(user.id)] } });
    if (!mine) return { error: "Please choose one of your own bookings.", fieldErrors: { bookingId: ["Please choose one of your own bookings."] } };
  }

  // Safety reports jump the queue.
  const priority = category === "SAFETY" ? "URGENT" : "NORMAL";
  let ticketId: string | null = null;
  for (let attempt = 0; attempt < 6 && !ticketId; attempt++) {
    try {
      const t = await db.supportTicket.create({
        data: {
          reference: newReference(),
          openedById: user.id,
          bookingId,
          category,
          subject,
          priority,
          messages: { create: { authorId: user.id, body: parsed.data.body } },
        },
        select: { id: true },
      });
      ticketId = t.id;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  if (!ticketId) return { error: "Something went wrong creating your ticket — please try again." };

  revalidateTicket(ticketId);
  redirect(`/account/support/${ticketId}?notice=created`);
}

/** The opener's ticket, or null (admins use the admin actions). */
async function ownTicket(ticketId: string, userId: string) {
  const t = await db.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, openedById: true, status: true } });
  return t && t.openedById === userId ? t : null;
}

export async function replyToTicket(ticketId: string, _: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const user = await currentUser();
  if (!user) return { error: "Please sign in again to reply." };
  const parsed = z.object({ ticketId: id, body }).safeParse({ ticketId, body: formData.get("body") });
  if (!parsed.success) return fail(parsed.error);
  const ticket = await ownTicket(parsed.data.ticketId, user.id);
  if (!ticket) return NOT_FOUND;
  if (ticket.status === "CLOSED") return { error: "This ticket is closed. Please open a new one if you still need help." };

  // A reply puts the ball back in the support team's court (and re-opens a resolved ticket).
  const nextStatus: TicketStatus = ticket.status === "IN_PROGRESS" ? "IN_PROGRESS" : "OPEN";
  await db.$transaction([
    db.supportTicketMessage.create({ data: { ticketId: ticket.id, authorId: user.id, body: parsed.data.body } }),
    db.supportTicket.update({ where: { id: ticket.id }, data: { status: nextStatus, ...(nextStatus === "OPEN" && ticket.status === "RESOLVED" && { resolvedAt: null }) } }),
  ]);
  // No event: the recipient is the support team, not a user.
  revalidateTicket(ticket.id);
  return { ok: true, message: ticket.status === "RESOLVED" ? "Reply sent — we've re-opened your ticket." : "Reply sent." };
}

export async function resolveTicketAsUser(ticketId: string): Promise<SupportFormState> {
  const user = await currentUser();
  if (!user) return { error: "Please sign in again." };
  const parsed = id.safeParse(ticketId);
  if (!parsed.success) return NOT_FOUND;
  const ticket = await ownTicket(parsed.data, user.id);
  if (!ticket) return NOT_FOUND;
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return { ok: true };
  await db.supportTicket.update({
    where: { id: ticket.id },
    data: { status: "RESOLVED", resolvedAt: new Date(), resolution: "Marked as resolved by the user." },
  });
  revalidateTicket(ticket.id);
  return { ok: true, message: "Thanks — we've marked this ticket as resolved." };
}

// ---------------------------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------------------------

async function adminTicket(ticketId: string) {
  return db.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, openedById: true, status: true, priority: true, reference: true } });
}

function notifyOpener(ticket: { id: string; openedById: string }) {
  emit({ type: "ticket.updated", ticketId: ticket.id, recipientId: ticket.openedById, byAdmin: true });
}

const UpdateSchema = z.object({
  ticketId: id,
  status: z.enum(TICKET_STATUSES, "Please choose a status."),
  priority: z.enum(TICKET_PRIORITIES, "Please choose a priority."),
});

export async function adminUpdateTicket(_: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const { ticketId, status, priority } = parsed.data;
  const ticket = await adminTicket(ticketId);
  if (!ticket) return NOT_FOUND;
  if (ticket.status === status && ticket.priority === priority) return { ok: true, message: "Nothing to change." };

  const closing = status === "RESOLVED" || status === "CLOSED";
  const wasClosed = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  await db.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      priority,
      ...(closing && !wasClosed && { resolvedAt: new Date() }),
      ...(!closing && wasClosed && { resolvedAt: null }),
    },
  });
  await audit(admin.id, "ticket.update", "SupportTicket", ticketId, {
    reference: ticket.reference,
    ...(ticket.status !== status && { status: { from: ticket.status, to: status } }),
    ...(ticket.priority !== priority && { priority: { from: ticket.priority, to: priority } }),
  });
  if (ticket.status !== status) notifyOpener(ticket);
  revalidateTicket(ticketId);
  return { ok: true, message: "Ticket updated." };
}

const ReplySchema = z.object({
  ticketId: id,
  body,
  internal: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "on" || v === "true"),
  then: z.enum(["KEEP", "IN_PROGRESS", "WAITING_ON_USER"]).optional().default("KEEP"),
});

export async function adminReplyToTicket(_: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = ReplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const { ticketId, internal, then } = parsed.data;
  const ticket = await adminTicket(ticketId);
  if (!ticket) return NOT_FOUND;

  // Internal notes never change the status; a public reply may move it along.
  const nextStatus = !internal && then !== "KEEP" ? then : null;
  const statusChanged = nextStatus !== null && nextStatus !== ticket.status;
  await db.$transaction([
    db.supportTicketMessage.create({ data: { ticketId, authorId: admin.id, body: parsed.data.body, internal } }),
    db.supportTicket.update({
      where: { id: ticketId },
      // touch updatedAt even when the status stays the same
      data: statusChanged ? { status: nextStatus, ...((ticket.status === "RESOLVED" || ticket.status === "CLOSED") && { resolvedAt: null }) } : { updatedAt: new Date() },
    }),
  ]);
  await audit(admin.id, internal ? "ticket.note" : "ticket.reply", "SupportTicket", ticketId, {
    reference: ticket.reference,
    ...(statusChanged && { status: { from: ticket.status, to: nextStatus } }),
  });
  if (!internal) notifyOpener(ticket);
  revalidateTicket(ticketId);
  return { ok: true, message: internal ? "Internal note added." : "Reply sent." };
}

const ResolveSchema = z.object({
  ticketId: id,
  resolution: z.string("Please describe the resolution.").trim().min(5, "Please describe the resolution (at least 5 characters).").max(1000, "Please keep the resolution under 1,000 characters."),
});

export async function adminResolveTicket(_: SupportFormState, formData: FormData): Promise<SupportFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = ResolveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const { ticketId, resolution } = parsed.data;
  const ticket = await adminTicket(ticketId);
  if (!ticket) return NOT_FOUND;

  await db.supportTicket.update({ where: { id: ticketId }, data: { status: "RESOLVED", resolution, resolvedAt: new Date() } });
  await audit(admin.id, "ticket.resolve", "SupportTicket", ticketId, { reference: ticket.reference, from: ticket.status, resolution });
  notifyOpener(ticket);
  revalidateTicket(ticketId);
  return { ok: true, message: "Ticket resolved." };
}

export async function adminReopenTicket(ticketId: string): Promise<SupportFormState> {
  const admin = await getAdminOrNull();
  if (!admin) return NOT_ALLOWED;
  const parsed = id.safeParse(ticketId);
  if (!parsed.success) return NOT_FOUND;
  const ticket = await adminTicket(parsed.data);
  if (!ticket) return NOT_FOUND;
  if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") return { error: "This ticket is already open." };

  await db.supportTicket.update({ where: { id: ticket.id }, data: { status: "IN_PROGRESS", resolvedAt: null } });
  await audit(admin.id, "ticket.reopen", "SupportTicket", ticket.id, { reference: ticket.reference, from: ticket.status });
  notifyOpener(ticket);
  revalidateTicket(ticket.id);
  return { ok: true, message: "Ticket re-opened." };
}
