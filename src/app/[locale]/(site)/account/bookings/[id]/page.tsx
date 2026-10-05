import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedTransitions } from "@/lib/booking-lifecycle";
import { formatMoney, formatRating } from "@/lib/format";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/constants";
import { BTN, Card, CardHeader, StatusChip, formatDateTime } from "@/components/ui";
import { FREE_CANCEL_HOURS, SERVICE_ICONS, bookingRef, bookingWhen, hoursUntil, serviceLabel } from "../../_lib";
import { CancelBookingForm } from "../../_components/CancelBookingForm";
import { ReviewForm } from "../../_components/ReviewForm";
import { SeriesCancelForm } from "../_components/SeriesCancelForm";
import { seriesMembers } from "@/lib/booking-series";
import { formatDayLong, isStayService, quantityLabel, zonedParts } from "@/lib/availability-core";
import { bookingPriceLines } from "@/lib/quote";
import { bookingPets, petNames } from "@/lib/pets";
import { PetChips } from "@/components/booking/PetChips";

export const metadata: Metadata = { title: "Booking Details | WagStays" };

const NOTICES: Record<string, string> = {
  cancelled: "Your booking has been cancelled. Any WagPoints you used are back in your wallet.",
  reviewed: "Thanks! Your review is now live on the sitter's profile.",
};

