import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ACTIVE_TICKET_STATUSES,
  PRIORITY_RANK,
  STATUS_RANK,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support";

export const PAGE_SIZE = 25;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export type TicketSort = "priority" | "newest" | "updated";
export type TicketFilters = {
  /** "active" (default) = open, in progress or waiting on the user; "all" = everything */
  status: TicketStatus | "active" | "all";
  priority?: TicketPriority;
  category?: TicketCategory;
  q?: string;
  sort: TicketSort;
  page: number;
};

export function parseTicketFilters(sp: SP): TicketFilters {
  const status = one(sp.status);
  const priority = one(sp.priority);
  const category = one(sp.category);
  const sort = one(sp.sort);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    status: status === "all" ? "all" : TICKET_STATUSES.includes(status as TicketStatus) ? (status as TicketStatus) : "active",
    priority: TICKET_PRIORITIES.includes(priority as TicketPriority) ? (priority as TicketPriority) : undefined,
    category: TICKET_CATEGORIES.includes(category as TicketCategory) ? (category as TicketCategory) : undefined,
    q: one(sp.q)?.slice(0, 80),
    sort: sort === "newest" || sort === "updated" ? sort : "priority",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Everything except the status filter (status tab counts are computed on top of this). */
export function baseWhere(f: TicketFilters): Prisma.SupportTicketWhereInput {
  const and: Prisma.SupportTicketWhereInput[] = [];
  if (f.priority) and.push({ priority: f.priority });
  if (f.category) and.push({ category: f.category });
  if (f.q) {
    for (const w of f.q.split(/\s+/).filter(Boolean).slice(0, 4)) {
      and.push({
        OR: [
          { reference: { contains: w, mode: "insensitive" } },
          { subject: { contains: w, mode: "insensitive" } },
          { openedBy: { OR: [{ firstName: { contains: w, mode: "insensitive" } }, { lastName: { contains: w, mode: "insensitive" } }, { email: { contains: w, mode: "insensitive" } }] } },
        ],
      });
    }
  }
  return and.length ? { AND: and } : {};
}

export function ticketWhere(f: TicketFilters): Prisma.SupportTicketWhereInput {
  const base = baseWhere(f);
  if (f.status === "all") return base;
  const status = f.status === "active" ? { in: ACTIVE_TICKET_STATUSES } : f.status;
  return { AND: [base, { status }] };
}

export const ticketListInclude = {
  openedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  booking: { select: { id: true } },
  messages: { where: { internal: false }, orderBy: { createdAt: "desc" }, take: 1, select: { authorId: true, createdAt: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude;

export type TicketRow = Prisma.SupportTicketGetPayload<{ include: typeof ticketListInclude }>;

/** When the opener started waiting on us: their latest unanswered message, else when the ticket last changed. */
export function waitingSince(t: Pick<TicketRow, "openedById" | "createdAt" | "updatedAt" | "messages">) {
  const last = t.messages[0];
  if (!last) return t.createdAt;
  return last.authorId === t.openedById ? last.createdAt : t.updatedAt;
}

/**
 * Tickets for a filter, paginated. The default "priority" sort can't be expressed in SQL on our
 * string columns, so we load the (small) id set, order it in memory — active before finished,
 * urgent first, then whoever has been waiting longest — and fetch the requested page.
 */
export async function findTickets(f: TicketFilters, skip: number, take: number): Promise<TicketRow[]> {
  const where = ticketWhere(f);
  if (f.sort !== "priority") {
    return db.supportTicket.findMany({
      where,
      include: ticketListInclude,
      orderBy: [f.sort === "newest" ? { createdAt: "desc" } : { updatedAt: "desc" }, { id: "asc" }],
      skip,
      take,
    });
  }
  const keys = await db.supportTicket.findMany({
    where,
    select: {
      id: true,
      status: true,
      priority: true,
      openedById: true,
      createdAt: true,
      updatedAt: true,
      messages: { where: { internal: false }, orderBy: { createdAt: "desc" }, take: 1, select: { authorId: true, createdAt: true } },
    },
  });
  keys.sort(
    (a, b) =>
      (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
      (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
      waitingSince(a).getTime() - waitingSince(b).getTime(),
  );
  const ids = keys.slice(skip, skip + take).map((k) => k.id);
  const rows = await db.supportTicket.findMany({ where: { id: { in: ids } }, include: ticketListInclude });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((i) => byId.get(i)).filter((r): r is TicketRow => !!r);
}

export function filterHref(f: TicketFilters, overrides: Partial<Record<keyof TicketFilters, string | number | undefined>> = {}) {
  const qs = new URLSearchParams();
  const merged: Record<string, string | number | undefined> = {
    status: f.status === "active" ? undefined : f.status,
    priority: f.priority,
    category: f.category,
    q: f.q,
    sort: f.sort === "priority" ? undefined : f.sort,
    page: f.page > 1 ? f.page : undefined,
    ...overrides,
  };
  for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && Number(v) <= 1) && !(k === "status" && v === "active")) qs.set(k, String(v));
  const s = qs.toString();
  return s ? `/admin/support?${s}` : "/admin/support";
}

/** "3h", "2d" — how long something has been waiting. */
export function ago(d: Date, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
