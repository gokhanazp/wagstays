import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BTN, Card, CardHeader, StatusChip, formatDateTime } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { allowedTransitions } from "@/lib/booking-lifecycle";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { BookingActions } from "../../_components/BookingActions";
import { PetPhoto } from "../../_components/PetPhoto";
import { bookingWhen, hasStarted, ownerShortName, petSizeLabel, SERVICE_ICONS, serviceLabel } from "../../_lib";

export const metadata: Metadata = { title: "Booking details | WagStays" };

function Row({ icon, label, value }: { icon: string; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-space-sm py-space-sm border-b border-[#EFE7DE] last:border-0">
      <span className="material-symbols-outlined text-xl text-secondary mt-0.5">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className="font-label-md text-label-md text-on-surface-variant">{label}</span>
        <span className="font-body-md text-body-md text-on-surface break-words whitespace-pre-line">{value || <span className="text-outline">Not provided</span>}</span>
      </div>
    </div>
  );
}

export default async function SitterBookingDetailPage({ params }: PageProps<"/sitter/bookings/[id]">) {
  const { profile } = await requireSitter();
  const { id } = await params;
  const b = await db.booking.findFirst({
    // Scoped to the signed-in sitter: someone else's booking id is a 404.
    where: { id, sitterId: profile.id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      pet: { include: { traits: true } },
      service: true,
      review: { select: { rating: true, body: true } },
    },
  });
  if (!b) notFound();

  const tz = profile.city.timeZone;
  const status = BOOKING_STATUS_LABELS[b.status as BookingStatus] ?? BOOKING_STATUS_LABELS.DRAFT;
  const contactsVisible = b.status === "CONFIRMED" || b.status === "COMPLETED";
  const pet = b.pet;
  const size = petSizeLabel(pet.size);
  const allowed = allowedTransitions(b.status, "SITTER");
  const started = hasStarted(b.startAt);

  return (
    <>
      <Link className="inline-flex items-center gap-1 font-label-lg text-label-lg text-on-surface-variant hover:text-primary w-fit" href="/sitter/bookings">
        <span className="material-symbols-outlined text-lg">arrow_back</span>All bookings
      </Link>

      <Card className="p-space-lg flex flex-col gap-space-lg">
        <div className="flex flex-col md:flex-row md:items-start gap-space-lg">
          <PetPhoto className="w-24 h-24 rounded-2xl" name={pet.name} url={pet.photoUrl} />
          <div className="flex flex-col gap-space-xs flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-space-sm">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md text-on-surface">
                {serviceLabel(b.service.type)} for {pet.name}
              </h1>
              <StatusChip tone={status.tone}>{b.status === "PENDING" ? "Needs your response" : status.label}</StatusChip>
            </div>
            <p className="flex items-center gap-space-xs font-label-lg text-label-lg text-on-surface">
              <span className="material-symbols-outlined text-xl text-secondary">calendar_month</span>
              {bookingWhen(b.startAt, b.endAt, tz)}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Requested by <span className="font-semibold text-on-surface">{ownerShortName(b.owner)}</span> on {formatDateTime(b.createdAt, tz)}
            </p>
            <div className="flex flex-wrap gap-space-xs pt-space-xs">
              <StatusChip icon={SERVICE_ICONS[b.service.type]}>
                {serviceLabel(b.service.type)}
                {b.service.durationMins ? ` · ${b.service.durationMins} min` : ""}
              </StatusChip>
              {b.meetAndGreet && (
                <StatusChip icon="handshake" tone="primary">
                  Meet &amp; Greet requested first
                </StatusChip>
              )}
              {b.recurringWeekly && <StatusChip icon="repeat">Repeats weekly</StatusChip>}
              {b.gpsUpdates && <StatusChip icon="my_location">GPS updates on</StatusChip>}
            </div>
          </div>
          <div className="flex md:flex-col items-center md:items-end justify-between gap-space-xs p-space-md rounded-2xl bg-surface-container-low md:min-w-[160px]">
            <span className="font-label-md text-label-md text-on-surface-variant">You earn</span>
            <span className="font-headline-md text-headline-md text-primary">{formatMoney(b.subtotalCents)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-space-sm">
          <Link className={BTN.secondary} href={`/messages/new?owner=${b.owner.id}`}>
            <span className="material-symbols-outlined text-lg">chat_bubble</span>Message {b.owner.firstName}
          </Link>
        </div>

        <div className={allowed.length ? "border-t border-[#EFE7DE] pt-space-lg" : ""}>
          <BookingActions allowed={allowed} bookingId={b.id} ownerFirstName={b.owner.firstName} started={started} />
        </div>

        {b.sitterNote && b.status !== "DECLINED" && (
          <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
            <span className="font-semibold text-on-surface">Your note to the owner: </span>
            {b.sitterNote}
          </p>
        )}
        {(b.status === "DECLINED" || b.status === "CANCELLED") && (
          <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
            <span className="font-semibold text-on-surface">
              {b.status === "DECLINED" ? "Declined" : `Cancelled by ${(b.cancelledBy ?? "").toLowerCase() || "—"}`}
              {b.cancelledAt ? ` on ${formatDateTime(b.cancelledAt, tz)}` : ""}:{" "}
            </span>
            {b.cancelReason ?? "No reason given."}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-start">
        <Card className="pb-space-md">
          <CardHeader icon="pets" title={`About ${pet.name}`} />
          <div className="px-space-lg pt-space-sm flex flex-col">
            <Row
              icon="info"
              label="Pet"
              value={[pet.species === "CAT" ? "Cat" : pet.species === "DOG" ? "Dog" : "Pet", pet.breed, size, pet.ageYears != null ? `${pet.ageYears} yrs` : null, pet.sex === "MALE" ? "Male" : pet.sex === "FEMALE" ? "Female" : null]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row
              icon="vaccines"
              label="Health"
              value={[pet.neutered ? "Spayed / neutered" : "Not spayed / neutered", pet.rabiesVaccinated ? "Rabies vaccinated" : "Rabies vaccine not recorded", pet.microchip ? `Microchip ${pet.microchip}` : null]
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

        <Card className="pb-space-md">
          <CardHeader icon="assignment" title="Care instructions" />
          <div className="px-space-lg pt-space-sm flex flex-col">
            <Row icon="location_on" label="Meeting address" value={b.meetingAddress} />
            <Row icon="pets" label="Leash preference" value={b.leashPreference} />
            <Row icon="diversity_1" label="Around other animals" value={b.otherAnimalsReaction} />
            <Row icon="restaurant" label="Feeding rules" value={b.feedingRules} />
            <Row icon="sticky_note_2" label="Notes from the owner" value={b.notes} />
          </div>
        </Card>

        <Card className="pb-space-md lg:col-span-2">
          <CardHeader icon="emergency" title="Emergency & vet contacts" />
          <div className="px-space-lg pt-space-sm">
            {contactsVisible ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-space-lg">
                <Row icon="person" label="Emergency contact" value={b.emergencyName} />
                <Row icon="call" label="Emergency phone" value={b.emergencyPhone && <a className="text-primary hover:underline" href={`tel:${b.emergencyPhone}`}>{b.emergencyPhone}</a>} />
                <Row icon="local_hospital" label="Vet clinic" value={b.vetClinic} />
                <Row icon="call" label="Vet phone" value={b.vetPhone && <a className="text-primary hover:underline" href={`tel:${b.vetPhone}`}>{b.vetPhone}</a>} />
              </div>
            ) : (
              <p className="flex items-start gap-space-sm p-space-md rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-xl text-secondary">lock</span>
                {b.status === "PENDING"
                  ? "To protect the owner's privacy, emergency and vet contacts are shared once you accept this request."
                  : "Emergency and vet contacts are only shared for confirmed bookings."}
              </p>
            )}
          </div>
        </Card>

        {b.review && (
          <Card className="p-space-lg lg:col-span-2 flex flex-col gap-space-xs">
            <span className="font-label-md text-label-md text-on-surface-variant">Review from {b.owner.firstName}</span>
            <span className="font-title-md text-title-md text-secondary">{"★".repeat(b.review.rating)}</span>
            <p className="font-body-md text-body-md text-on-surface">{b.review.body}</p>
          </Card>
        )}
      </div>
    </>
  );
}