export default async function BookingDetailPage({ params, searchParams }: PageProps<"/[locale]/account/bookings/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const noticeKey = (await searchParams).notice;
  const notice = typeof noticeKey === "string" ? NOTICES[noticeKey] : undefined;
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      sitter: { select: { id: true, slug: true, displayName: true, avatarUrl: true, rating: true, isSuperSitter: true, status: true, city: { select: { timeZone: true } } } },
      service: true,
      pet: true,
      pets: { include: { pet: true } },
      review: true,
    },
  });
  // Only the booking's owner may see it; anyone else gets a 404 (no existence leak).
  if (!booking || booking.ownerId !== user.id) notFound();

  const tz = booking.sitter.city.timeZone;
  const status = BOOKING_STATUS_LABELS[booking.status as BookingStatus] ?? { label: booking.status, tone: "neutral" as const };
  const canCancel = allowedTransitions(booking.status, "OWNER").includes("CANCELLED");
  const hoursToStart = hoursUntil(booking.startAt);
  const firstName = booking.sitter.displayName.split(" ")[0];
  const serviceActive = booking.service.active && booking.sitter.status === "ACTIVE";
  const members = booking.seriesId ? await seriesMembers(booking.seriesId) : [];
  const position = members.findIndex((m) => m.id === booking.id) + 1;
  const laterCancellable = members.filter(
    (m) => m.startAt >= booking.startAt && allowedTransitions(m.status, "OWNER").includes("CANCELLED"),
  ).length;
  const showQuantity = isStayService(booking.service.type) || booking.quantity > 1;
  const pets = bookingPets(booking);
  const names = petNames(pets.map((p) => p.name));

  const timeline: { icon: string; label: string; at: Date | null; tone: "done" | "bad" }[] = [
    { icon: "send", label: "Booking requested", at: booking.createdAt, tone: "done" },
    ...(booking.confirmedAt ? [{ icon: "check_circle", label: `Confirmed by ${firstName}`, at: booking.confirmedAt, tone: "done" as const }] : []),
    ...(booking.completedAt ? [{ icon: "task_alt", label: "Completed", at: booking.completedAt, tone: "done" as const }] : []),
    ...(booking.status === "DECLINED" ? [{ icon: "block", label: `Declined by ${firstName}`, at: booking.updatedAt, tone: "bad" as const }] : []),
    ...(booking.status === "CANCELLED"
      ? [
          {
            icon: "event_busy",
            label: `Cancelled by ${booking.cancelledBy === "OWNER" ? "you" : booking.cancelledBy === "SITTER" ? firstName : "WagStays support"}`,
            at: booking.cancelledAt,
            tone: "bad" as const,
          },
        ]
      : []),
    ...(booking.review ? [{ icon: "star", label: "You left a review", at: booking.review.createdAt, tone: "done" as const }] : []),
  ];
  const nextStep =
    booking.status === "PENDING"
      ? `Waiting for ${firstName} to accept`
      : booking.status === "CONFIRMED"
        ? hoursToStart > 0
          ? "Upcoming — see you soon!"
          : `In progress or awaiting ${firstName}'s wrap-up`
        : null;

  const care = [
    { icon: "location_on", label: "Meeting address", value: booking.meetingAddress },
    { icon: "nest_eco_leaf", label: "Leash & gear", value: booking.leashPreference },
    { icon: "diversity_1", label: "Around other animals", value: booking.otherAnimalsReaction },
    { icon: "restaurant", label: "Feeding rules", value: booking.feedingRules },
    { icon: "sticky_note_2", label: "Notes for the sitter", value: booking.notes },
    { icon: "my_location", label: "GPS updates", value: booking.gpsUpdates ? "Live GPS + photo updates on" : "Off" },
    {
      icon: "emergency",
      label: "Emergency contact",
      value: booking.emergencyName ? `${booking.emergencyName}${booking.emergencyPhone ? ` · ${booking.emergencyPhone}` : ""}` : null,
    },
    { icon: "medical_services", label: "Vet clinic", value: booking.vetClinic ? `${booking.vetClinic}${booking.vetPhone ? ` · ${booking.vetPhone}` : ""}` : null },
  ].filter((r) => r.value);

  const price = [
    ...(booking.priceLines
      ? bookingPriceLines(booking).map((l) => ({ label: l.label, cents: l.amountCents }))
      : [
          {
            label: showQuantity
              ? `${quantityLabel(booking.service.type, booking.quantity)} × ${formatMoney(Math.round(booking.subtotalCents / Math.max(booking.quantity, 1)), { exact: true })}`
              : `${serviceLabel(booking.service.type)} subtotal`,
            cents: booking.subtotalCents,
          },
        ]),
    { label: "WagShield Vet Protection", cents: booking.protectionFeeCents },
    { label: "Platform Service Fee", cents: booking.serviceFeeCents },
    ...(booking.discountCents > 0 ? [{ label: "WagPoints Discount", cents: -booking.discountCents }] : []),
    { label: "HST", cents: booking.taxCents },
  ];

  return (
    <>
      <div className="flex flex-col gap-space-sm">
        <Link className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href="/account/bookings">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          My Bookings
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <span className="font-label-md text-label-md uppercase tracking-wide text-primary">Booking {bookingRef(booking.id)}</span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md text-on-surface">
              {serviceLabel(booking.service.type)} with {firstName}
            </h1>
          </div>
          <span className="self-start md:self-auto">
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
          </span>
        </div>
      </div>

      {notice && (
        <p className="flex items-center gap-space-xs rounded-xl bg-[#EBF3EF] text-primary px-space-md py-space-sm font-label-lg text-label-lg" role="status">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          {notice}
        </p>
      )}

      {/* Below xl both columns use `contents` so the actions card can sit right under the summary
          (summary → actions → care/review → price/timeline); xl: the original two-column grid. */}
      <div className="flex flex-col gap-space-lg xl:grid xl:grid-cols-[1fr_340px] items-start">
        <div className="contents xl:flex xl:flex-col xl:gap-space-lg min-w-0 max-xl:[&>*]:order-3 max-xl:[&>*]:w-full">
          {/* Summary */}
          <Card className="max-xl:!order-1 p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center gap-space-md bg-surface-container-low rounded-xl p-space-md">
              <Link className="shrink-0" href={`/sitters/${booking.sitter.slug}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={booking.sitter.displayName} className="w-14 h-14 rounded-full object-cover ring-2 ring-primary" src={booking.sitter.avatarUrl} />
              </Link>
              <div className="flex-1 min-w-0">
                <Link className="font-title-md text-title-md text-on-surface hover:text-primary truncate block" href={`/sitters/${booking.sitter.slug}`}>
                  {booking.sitter.displayName}
                </Link>
                <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="text-tertiary-container font-bold">★ {formatRating(booking.sitter.rating)}</span>
                  {booking.sitter.isSuperSitter && (
                    <>
                      <span>•</span>
                      <span className="text-secondary font-semibold">Super Sitter</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-space-md font-body-sm text-body-sm">
              {[
                { icon: SERVICE_ICONS[booking.service.type] ?? "pets", label: "Service", value: serviceLabel(booking.service.type) + (booking.service.durationMins ? ` (${booking.service.durationMins} min)` : "") },
                pets.length > 1
                  ? { icon: "pets", label: `${pets.length} pets`, value: names }
                  : { icon: "pets", label: "Pet", value: `${booking.pet.name}${booking.pet.breed ? ` (${booking.pet.breed})` : ""}` },
                {
                  icon: "calendar_month",
                  label: "Date & time",
                  value: bookingWhen(booking.startAt, booking.endAt, tz),
                  extra: [
                    showQuantity && quantityLabel(booking.service.type, booking.quantity),
                    members.length > 1 ? `Week ${position} of ${members.length}` : booking.recurringWeekly && "Repeats weekly",
                    booking.meetAndGreet && "Meet & Greet requested",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                },
                {
                  icon: "credit_card",
                  label: "Payment",
                  value: booking.cardBrand && booking.cardLast4 ? `${booking.cardBrand} ending in ${booking.cardLast4}` : "Card on file",
                },
              ].map((r) => (
                <div className="flex items-start gap-space-sm" key={r.label}>
                  <span className="material-symbols-outlined text-primary text-lg mt-0.5">{r.icon}</span>
                  <div className="min-w-0">
                    <dt className="font-semibold text-on-surface">{r.label}</dt>
                    <dd className="text-on-surface-variant">{r.value}</dd>
                    {r.extra && <dd className="text-primary font-medium">{r.extra}</dd>}
                  </div>
                </div>
              ))}
            </dl>
            {pets.length > 1 && <PetChips pets={pets.map((p) => ({ id: p.id, name: p.name, photoUrl: p.photoUrl, breed: p.breed, href: `/account/pets/${p.id}` }))} />}

            {booking.sitterNote && (
              <div className="flex items-start gap-space-sm bg-primary-fixed/40 rounded-xl p-space-md font-body-sm text-body-sm text-on-surface">
                <span className="material-symbols-outlined text-lg text-primary">chat</span>
                <p className="min-w-0">
                  <span className="font-semibold">Note from {firstName}:</span> {booking.sitterNote}
                </p>
              </div>
            )}
            {booking.cancelReason && (
              <div className="flex items-start gap-space-sm bg-surface-container-low rounded-xl p-space-md font-body-sm text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">info</span>
                <p className="min-w-0">
                  <span className="font-semibold text-on-surface">{booking.status === "DECLINED" ? "Reason given:" : "Cancellation reason:"}</span> {booking.cancelReason}
                </p>
              </div>
            )}
          </Card>

          {/* Care instructions */}
          <Card className="pb-space-lg">
            <CardHeader icon="volunteer_activism" title="Care Instructions" />
            {care.length ? (
              <dl className="px-space-lg pt-space-md grid grid-cols-1 md:grid-cols-2 gap-space-md font-body-sm text-body-sm">
                {care.map((r) => (
                  <div className="flex items-start gap-space-sm" key={r.label}>
                    <span className="material-symbols-outlined text-secondary text-lg mt-0.5">{r.icon}</span>
                    <div className="min-w-0">
                      <dt className="font-semibold text-on-surface">{r.label}</dt>
                      <dd className="text-on-surface-variant whitespace-pre-line break-words">{r.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="px-space-lg pt-space-md font-body-sm text-body-sm text-on-surface-variant">No special instructions were added.</p>
            )}
          </Card>

          {/* Review */}
          {booking.status === "COMPLETED" && (
            <Card className="pb-space-lg">
              <div id="review" className="scroll-mt-28" />
              <CardHeader icon="star" title={booking.review ? "Your Review" : `How was ${names}'s ${serviceLabel(booking.service.type).toLowerCase()}?`} />
              <div className="px-space-lg pt-space-md">
                {booking.review ? (
                  <div className="flex flex-col gap-space-xs">
                    <div aria-label={`${booking.review.rating} out of 5 stars`} className="flex text-tertiary-container" role="img">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span className="material-symbols-outlined text-xl" key={n} style={{ fontVariationSettings: `'FILL' ${n <= booking.review!.rating ? 1 : 0}` }}>
                          star
                        </span>
                      ))}
                    </div>
                    <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">{booking.review.body}</p>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Posted {formatDateTime(booking.review.createdAt, tz)}
                      {booking.review.hidden ? " · Hidden by moderation" : ""}
                    </span>
                  </div>
                ) : (
                  <ReviewForm bookingId={booking.id} sitterFirstName={firstName} />
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="contents xl:flex xl:flex-col xl:gap-space-lg min-w-0 max-xl:[&>*]:order-4 max-xl:[&>*]:w-full">
          {/* Actions */}
          <Card className="max-xl:!order-2 p-space-lg flex flex-col gap-space-sm">
            {nextStep && (
              <p className="flex items-center gap-space-xs font-label-lg text-label-lg text-on-surface mb-space-xs">
                <span className="material-symbols-outlined text-primary text-xl">schedule</span>
                {nextStep}
              </p>
            )}
            <Link className={`${BTN.sage} w-full`} href={`/messages/new?sitter=${booking.sitter.id}`}>
              <span className="material-symbols-outlined text-xl">chat_bubble</span>
              Message {firstName}
            </Link>
            {serviceActive && (
              <Link className={`${BTN.secondary} w-full`} href={`/book/${booking.sitter.slug}?service=${booking.serviceId}&pets=${pets.map((p) => p.id).join(",")}`}>
                <span className="material-symbols-outlined text-xl">replay</span>
                Book again
              </Link>
            )}
            {canCancel && (
              <CancelBookingForm bookingId={booking.id} freeHours={FREE_CANCEL_HOURS} withinFreeWindow={hoursToStart >= FREE_CANCEL_HOURS} />
            )}
            {canCancel && laterCancellable > 1 && <SeriesCancelForm bookingId={booking.id} count={laterCancellable} />}
            <Link className={`${BTN.ghost} w-full text-on-surface-variant`} href={`/account/support/new?booking=${booking.id}`}>
              <span className="material-symbols-outlined text-xl">flag</span>
              Report a problem
            </Link>
          </Card>

          {/* Weekly series */}
          {members.length > 1 && (
            <Card className="p-space-lg flex flex-col gap-space-sm">
              <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-xl text-primary">event_repeat</span>
                Weekly series · {members.length} weeks
              </h2>
              <ul className="flex flex-col gap-space-xs">
                {members.map((m, i) => {
                  const st = BOOKING_STATUS_LABELS[m.status as BookingStatus] ?? { label: m.status, tone: "neutral" as const };
                  const current = m.id === booking.id;
                  return (
                    <li key={m.id}>
                      <Link
                        aria-current={current ? "page" : undefined}
                        className={`flex items-center justify-between gap-space-sm rounded-xl px-space-md py-space-xs font-body-sm text-body-sm ${
                          current ? "bg-[#EBF3EF] text-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                        }`}
                        href={`/account/bookings/${m.id}`}
                      >
                        <span>
                          <span className="font-semibold">Week {i + 1}</span> · {formatDayLong(zonedParts(m.startAt.getTime(), tz).iso)}
                        </span>
                        <span className="font-label-sm text-label-sm">{st.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant pt-space-xs">
                <span>Series total (active weeks)</span>
                <span className="font-semibold text-on-surface">
                  {formatMoney(
                    members.filter((m) => m.status !== "CANCELLED" && m.status !== "DECLINED").reduce((n, m) => n + m.totalCents, 0),
                    { exact: true },
                  )}
                </span>
              </div>
            </Card>
          )}

          {/* Price */}
          <Card className="p-space-lg flex flex-col gap-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface">Price Breakdown</h2>
            <div className="flex flex-col gap-space-xs font-body-md text-body-md text-on-surface-variant">
              {price.map((r) => (
                <div className={`flex justify-between gap-space-md ${r.cents < 0 ? "text-secondary font-medium" : ""}`} key={r.label}>
                  <span>{r.label}</span>
                  <span className={r.cents < 0 ? "" : "font-semibold text-on-surface"}>
                    {r.cents < 0 ? "-" : ""}
                    {formatMoney(Math.abs(r.cents), { exact: true })}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-surface-container-low p-space-md rounded-xl flex justify-between items-baseline mt-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Total</span>
              <span className="font-headline-sm text-headline-sm text-primary font-extrabold">{formatMoney(booking.totalCents, { exact: true })}</span>
            </div>
            {(booking.status === "CANCELLED" || booking.status === "DECLINED") && booking.discountCents > 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {formatMoney(booking.discountCents, { exact: true })} in WagPoints was returned to your wallet.
              </p>
            )}
          </Card>

          {/* Timeline */}
          <Card className="p-space-lg flex flex-col gap-space-md">
            <h2 className="font-title-md text-title-md text-on-surface">Timeline</h2>
            <ol className="flex flex-col">
              {timeline.map((t, i) => (
                <li className="flex gap-space-sm" key={t.label}>
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        t.tone === "bad" ? "bg-error-container text-on-error-container" : "bg-primary-fixed text-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{t.icon}</span>
                    </span>
                    {i < timeline.length - 1 && <span className="w-0.5 flex-1 min-h-4 bg-[#EFE7DE]" />}
                  </div>
                  <div className="pb-space-md min-w-0">
                    <p className="font-label-lg text-label-lg text-on-surface">{t.label}</p>
                    {t.at && <p className="font-body-sm text-body-sm text-on-surface-variant">{formatDateTime(t.at, tz)}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
