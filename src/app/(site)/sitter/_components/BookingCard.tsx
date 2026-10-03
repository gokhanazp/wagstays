import Link from "next/link";
import { petKindLabel } from "@/lib/pets";
import type { Prisma } from "@prisma/client";
import { StatusChip } from "@/components/ui";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { allowedTransitions } from "@/lib/booking-lifecycle";
import { bookingWhen, hasStarted, ownerShortName, petSizeLabel, SERVICE_ICONS, serviceLabel } from "../_lib";
import { BookingActions } from "./BookingActions";
import { OwnerReputation } from "./OwnerReputation";
import { PetPhoto } from "./PetPhoto";
import { isStayService, quantityLabel } from "@/lib/availability-core";
import { RateOwnerForm } from "./RateOwnerForm";

export const bookingCardInclude = {
  owner: { select: { id: true, firstName: true, lastName: true } },
  pet: { include: { traits: true } },
  service: { select: { type: true, durationMins: true } },
  ownerReview: { select: { id: true } },
} satisfies Prisma.BookingInclude;

export type BookingCardData = Prisma.BookingGetPayload<{ include: typeof bookingCardInclude }>;

const STATUS_LABEL_SITTER: Partial<Record<BookingStatus, string>> = { PENDING: "Needs your response" };

export function BookingCard({
  booking: b,
  tz,
  withActions = false,
  series,
}: {
  booking: BookingCardData;
  tz: string;
  withActions?: boolean;
  /** position in a weekly series ("Week 2 of 6"), from seriesPositions() */
  series?: { index: number; total: number };
}) {
  const status = BOOKING_STATUS_LABELS[b.status as BookingStatus] ?? BOOKING_STATUS_LABELS.DRAFT;
  const size = petSizeLabel(b.pet.size);
  return (
    <article className="flex flex-col gap-space-md p-space-md sm:p-space-lg rounded-2xl border border-[#EFE7DE] bg-surface-container-lowest">
      <div className="flex items-start gap-space-md">
        <PetPhoto className="w-16 h-16 rounded-2xl" name={b.pet.name} url={b.pet.photoUrl} />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-space-xs">
            <h3 className="font-title-md text-title-md text-on-surface">{b.pet.name}</h3>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {[b.pet.species === "OTHER" && petKindLabel(b.pet), b.pet.breed, size].filter(Boolean).join(" · ")}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Pet parent: <span className="text-on-surface font-semibold">{ownerShortName(b.owner)}</span>
          </p>
          <OwnerReputation ownerId={b.owner.id} />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-title-md text-title-md text-primary">{formatMoney(b.subtotalCents)}</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">you earn</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-space-xs">
        <StatusChip tone={status.tone}>{STATUS_LABEL_SITTER[b.status as BookingStatus] ?? status.label}</StatusChip>
        <StatusChip icon={SERVICE_ICONS[b.service.type]}>
          {serviceLabel(b.service.type)}
          {b.service.durationMins ? ` · ${b.service.durationMins} min` : ""}
        </StatusChip>
        {b.meetAndGreet && (
          <StatusChip icon="handshake" tone="primary">
            Meet &amp; Greet first
          </StatusChip>
        )}
        {(isStayService(b.service.type) || b.quantity > 1) && <StatusChip icon="date_range">{quantityLabel(b.service.type, b.quantity)}</StatusChip>}
        {series ? (
          <StatusChip icon="repeat" tone="primary">
            Week {series.index} of {series.total}
          </StatusChip>
        ) : (
          b.recurringWeekly && <StatusChip icon="repeat">Weekly</StatusChip>
        )}
      </div>

      <p className="flex items-center gap-space-xs font-label-lg text-label-lg text-on-surface">
        <span className="material-symbols-outlined text-xl text-secondary">calendar_month</span>
        {bookingWhen(b.startAt, b.endAt, tz)}
      </p>

      {b.pet.traits.length > 0 && (
        <div className="flex flex-wrap gap-space-xs">
          {b.pet.traits.map((t) => (
            <StatusChip key={t.id} tone={t.tone === "warning" ? "danger" : t.tone === "primary" ? "primary" : "neutral"}>
              {t.label}
            </StatusChip>
          ))}
        </div>
      )}

      {b.notes && (
        <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-xl p-space-sm line-clamp-3">
          <span className="material-symbols-outlined text-base align-text-bottom mr-1">sticky_note_2</span>
          {b.notes}
        </p>
      )}
      {(b.status === "DECLINED" || b.status === "CANCELLED") && b.cancelReason && (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {b.status === "CANCELLED" ? `Cancelled by ${(b.cancelledBy ?? "").toLowerCase() || "—"}: ` : "Reason: "}
          {b.cancelReason}
        </p>
      )}

      {b.status === "COMPLETED" && !b.ownerReview && <RateOwnerForm bookingId={b.id} ownerFirstName={b.owner.firstName} prompt />}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-space-sm">
        {withActions ? (
          <BookingActions
            allowed={allowedTransitions(b.status, "SITTER")}
            bookingId={b.id}
            compact
            ownerFirstName={b.owner.firstName}
            started={hasStarted(b.startAt)}
          />
        ) : (
          <span />
        )}
        <Link className="inline-flex items-center gap-1 font-label-lg text-label-lg text-primary hover:underline shrink-0" href={`/sitter/bookings/${b.id}`}>
          View details<span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </article>
  );
}
