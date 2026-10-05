import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";
import { categoryLabel, statusLabel } from "@/lib/support";
import { Card, StatusChip, formatDateTime } from "@/components/ui";
import { bookingRef, bookingWhen, serviceLabel } from "../../_lib";
import { PetChips } from "@/components/booking/PetChips";
import { bookingPets, petNames } from "@/lib/pets";
import { SafetyBanner } from "../_components/SafetyBanner";
import { TicketReplyForm } from "../_components/TicketReplyForm";
import { ResolveTicketButton } from "../_components/ResolveTicketButton";
import { localizedPath } from "@/i18n/server";

export const metadata: Metadata = { title: "Support request | WagStays" };

const NOTICES: Record<string, string> = {
  created: "Thanks — your request is in. We'll reply here and let you know when we do.",
};

export default async function TicketPage({ params, searchParams }: PageProps<"/[locale]/account/support/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const noticeKey = (await searchParams).notice;
  const notice = typeof noticeKey === "string" ? NOTICES[noticeKey] : undefined;

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      // Internal admin notes are never loaded on the user side.
      messages: {
        where: { internal: false },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
      },
      booking: {
        select: {
          id: true,
          ownerId: true,
          startAt: true,
          endAt: true,
          service: { select: { type: true } },
          pet: { select: { id: true, name: true, breed: true, photoUrl: true } },
          pets: { select: { pet: { select: { id: true, name: true, breed: true, photoUrl: true } } } },
          sitter: { select: { displayName: true, userId: true, city: { select: { timeZone: true } } } },
        },
      },
    },
  });
  if (!ticket) notFound();
  if (ticket.openedById !== user.id) {
    // Admins handle other people's tickets from the admin panel; everyone else gets a 404.
    if (user.role === "ADMIN") redirect(await localizedPath(`/admin/support/${ticket.id}`));
    notFound();
  }

  const settings = ticket.category === "SAFETY" ? await getPlatformSettings() : null;
  const st = statusLabel(ticket.status);
  const cat = categoryLabel(ticket.category);
  const finished = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  const b = ticket.booking;
  const bookingHref = b ? (b.ownerId === user.id ? `/account/bookings/${b.id}` : b.sitter.userId === user.id ? `/sitter/bookings/${b.id}` : null) : null;

  return (
    <>
      <div className="flex flex-col gap-space-sm">
        <Link className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href="/account/support">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Help &amp; Support
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-space-md">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-label-md text-label-md uppercase tracking-wide text-primary">
              Request {ticket.reference} · {cat.label}
            </span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md text-on-surface break-words">{ticket.subject}</h1>
          </div>
          <span className="self-start md:self-auto">
            <StatusChip icon={st.icon} tone={st.tone}>
              {st.label}
            </StatusChip>
          </span>
        </div>
      </div>

      {notice && (
        <p className="flex items-center gap-space-xs rounded-xl bg-[#EBF3EF] text-primary px-space-md py-space-sm font-label-lg text-label-lg" role="status">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          {notice}
        </p>
      )}

      {settings && !finished && <SafetyBanner phone={settings.supportPhone} />}

      <div className="flex flex-col gap-space-lg xl:grid xl:grid-cols-[1fr_320px] items-start">
        <div className="flex flex-col gap-space-lg min-w-0 w-full">
          <Card className="p-space-md sm:p-space-lg flex flex-col gap-space-md">
            <ol className="flex flex-col gap-space-md" aria-label="Conversation">
              {ticket.messages.map((m) => {
                const mine = m.authorId === user.id;
                return (
                  <li className={`flex gap-space-sm ${mine ? "flex-row-reverse" : ""}`} key={m.id}>
                    <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-label-md text-label-md ${mine ? "bg-secondary-fixed text-secondary" : "bg-primary text-on-primary"}`}>
                      {mine ? (m.author.firstName[0] ?? "Y") : <span className="material-symbols-outlined text-lg">support_agent</span>}
                    </span>
                    <div className={`flex flex-col gap-1 min-w-0 max-w-[85%] ${mine ? "items-end" : "items-start"}`}>
                      <span className="font-label-md text-label-md text-on-surface-variant">
                        {mine ? "You" : `${m.author.firstName} · WagStays Support`} · {formatDateTime(m.createdAt)}
                      </span>
                      <p
                        className={`px-space-md py-space-sm rounded-2xl font-body-md text-body-md whitespace-pre-line break-words ${
                          mine ? "bg-surface-container-low text-on-surface rounded-tr-md" : "bg-[#EBF3EF] text-on-surface rounded-tl-md"
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
              <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-[#EBF3EF] text-primary">
                <span className="material-symbols-outlined text-xl">task_alt</span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="font-label-lg text-label-lg">
                    {ticket.status === "CLOSED" ? "Closed" : "Resolved"}
                    {ticket.resolvedAt ? ` on ${formatDateTime(ticket.resolvedAt)}` : ""}
                  </p>
                  {ticket.resolution && <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-line break-words">{ticket.resolution}</p>}
                </div>
              </div>
            )}

            {ticket.status === "CLOSED" ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant border-t border-[#EFE7DE] pt-space-md">
                This request is closed.{" "}
                <Link className="text-primary font-semibold hover:underline" href={`/account/support/new${b ? `?booking=${b.id}` : ""}`}>
                  Open a new request
                </Link>{" "}
                if you still need help.
              </p>
            ) : (
              <div className="border-t border-[#EFE7DE] pt-space-md">
                <TicketReplyForm resolved={ticket.status === "RESOLVED"} ticketId={ticket.id} />
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-space-lg min-w-0 w-full">
          <Card className="p-space-lg flex flex-col gap-space-md">
            <h2 className="font-title-md text-title-md text-on-surface">Details</h2>
            <dl className="flex flex-col gap-space-sm font-body-sm text-body-sm">
              <Detail label="Reference" value={ticket.reference} />
              <Detail label="Category" value={cat.label} />
              <Detail label="Opened" value={formatDateTime(ticket.createdAt)} />
              <Detail label="Last update" value={formatDateTime(ticket.updatedAt)} />
            </dl>
            {b && (
              <div className="flex flex-col gap-1 p-space-md rounded-xl bg-surface-container-low">
                <span className="font-label-md text-label-md text-on-surface-variant">Related booking</span>
                <span className="font-label-lg text-label-lg text-on-surface">
                  {serviceLabel(b.service.type)} · {petNames(bookingPets(b).map((p) => p.name))}
                </span>
                <PetChips className="my-0.5" pets={bookingPets(b)} />
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {bookingRef(b.id)} · {bookingWhen(b.startAt, b.endAt, b.sitter.city.timeZone)}
                </span>
                {bookingHref && (
                  <Link className="font-label-md text-label-md text-primary hover:underline mt-1 w-fit" href={bookingHref}>
                    View booking
                  </Link>
                )}
              </div>
            )}
            {!finished && <ResolveTicketButton ticketId={ticket.id} />}
          </Card>
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-space-md">
      <dt className="text-on-surface-variant">{label}</dt>
      <dd className="font-semibold text-on-surface text-right">{value}</dd>
    </div>
  );
}
