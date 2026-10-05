import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { BOOKING_STATUS_LABELS, SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/lib/constants";
import { adminStatusLabel, categoryLabel, priorityLabel } from "@/lib/support";
import { BTN, Card, CardHeader, PageHeader, StatusChip, formatDate, formatDateTime } from "@/components/ui";
import { AuditList } from "../../_components/AuditList";
import { auditInclude, toAuditRows } from "../../_components/audit-rows";
import { shortRef } from "../../bookings/_lib";
import { PetChips } from "@/components/booking/PetChips";
import { bookingPets } from "@/lib/pets";
import { AdminReplyForm, ReopenButton, ResolveForm, StatusPriorityForm } from "./_components/TicketActions";

export async function generateMetadata({ params }: PageProps<"/admin/support/[id]">): Promise<Metadata> {
  const { id } = await params;
  const t = await db.supportTicket.findUnique({ where: { id }, select: { reference: true } });
  return { title: t ? `Ticket ${t.reference}` : "Ticket" };
}

export default async function AdminTicketPage({ params }: PageProps<"/admin/support/[id]">) {
  const { id } = await params;
  const t = await db.supportTicket.findUnique({
    where: { id },
    include: {
      openedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          suspended: true,
          createdAt: true,
          wagPointsCents: true,
          sitter: { select: { id: true, displayName: true } },
          _count: { select: { bookings: true, ticketsOpened: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } } },
      booking: {
        select: {
          id: true,
          status: true,
          startAt: true,
          totalCents: true,
          discountCents: true,
          ownerId: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          pet: { select: { id: true, name: true, breed: true, photoUrl: true } },
          pets: { select: { pet: { select: { id: true, name: true, breed: true, photoUrl: true } } } },
          service: { select: { type: true } },
          sitter: { select: { id: true, displayName: true, userId: true, city: { select: { timeZone: true } } } },
        },
      },
    },
  });
  if (!t) notFound();

  const history = await db.auditLog.findMany({
    where: { entityType: "SupportTicket", entityId: t.id },
    include: auditInclude,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const st = adminStatusLabel(t.status);
  const pr = priorityLabel(t.priority);
  const cat = categoryLabel(t.category);
  const finished = t.status === "RESOLVED" || t.status === "CLOSED";
  const u = t.openedBy;
  const b = t.booking;
  const bst = b ? (BOOKING_STATUS_LABELS[b.status as BookingStatus] ?? { label: b.status, tone: "neutral" as const }) : null;
  const openerRole = b ? (b.ownerId === u.id ? "Owner on this booking" : b.sitter.userId === u.id ? "Sitter on this booking" : null) : null;

  return (
    <>
      <Link className="inline-flex items-center gap-1 font-label-lg text-label-lg text-primary hover:underline w-fit" href="/admin/support">
        <span className="material-symbols-outlined text-xl">arrow_back</span>
        Support queue
      </Link>
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-space-xs">
            <StatusChip icon={pr.icon} tone={pr.tone}>
              {pr.label}
            </StatusChip>
            <StatusChip tone={st.tone}>{st.label}</StatusChip>
          </div>
        }
        description={
          <>
            {cat.label} · opened {formatDateTime(t.createdAt)} by {u.firstName} {u.lastName}
          </>
        }
        eyebrow={`Ticket ${t.reference}`}
        title={t.subject}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-space-lg items-start">
        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="pb-space-lg">
            <CardHeader icon="forum" title="Conversation" />
            <ol aria-label="Conversation" className="px-space-md sm:px-space-lg pt-space-md flex flex-col gap-space-md">
              {t.messages.map((m) => {
                const fromUser = m.authorId === u.id;
                return (
                  <li className={`flex gap-space-sm ${fromUser ? "" : "flex-row-reverse"}`} key={m.id}>
                    <span
                      className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-label-md text-label-md ${
                        m.internal ? "bg-tertiary-fixed text-tertiary" : fromUser ? "bg-secondary-fixed text-secondary" : "bg-primary text-on-primary"
                      }`}
                    >
                      {m.internal ? <span className="material-symbols-outlined text-lg">lock</span> : `${m.author.firstName[0] ?? ""}${m.author.lastName[0] ?? ""}`}
                    </span>
                    <div className={`flex flex-col gap-1 min-w-0 max-w-[85%] ${fromUser ? "items-start" : "items-end"}`}>
                      <span className="font-label-md text-label-md text-on-surface-variant text-right">
                        {m.author.firstName} {m.author.lastName}
                        {m.internal ? " · Internal note" : fromUser ? "" : " · Support"} · {formatDateTime(m.createdAt)}
                      </span>
                      <p
                        className={`px-space-md py-space-sm rounded-2xl font-body-md text-body-md whitespace-pre-line break-words ${
                          m.internal
                            ? "bg-tertiary-fixed/60 text-on-surface border border-dashed border-tertiary/40 rounded-tr-md"
                            : fromUser
                              ? "bg-surface-container-low text-on-surface rounded-tl-md"
                              : "bg-[#EBF3EF] text-on-surface rounded-tr-md"
                        }`}
                      >
                        {m.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {finished && (
              <div className="mx-space-lg mt-space-md flex items-start gap-space-sm p-space-md rounded-xl bg-[#EBF3EF] text-primary">
                <span className="material-symbols-outlined text-xl">task_alt</span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="font-label-lg text-label-lg">
                    {t.status === "CLOSED" ? "Closed" : "Resolved"}
                    {t.resolvedAt ? ` ${formatDateTime(t.resolvedAt)}` : ""}
                  </p>
                  {t.resolution && <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-line break-words">{t.resolution}</p>}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-space-lg">
            <AdminReplyForm ticketId={t.id} userFirstName={u.firstName} />
          </Card>

          {history.length > 0 && (
            <Card className="pb-space-md">
              <CardHeader icon="history" title="Admin activity" />
              <div className="px-space-lg pt-space-sm">
                <AuditList compact rows={toAuditRows(history)} />
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="p-space-lg flex flex-col gap-space-md">
            <h2 className="font-title-md text-title-md text-on-surface">Manage ticket</h2>
            {/* keyed so the selects follow server-side changes (resolve / re-open) */}
            <StatusPriorityForm key={`${t.status}-${t.priority}`} priority={t.priority} status={t.status} ticketId={t.id} />
            <div className="border-t border-[#EFE7DE] pt-space-md">
              {finished ? <ReopenButton ticketId={t.id} /> : <ResolveForm ticketId={t.id} />}
            </div>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="person" title={u.role === "ADMIN" ? "Opened by (admin)" : u.sitter ? "Opened by (sitter)" : "Opened by"} />
            <dl className="px-space-lg pt-space-md flex flex-col gap-space-sm font-body-sm text-body-sm">
              <Row label="Name">
                <Link className="text-primary hover:underline" href={`/admin/users/${u.id}`}>
                  {u.firstName} {u.lastName}
                </Link>
                {u.suspended && (
                  <span className="ml-2">
                    <StatusChip tone="danger">Suspended</StatusChip>
                  </span>
                )}
              </Row>
              <Row label="Email">
                <a className="text-primary hover:underline break-all" href={`mailto:${u.email}`}>
                  {u.email}
                </a>
              </Row>
              <Row label="Phone">{u.phone ? <a className="text-primary hover:underline" href={`tel:${u.phone}`}>{u.phone}</a> : "—"}</Row>
              {u.sitter && (
                <Row label="Sitter profile">
                  <Link className="text-primary hover:underline" href={`/admin/sitters/${u.sitter.id}`}>
                    {u.sitter.displayName}
                  </Link>
                </Row>
              )}
              <Row label="WagPoints">{formatMoney(u.wagPointsCents, { exact: true })}</Row>
              <Row label="Bookings">{u._count.bookings}</Row>
              <Row label="Tickets">
                <Link className="text-primary hover:underline" href={`/admin/support?status=all&q=${encodeURIComponent(u.email)}`}>
                  {u._count.ticketsOpened} in total
                </Link>
              </Row>
              <Row label="Member since">{formatDate(u.createdAt)}</Row>
            </dl>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="event_note" title="Booking" />
            {b && bst ? (
              <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
                <dl className="flex flex-col gap-space-sm font-body-sm text-body-sm">
                  <Row label="Reference">
                    <Link className="text-primary font-semibold hover:underline" href={`/admin/bookings/${b.id}`}>
                      {shortRef(b.id)}
                    </Link>
                  </Row>
                  <Row label="Status">
                    <StatusChip tone={bst.tone}>{bst.label}</StatusChip>
                  </Row>
                  <Row label="Service">{SERVICE_LABELS[b.service.type as ServiceType] ?? b.service.type}</Row>
                  <Row label="When">{formatDateTime(b.startAt, b.sitter.city.timeZone)}</Row>
                  <Row label="Owner">
                    <Link className="text-primary hover:underline" href={`/admin/users/${b.owner.id}`}>
                      {b.owner.firstName} {b.owner.lastName}
                    </Link>
                  </Row>
                  <Row label="Sitter">
                    <Link className="text-primary hover:underline" href={`/admin/sitters/${b.sitter.id}`}>
                      {b.sitter.displayName}
                    </Link>
                  </Row>
                  <Row label={bookingPets(b).length > 1 ? `Pets (${bookingPets(b).length})` : "Pet"}>
                    <PetChips className="justify-end" pets={bookingPets(b)} />
                  </Row>
                  <Row label="Total">{formatMoney(b.totalCents, { exact: true })}</Row>
                </dl>
                {openerRole && <p className="font-body-sm text-body-sm text-on-surface-variant">{openerRole}.</p>}
                <div className="flex flex-col gap-space-xs">
                  <Link className={`${BTN.secondary} w-full`} href={`/admin/bookings/${b.id}`}>
                    <span className="material-symbols-outlined text-xl">open_in_new</span>
                    Open booking
                  </Link>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Cancel, change status or issue a WagPoints goodwill credit from the booking&apos;s admin page.
                  </p>
                </div>
              </div>
            ) : (
              <p className="px-space-lg pt-space-md font-body-sm text-body-sm text-on-surface-variant">No booking attached to this ticket.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-space-md">
      <dt className="text-on-surface-variant shrink-0">{label}</dt>
      <dd className="text-on-surface text-right min-w-0">{children}</dd>
    </div>
  );
}
