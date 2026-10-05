import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bookingPets, petKindLabel, petNames } from "@/lib/pets";
import type { Prisma } from "@prisma/client";
import { StatusChip } from "@/components/ui";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { allowedTransitions } from "@/lib/booking-lifecycle";
import { bookingWhen, hasStarted, ownerShortName, petSizeKey, SERVICE_ICONS, serviceKey } from "../_lib";
import { BookingActions } from "./BookingActions";
import { OwnerReputation } from "./OwnerReputation";
import { PetPhoto } from "./PetPhoto";
import { isStayService, quantityLabel } from "@/lib/availability-core";
import { RateOwnerForm } from "./RateOwnerForm";

export const bookingCardInclude = {
  owner: { select: { id: true, firstName: true, lastName: true } },
  pet: { include: { traits: true } },
  pets: { include: { pet: { include: { traits: true } } } },
  service: { select: { type: true, durationMins: true } },
  ownerReview: { select: { id: true } },
} satisfies Prisma.BookingInclude;

export type BookingCardData = Prisma.BookingGetPayload<{ include: typeof bookingCardInclude }>;

export async function BookingCard({
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
  const [t, tc, locale] = await Promise.all([getTranslations("sitter"), getTranslations("common"), getLocale()]);
  const statusKey = (b.status in BOOKING_STATUS_LABELS ? b.status : "DRAFT") as BookingStatus;
  const status = BOOKING_STATUS_LABELS[statusKey];
  const size = b.pet.size ? tc(petSizeKey(b.pet.size)) : null;
  const actorLabel = (a: string | null) => (a === "OWNER" || a === "SITTER" || a === "ADMIN" ? t(`actor.${a}`) : (a ?? "").toLowerCase() || "—");
  const pets = bookingPets(b);
  const multi = pets.length > 1;
  return (
    <article className="flex flex-col gap-space-md p-space-md sm:p-space-lg rounded-2xl border border-[#EFE7DE] bg-surface-container-lowest">
      <div className="flex items-start gap-space-md">
        <PetPhoto className="w-16 h-16 rounded-2xl" name={b.pet.name} url={b.pet.photoUrl} />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-space-xs">
            <h3 className="font-title-md text-title-md text-on-surface">{petNames(pets.map((p) => p.name), locale)}</h3>
            {multi ? (
              <span className="inline-flex items-center gap-0.5 px-space-sm py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm font-semibold" data-testid="pet-count">
                <span className="material-symbols-outlined text-sm">pets</span>
                {t("petCount", { count: pets.length })}
              </span>
            ) : (
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {[b.pet.species === "OTHER" && petKindLabel(b.pet, locale), b.pet.breed, size].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t.rich("bookingCard.petParent", {
              name: ownerShortName(b.owner),
              b: (c) => <span className="text-on-surface font-semibold">{c}</span>,
            })}
          </p>
          <OwnerReputation ownerId={b.owner.id} />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-title-md text-title-md text-primary">{formatMoney(b.subtotalCents, { locale })}</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">{t("bookingCard.youEarn")}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-space-xs">
        <StatusChip tone={status.tone}>{statusKey === "PENDING" ? t("needsResponse") : tc(`enums.bookingStatus.${statusKey}`)}</StatusChip>
        <StatusChip icon={SERVICE_ICONS[b.service.type]}>
          {tc(serviceKey(b.service.type))}
          {b.service.durationMins ? ` · ${t("durationMins", { mins: b.service.durationMins })}` : ""}
        </StatusChip>
        {b.meetAndGreet && (
          <StatusChip icon="handshake" tone="primary">
            {t("bookingCard.meetGreetFirst")}
          </StatusChip>
        )}
        {(isStayService(b.service.type) || b.quantity > 1) && <StatusChip icon="date_range">{quantityLabel(b.service.type, b.quantity, locale)}</StatusChip>}
        {series ? (
          <StatusChip icon="repeat" tone="primary">
            {t("bookingCard.weekOf", { index: series.index, total: series.total })}
          </StatusChip>
        ) : (
          b.recurringWeekly && <StatusChip icon="repeat">{t("bookingCard.weekly")}</StatusChip>
        )}
      </div>

      <p className="flex items-center gap-space-xs font-label-lg text-label-lg text-on-surface">
        <span className="material-symbols-outlined text-xl text-secondary">calendar_month</span>
        {bookingWhen(b.startAt, b.endAt, tz, locale)}
      </p>

      {pets.some((p) => p.traits.length > 0) && (
        <div className="flex flex-wrap gap-space-xs">
          {pets.flatMap((p) =>
            p.traits.map((t) => (
              <StatusChip key={t.id} tone={t.tone === "warning" ? "danger" : t.tone === "primary" ? "primary" : "neutral"}>
                {multi ? `${p.name}: ${t.label}` : t.label}
              </StatusChip>
            )),
          )}
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
          {b.status === "CANCELLED" ? t("bookingCard.cancelledBy", { who: actorLabel(b.cancelledBy) }) : t("bookingCard.reason")}
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
          {t("bookingCard.viewDetails")}<span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>
      </div>
    </article>
  );
}
