import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { bookingPets, petKindLabel, petNames } from "@/lib/pets";
import { bookingPriceLines } from "@/lib/quote";
import { priceLineLabel } from "@/lib/price-details";
import { PetChips } from "@/components/booking/PetChips";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { BTN, Card, CardHeader, StatusChip, formatDateTime } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { allowedTransitions } from "@/lib/booking-lifecycle";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { BookingActions } from "../../_components/BookingActions";
import { SeriesActions } from "../../_components/SeriesActions";
import { seriesMembers } from "@/lib/booking-series";
import { formatDayLong, isStayService, quantityLabel, zonedParts } from "@/lib/availability-core";
import { OwnerRatingCard } from "../../_components/OwnerRatingCard";
import { OwnerReputation } from "../../_components/OwnerReputation";
import { PetPhoto } from "../../_components/PetPhoto";
import { bookingWhen, hasStarted, ownerShortName, petSizeKey, SERVICE_ICONS, serviceKey } from "../../_lib";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sitter.meta");
  return { title: `${t("booking")}` };
}

async function Row({ icon, label, value }: { icon: string; label: string; value?: React.ReactNode }) {
  const t = await getTranslations("sitter.booking");
  return (
    <div className="flex items-start gap-space-sm py-space-sm border-b border-[#EFE7DE] last:border-0">
      <span className="material-symbols-outlined text-xl text-secondary mt-0.5">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
        <span className="font-body-md text-body-md text-on-surface break-words whitespace-pre-line">
          {value || <span className="text-outline">{t("notProvided")}</span>}
        </span>
      </div>
    </div>
  );
}

