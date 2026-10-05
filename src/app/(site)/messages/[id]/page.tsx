import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusChip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { BOOKING_STATUS_LABELS, SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/lib/constants";
import { getThread, ownerDisplayName, upcomingBookingsBetween } from "@/lib/conversations";
import { formatRating } from "@/lib/format";
import { Avatar } from "../_components/Avatar";
import { ThreadView } from "../_components/ThreadView";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Conversation" };

const SMALL = "inline-flex items-center justify-center gap-1 h-9 px-space-md rounded-full font-label-md text-label-md transition-all whitespace-nowrap";

export default async function ThreadPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const thread = await getThread(id, user.id);
  if (!thread) notFound();

  const tz = thread.sitter.city.timeZone || "America/Toronto";
  const isOwner = thread.side === "owner";
  const ownerName = ownerDisplayName(thread.owner);
  const bookings = isOwner ? [] : await upcomingBookingsBetween(thread.ownerId, thread.sitterId);
  const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const back = (
    <Link aria-label="Back to messages" className="md:hidden w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low" href="/messages">
      <span className="material-symbols-outlined">arrow_back</span>
    </Link>
  );

  const header = isOwner ? (
    <div className="flex items-center gap-space-md px-space-md md:px-space-lg py-space-md border-b border-[#EFE7DE]">
      {back}
      <Link className="flex-1 min-w-0 flex items-center gap-space-md group" href={`/sitters/${thread.sitter.slug}`}>
        <Avatar alt={thread.sitter.displayName} initial={thread.sitter.displayName.charAt(0)} size="md" src={thread.sitter.avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">{thread.sitter.displayName}</span>
            {thread.sitter.idVerified && (
              <span className="material-symbols-outlined text-primary text-lg" title="ID & background verified">
                verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant min-w-0">
            <span className="material-symbols-outlined text-sm text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
            <span className="shrink-0">
              {formatRating(thread.sitter.rating)} ({thread.sitter.reviewCount})
            </span>
            <span className="truncate hidden sm:inline">· {thread.sitter.headline} · {thread.sitter.neighbourhood.name}</span>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-space-xs shrink-0">
        <Link className={`${SMALL} bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] hover:bg-[#DCECE4] hidden sm:inline-flex`} href={`/sitters/${thread.sitter.slug}`}>
          View profile
        </Link>
        {thread.sitter.status === "ACTIVE" && (
          <Link className={`${SMALL} bg-secondary text-on-secondary hover:shadow-[0_6px_16px_rgba(243,123,92,0.35)]`} href={`/book/${thread.sitter.slug}`}>
            <span className="material-symbols-outlined text-base">event_available</span>
            Book
          </Link>
        )}
      </div>
    </div>
  ) : (
    <div className="flex flex-col border-b border-[#EFE7DE]">
      <div className="flex items-center gap-space-md px-space-md md:px-space-lg pt-space-md pb-space-sm">
        {back}
        <Avatar alt={ownerName} initial={thread.owner.firstName.charAt(0)} size="md" src={thread.owner.avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="truncate font-title-md text-title-md text-on-surface">{ownerName}</div>
          <div className="font-body-sm text-body-sm text-on-surface-variant">Pet parent</div>
        </div>
      </div>
      <div className="px-space-md md:px-space-lg pb-space-md">
        {bookings.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-base text-outline">event_busy</span>
            No upcoming bookings with {thread.owner.firstName} yet.
          </p>
        ) : (
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md uppercase tracking-wide text-primary">Upcoming with {thread.owner.firstName}</span>
            <ul className="flex gap-space-sm overflow-x-auto pb-1 -mx-1 px-1">
              {bookings.map((b) => {
                const st = BOOKING_STATUS_LABELS[b.status as BookingStatus];
                return (
                  <li className="shrink-0" key={b.id}>
                    <Link
                      className="flex items-center gap-space-sm p-space-sm pr-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                      href={`/sitter/bookings/${b.id}`}
                    >
                      <span className="w-9 h-9 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">{b.meetAndGreet ? "handshake" : "pets"}</span>
                      </span>
                      <span className="flex flex-col">
                        <span className="font-label-lg text-label-lg text-on-surface whitespace-nowrap">
                          {SERVICE_LABELS[b.service.type as ServiceType] ?? b.service.type} · {b.pet.name}
                          {b.petCount > 1 ? ` +${b.petCount - 1}` : ""}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">{dateFmt.format(b.startAt)}</span>
                      </span>
                      {st && <StatusChip tone={st.tone}>{st.label}</StatusChip>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {header}
      <ThreadView
        conversationId={thread.id}
        messages={thread.messages.map((m) => ({ id: m.id, body: m.body, mine: m.senderId === user.id, createdAt: m.createdAt.toISOString() }))}
        otherFirstName={isOwner ? thread.sitter.displayName.split(" ")[0] : thread.owner.firstName}
        tz={tz}
      />
    </>
  );
}