export default async function SitterBookingDetailPage({ params }: PageProps<"/[locale]/sitter/bookings/[id]">) {
  const { profile } = await requireSitter();
  const { id } = await params;
  const b = await db.booking.findFirst({
    // Scoped to the signed-in sitter: someone else's booking id is a 404.
    where: { id, sitterId: profile.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      pet: { include: { traits: true } },
      pets: { include: { pet: { include: { traits: true } } } },
      service: true,
      review: { select: { rating: true, body: true } },
    },
  });
  if (!b) notFound();

  const tz = profile.city.timeZone;
  const [tr, tc, locale] = await Promise.all([getTranslations("sitter"), getTranslations("common"), getLocale()]);
  const statusKey = (s: string) => (s in BOOKING_STATUS_LABELS ? s : "DRAFT") as BookingStatus;
  const status = BOOKING_STATUS_LABELS[statusKey(b.status)];
  const statusLabel = (s: string) => tc(`enums.bookingStatus.${statusKey(s)}`);
  const actorLabel = (a: string | null) => (a === "OWNER" || a === "SITTER" || a === "ADMIN" ? tr(`actor.${a}`) : (a ?? "").toLowerCase() || "—");
  const contactsVisible = b.status === "CONFIRMED" || b.status === "COMPLETED";
  const pet = b.pet;
  const pets = bookingPets(b);
  const names = petNames(pets.map((p) => p.name), locale);
  const lines = bookingPriceLines(b);
  const allowed = allowedTransitions(b.status, "SITTER");
  const started = hasStarted(b.startAt);
  const now = new Date();
  const members = b.seriesId ? await seriesMembers(b.seriesId) : [];
  const position = members.findIndex((m) => m.id === b.id) + 1;
  const later = members.filter((m) => m.startAt >= b.startAt && (m.status === "PENDING" || m.status === "CONFIRMED"));
  const pendingInSeries = members.filter((m) => m.status === "PENDING" && m.startAt > now);

  return (
    <>
      <Link className="inline-flex items-center gap-1 font-label-lg text-label-lg text-on-surface-variant hover:text-primary w-fit" href="/sitter/bookings">
        <span className="material-symbols-outlined text-lg">arrow_back</span>{tr("booking.allBookings")}
      </Link>

      <Card className="p-space-lg flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-start gap-space-lg">
          <PetPhoto className="w-24 h-24 rounded-2xl" name={pet.name} url={pet.photoUrl} />
          <div className="flex flex-col gap-space-xs flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-space-sm">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md text-on-surface">
                {tr("booking.title", { service: tc(serviceKey(b.service.type)), pets: names })}
              </h1>
              <StatusChip tone={status.tone}>{b.status === "PENDING" ? tr("needsResponse") : statusLabel(b.status)}</StatusChip>
            </div>
            <p className="flex items-center gap-space-xs font-label-lg text-label-lg text-on-surface">
              <span className="material-symbols-outlined text-xl text-secondary">calendar_month</span>
              {bookingWhen(b.startAt, b.endAt, tz, locale)}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {tr.rich("booking.requestedBy", {
                name: ownerShortName(b.owner),
                date: formatDateTime(b.createdAt, tz, locale),
                b: (c) => <span className="font-semibold text-on-surface">{c}</span>,
              })}
            </p>
            <OwnerReputation ownerId={b.owner.id} />
            {pets.length > 1 && (
              <PetChips
                className="pt-space-xs"
                pets={pets.map((p) => ({
                  id: p.id,
                  name: p.name,
                  photoUrl: p.photoUrl,
                  breed: p.breed,
                }))}
              />
            )}
            <div className="flex flex-wrap gap-space-xs pt-space-xs">
              {pets.length > 1 && (
                <StatusChip icon="pets" tone="primary">
                  {tr("petCount", { count: pets.length })}
                </StatusChip>
              )}
              <StatusChip icon={SERVICE_ICONS[b.service.type]}>
                {tc(serviceKey(b.service.type))}
                {b.service.durationMins ? ` · ${tr("durationMins", { mins: b.service.durationMins })}` : ""}
              </StatusChip>
              {b.meetAndGreet && (
                <StatusChip icon="handshake" tone="primary">
                  {tr("booking.meetGreetRequested")}
                </StatusChip>
              )}
              {(isStayService(b.service.type) || b.quantity > 1) && <StatusChip icon="date_range">{quantityLabel(b.service.type, b.quantity, locale)}</StatusChip>}
              {members.length > 1 ? (
                <StatusChip icon="repeat" tone="primary">
                  {tr("booking.weekOf", { index: position, total: members.length })}
                </StatusChip>
              ) : (
                b.recurringWeekly && <StatusChip icon="repeat">{tr("booking.repeatsWeekly")}</StatusChip>
              )}
              {b.gpsUpdates && <StatusChip icon="my_location">{tr("booking.gpsOn")}</StatusChip>}
            </div>
          </div>
          <div className="flex md:flex-col items-center md:items-end justify-between gap-space-xs p-space-md rounded-2xl bg-surface-container-low md:min-w-[160px]">
            <span className="font-label-md text-label-md text-on-surface-variant">{tr("booking.youEarn")}</span>
            <span className="font-headline-md text-headline-md text-primary">{formatMoney(b.subtotalCents, { locale })}</span>
            {lines.length > 1 && (
              <ul className="hidden md:flex flex-col gap-0.5 font-body-sm text-body-sm text-on-surface-variant text-right" data-testid="sitter-price-lines">
                {lines.map((l, i) => (
                  <li key={`${l.label}-${i}`}>
                    {priceLineLabel(l, i, locale)}: <span className="font-semibold text-on-surface">{formatMoney(l.amountCents, { locale })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-space-sm">
          <Link className={BTN.secondary} href={`/messages/new?owner=${b.owner.id}`}>
            <span className="material-symbols-outlined text-lg">chat_bubble</span>
            {tr("booking.message", { name: b.owner.firstName })}
          </Link>
          <Link className={`${BTN.ghost} text-on-surface-variant`} href={`/account/support/new?booking=${b.id}`}>
            <span className="material-symbols-outlined text-lg">flag</span>
            {tr("booking.reportProblem")}
          </Link>
        </div>

        <div className={allowed.length ? "border-t border-[#EFE7DE] pt-space-lg" : ""}>
          <BookingActions allowed={allowed} bookingId={b.id} ownerFirstName={b.owner.firstName} started={started} />
        </div>

        {members.length > 1 && (
          <div className="flex flex-col gap-space-sm border-t border-[#EFE7DE] pt-space-lg">
            <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-xl text-secondary">event_repeat</span>
              {tr("booking.series", { count: members.length })}
            </h2>
            <ul className="flex flex-wrap gap-space-xs">
              {members.map((m, i) => {
                return (
                  <li key={m.id}>
                    <Link
                      aria-current={m.id === b.id ? "page" : undefined}
                      className={`inline-flex flex-col px-space-sm py-1 rounded-xl border font-label-sm text-label-sm ${
                        m.id === b.id ? "border-primary bg-[#EBF3EF] text-primary" : "border-[#EFE7DE] text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                      href={`/sitter/bookings/${m.id}`}
                    >
                      <span className="font-semibold">
                        {tr("booking.seriesWeek", { n: i + 1, date: formatDayLong(zonedParts(m.startAt.getTime(), tz).iso, locale) })}
                      </span>
                      <span>{statusLabel(m.status)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <SeriesActions bookingId={b.id} laterCount={later.length} pendingCount={pendingInSeries.length} />
          </div>
        )}

        {b.sitterNote && b.status !== "DECLINED" && (
          <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
            <span className="font-semibold text-on-surface">{tr("booking.yourNote")}</span>
            {b.sitterNote}
          </p>
        )}
        {(b.status === "DECLINED" || b.status === "CANCELLED") && (
          <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
            <span className="font-semibold text-on-surface">
              {b.status === "DECLINED" ? tr("booking.declined") : tr("booking.cancelledBy", { who: actorLabel(b.cancelledBy) })}
              {b.cancelledAt ? tr("booking.on", { date: formatDateTime(b.cancelledAt, tz, locale) }) : ""}:{" "}
            </span>
            {b.cancelReason ?? tr("booking.noReason")}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-start">
        <div className="flex flex-col gap-space-lg">
          {pets.map((pet) => (
            <Card className="pb-space-md" key={pet.id}>
              <CardHeader icon="pets" title={tr("booking.about", { name: pet.name })} />
              <div className="px-space-lg pt-space-sm flex flex-col">
                <Row
                  icon="info"
                  label={tr("booking.pet")}
                  value={[
                    petKindLabel(pet, locale),
                    pet.breed,
                    pet.size ? tc(petSizeKey(pet.size)) : null,
                    pet.ageYears != null ? tr("booking.age", { count: pet.ageYears }) : null,
                    pet.sex === "MALE" ? tr("booking.male") : pet.sex === "FEMALE" ? tr("booking.female") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
                <Row
                  icon="vaccines"
                  label={tr("booking.health")}
                  value={[
                    pet.neutered ? tr("booking.neutered") : tr("booking.notNeutered"),
                    pet.rabiesVaccinated ? tr("booking.rabies") : tr("booking.noRabies"),
                    pet.microchip ? tr("booking.microchip", { id: pet.microchip }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
                {pet.traits.length > 0 && (
                  <div className="flex flex-wrap gap-space-xs py-space-sm">
                    {pet.traits.map((t) => (
                      <StatusChip key={t.id} tone={t.tone === "warning" ? "danger" : t.tone === "primary" ? "primary" : "neutral"}>
                        {t.label}
                      </StatusChip>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Card className="pb-space-md">
          <CardHeader icon="assignment" title={tr("booking.care")} />
          <div className="px-space-lg pt-space-sm flex flex-col">
            <Row icon="location_on" label={tr("booking.meetingAddress")} value={b.meetingAddress} />
            <Row icon="pets" label={tr("booking.leash")} value={b.leashPreference} />
            <Row icon="diversity_1" label={tr("booking.otherAnimals")} value={b.otherAnimalsReaction} />
            <Row icon="restaurant" label={tr("booking.feeding")} value={b.feedingRules} />
            <Row icon="sticky_note_2" label={tr("booking.ownerNotes")} value={b.notes} />
          </div>
        </Card>

        <Card className="pb-space-md lg:col-span-2">
          <CardHeader icon="emergency" title={tr("booking.emergency")} />
          <div className="px-space-lg pt-space-sm">
            {contactsVisible ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-space-lg">
                <Row icon="person" label={tr("booking.emergencyContact")} value={b.emergencyName} />
                <Row
                  icon="call"
                  label={tr("booking.emergencyPhone")}
                  value={
                    b.emergencyPhone && (
                      <a className="text-primary hover:underline" href={`tel:${b.emergencyPhone}`}>
                        {b.emergencyPhone}
                      </a>
                    )
                  }
                />
                <Row icon="local_hospital" label={tr("booking.vetClinic")} value={b.vetClinic} />
                <Row
                  icon="call"
                  label={tr("booking.vetPhone")}
                  value={
                    b.vetPhone && (
                      <a className="text-primary hover:underline" href={`tel:${b.vetPhone}`}>
                        {b.vetPhone}
                      </a>
                    )
                  }
                />
              </div>
            ) : (
              <p className="flex items-start gap-space-sm p-space-md rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-xl text-secondary">lock</span>
                {b.status === "PENDING"
                  ? tr("booking.contactsPending")
                  : tr("booking.contactsHidden")}
              </p>
            )}
          </div>
        </Card>

        <OwnerRatingCard booking={b} sitterId={profile.id} />

        {b.review && (
          <Card className="p-space-lg lg:col-span-2 flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md text-on-surface-variant">{tr("booking.reviewFrom", { name: b.owner.firstName })}</span>
            <span className="font-title-md text-title-md text-secondary">{"★".repeat(b.review.rating)}</span>
            <p className="font-body-md text-body-md text-on-surface">{b.review.body}</p>
          </Card>
        )}
      </div>
    </>
  );
}
