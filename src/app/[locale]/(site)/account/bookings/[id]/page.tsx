import { priceLineLabel } from "@/lib/price-details";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedTransitions } from "@/lib/booking-lifecycle";
import { formatMoney, formatRating } from "@/lib/format";
import { BOOKING_STATUS_LABELS, type BookingStatus, type ServiceType } from "@/lib/constants";
import { BTN, Card, CardHeader, StatusChip, formatDateTime } from "@/components/ui";
import { FREE_CANCEL_HOURS, SERVICE_ICONS, bookingDay, bookingRef, bookingWhen, hoursUntil, quantityText } from "../../_lib";
import { CancelBookingForm } from "../../_components/CancelBookingForm";
import { ReviewForm } from "../../_components/ReviewForm";
import { SeriesCancelForm } from "../_components/SeriesCancelForm";
import { seriesMembers } from "@/lib/booking-series";
import { isStayService } from "@/lib/availability-core";
import { bookingPriceLines } from "@/lib/quote";
import { bookingPets, petNames } from "@/lib/pets";
import { PetChips } from "@/components/booking/PetChips";

export async function generateMetadata() {
  const t = await getTranslations("account.meta");
  return { title: t("bookingDetail") };
}

const NOTICES = ["cancelled", "reviewed"] as const;

export default async function BookingDetailPage({ params, searchParams }: PageProps<"/[locale]/account/bookings/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const noticeKey = (await searchParams).notice;
  const [t, tc, locale] = await Promise.all([getTranslations("account.detail"), getTranslations("common"), getLocale()]);
  const ta = await getTranslations("account");
  const notice = NOTICES.find((n) => n === noticeKey) ? t(`notices.${noticeKey as (typeof NOTICES)[number]}`) : undefined;
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
  const statusLabel = (s: string) => {
    const st = BOOKING_STATUS_LABELS[s as BookingStatus];
    return st ? { label: tc(`enums.bookingStatus.${s as BookingStatus}`), tone: st.tone } : { label: s, tone: "neutral" as const };
  };
  const status = statusLabel(booking.status);
  const service = tc(`enums.service.${booking.service.type as ServiceType}`);
  const money = (cents: number) => formatMoney(cents, { exact: true, locale });
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
  const names = petNames(pets.map((p) => p.name), locale);

  const timeline: { icon: string; label: string; at: Date | null; tone: "done" | "bad" }[] = [
    { icon: "send", label: t("timeline.requested"), at: booking.createdAt, tone: "done" },
    ...(booking.confirmedAt ? [{ icon: "check_circle", label: t("timeline.confirmedBy", { name: firstName }), at: booking.confirmedAt, tone: "done" as const }] : []),
    ...(booking.completedAt ? [{ icon: "task_alt", label: t("timeline.completed"), at: booking.completedAt, tone: "done" as const }] : []),
    ...(booking.status === "DECLINED" ? [{ icon: "block", label: t("timeline.declinedBy", { name: firstName }), at: booking.updatedAt, tone: "bad" as const }] : []),
    ...(booking.status === "CANCELLED"
      ? [
          {
            icon: "event_busy",
            label:
              booking.cancelledBy === "OWNER"
                ? t("timeline.cancelledByYou")
                : booking.cancelledBy === "SITTER"
                  ? t("timeline.cancelledBy", { name: firstName })
                  : t("timeline.cancelledBySupport"),
            at: booking.cancelledAt,
            tone: "bad" as const,
          },
        ]
      : []),
    ...(booking.review ? [{ icon: "star", label: t("timeline.reviewed"), at: booking.review.createdAt, tone: "done" as const }] : []),
  ];
  const nextStep =
    booking.status === "PENDING"
      ? t("next.pending", { name: firstName })
      : booking.status === "CONFIRMED"
        ? hoursToStart > 0
          ? t("next.upcoming")
          : t("next.inProgress", { name: firstName })
        : null;

  const care = [
    { icon: "location_on", label: t("care.meetingAddress"), value: booking.meetingAddress },
    { icon: "nest_eco_leaf", label: t("care.leash"), value: booking.leashPreference },
    { icon: "diversity_1", label: t("care.otherAnimals"), value: booking.otherAnimalsReaction },
    { icon: "restaurant", label: t("care.feeding"), value: booking.feedingRules },
    { icon: "sticky_note_2", label: t("care.notes"), value: booking.notes },
    { icon: "my_location", label: t("care.gps"), value: booking.gpsUpdates ? t("care.gpsOn") : t("care.gpsOff") },
    {
      icon: "emergency",
      label: t("care.emergency"),
      value: booking.emergencyName ? `${booking.emergencyName}${booking.emergencyPhone ? ` · ${booking.emergencyPhone}` : ""}` : null,
    },
    { icon: "medical_services", label: t("care.vet"), value: booking.vetClinic ? `${booking.vetClinic}${booking.vetPhone ? ` · ${booking.vetPhone}` : ""}` : null },
  ].filter((r) => r.value);

  const price = [
    ...(booking.priceLines
      ? bookingPriceLines(booking).map((l, i) => ({ label: priceLineLabel(l, i, locale), cents: l.amountCents }))
      : [
          {
            label: showQuantity
              ? t("price.line", {
                  quantity: quantityText(booking.service.type, booking.quantity, locale),
                  price: money(Math.round(booking.subtotalCents / Math.max(booking.quantity, 1))),
                })
              : t("price.subtotal", { service }),
            cents: booking.subtotalCents,
          },
        ]),
    { label: t("price.protection"), cents: booking.protectionFeeCents },
    { label: t("price.serviceFee"), cents: booking.serviceFeeCents },
    ...(booking.discountCents > 0 ? [{ label: t("price.discount"), cents: -booking.discountCents }] : []),
    { label: t("price.tax"), cents: booking.taxCents },
  ];

  return (
    <>
      <div className="flex flex-col gap-space-sm">
        <Link className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href="/account/bookings">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {tc("nav.myBookings")}
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-space-md">
          <div className="flex flex-col gap-1">
            <span className="font-label-md text-label-md uppercase tracking-wide text-primary">{t("bookingRef", { ref: bookingRef(booking.id) })}</span>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md text-on-surface">
              {t("heading", { service, name: firstName })}
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
                  <span className="text-tertiary-container font-bold">★ {formatRating(booking.sitter.rating, locale)}</span>
                  {booking.sitter.isSuperSitter && (
                    <>
                      <span>•</span>
                      <span className="text-secondary font-semibold">{t("superSitter")}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-space-md font-body-sm text-body-sm">
              {[
                {
                  icon: SERVICE_ICONS[booking.service.type] ?? "pets",
                  label: t("summary.service"),
                  value: booking.service.durationMins ? t("summary.serviceMinutes", { service, mins: booking.service.durationMins }) : service,
                },
                pets.length > 1
                  ? { icon: "pets", label: t("summary.pets", { count: pets.length }), value: names }
                  : { icon: "pets", label: t("summary.pet"), value: `${booking.pet.name}${booking.pet.breed ? ` (${booking.pet.breed})` : ""}` },
                {
                  icon: "calendar_month",
                  label: t("summary.dateTime"),
                  value: bookingWhen(booking.startAt, booking.endAt, tz, locale),
                  extra: [
                    showQuantity && quantityText(booking.service.type, booking.quantity, locale),
                    members.length > 1 ? ta("shared.weekOf", { index: position, total: members.length }) : booking.recurringWeekly && t("summary.repeatsWeekly"),
                    booking.meetAndGreet && t("summary.meetGreet"),
                  ]
                    .filter(Boolean)
                    .join(" · "),
                },
                {
                  icon: "credit_card",
                  label: t("summary.payment"),
                  value: booking.cardBrand && booking.cardLast4 ? t("summary.cardEnding", { brand: booking.cardBrand, last4: booking.cardLast4 }) : t("summary.cardOnFile"),
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
                  <span className="font-semibold">{t("noteFrom", { name: firstName })}</span> {booking.sitterNote}
                </p>
              </div>
            )}
            {booking.cancelReason && (
              <div className="flex items-start gap-space-sm bg-surface-container-low rounded-xl p-space-md font-body-sm text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-lg">info</span>
                <p className="min-w-0">
                  <span className="font-semibold text-on-surface">{booking.status === "DECLINED" ? t("reasonGiven") : t("cancellationReason")}</span> {booking.cancelReason}
                </p>
              </div>
            )}
          </Card>

          {/* Care instructions */}
          <Card className="pb-space-lg">
            <CardHeader icon="volunteer_activism" title={t("care.title")} />
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
              <p className="px-space-lg pt-space-md font-body-sm text-body-sm text-on-surface-variant">{t("care.none")}</p>
            )}
          </Card>

          {/* Review */}
          {booking.status === "COMPLETED" && (
            <Card className="pb-space-lg">
              <div id="review" className="scroll-mt-28" />
              <CardHeader icon="star" title={booking.review ? t("review.yours") : t("review.howWas", { pets: names, service: service.toLowerCase() })} />
              <div className="px-space-lg pt-space-md">
                {booking.review ? (
                  <div className="flex flex-col gap-space-xs">
                    <div aria-label={t("review.stars", { rating: booking.review.rating })} className="flex text-tertiary-container" role="img">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span className="material-symbols-outlined text-xl" key={n} style={{ fontVariationSettings: `'FILL' ${n <= booking.review!.rating ? 1 : 0}` }}>
                          star
                        </span>
                      ))}
                    </div>
                    <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">{booking.review.body}</p>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {t("review.posted", { date: formatDateTime(booking.review.createdAt, tz, locale) })}
                      {booking.review.hidden ? t("review.hidden") : ""}
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
              {t("actions.message", { name: firstName })}
            </Link>
            {serviceActive && (
              <Link className={`${BTN.secondary} w-full`} href={`/book/${booking.sitter.slug}?service=${booking.serviceId}&pets=${pets.map((p) => p.id).join(",")}`}>
                <span className="material-symbols-outlined text-xl">replay</span>
                {t("actions.bookAgain")}
              </Link>
            )}
            {canCancel && (
              <CancelBookingForm bookingId={booking.id} freeHours={FREE_CANCEL_HOURS} withinFreeWindow={hoursToStart >= FREE_CANCEL_HOURS} />
            )}
            {canCancel && laterCancellable > 1 && <SeriesCancelForm bookingId={booking.id} count={laterCancellable} />}
            <Link className={`${BTN.ghost} w-full text-on-surface-variant`} href={`/account/support/new?booking=${booking.id}`}>
              <span className="material-symbols-outlined text-xl">flag</span>
              {t("actions.report")}
            </Link>
          </Card>

          {/* Weekly series */}
          {members.length > 1 && (
            <Card className="p-space-lg flex flex-col gap-space-sm">
              <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-xl text-primary">event_repeat</span>
                {t("series.title", { count: members.length })}
              </h2>
              <ul className="flex flex-col gap-space-xs">
                {members.map((m, i) => {
                  const st = statusLabel(m.status);
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
                          <span className="font-semibold">{t("series.week", { n: i + 1 })}</span> · {bookingDay(m.startAt, tz, locale)}
                        </span>
                        <span className="font-label-sm text-label-sm">{st.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="flex justify-between font-body-sm text-body-sm text-on-surface-variant pt-space-xs">
                <span>{t("series.total")}</span>
                <span className="font-semibold text-on-surface">
                  {money(members.filter((m) => m.status !== "CANCELLED" && m.status !== "DECLINED").reduce((n, m) => n + m.totalCents, 0))}
                </span>
              </div>
            </Card>
          )}

          {/* Price */}
          <Card className="p-space-lg flex flex-col gap-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface">{t("price.title")}</h2>
            <div className="flex flex-col gap-space-xs font-body-md text-body-md text-on-surface-variant">
              {price.map((r) => (
                <div className={`flex justify-between gap-space-md ${r.cents < 0 ? "text-secondary font-medium" : ""}`} key={r.label}>
                  <span>{r.label}</span>
                  <span className={r.cents < 0 ? "" : "font-semibold text-on-surface"}>
                    {r.cents < 0 ? "-" : ""}
                    {money(Math.abs(r.cents))}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-surface-container-low p-space-md rounded-xl flex justify-between items-baseline mt-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">{t("price.total")}</span>
              <span className="font-headline-sm text-headline-sm text-primary font-extrabold">{money(booking.totalCents)}</span>
            </div>
            {(booking.status === "CANCELLED" || booking.status === "DECLINED") && booking.discountCents > 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {t("price.pointsReturned", { amount: money(booking.discountCents) })}
              </p>
            )}
          </Card>

          {/* Timeline */}
          <Card className="p-space-lg flex flex-col gap-space-md">
            <h2 className="font-title-md text-title-md text-on-surface">{t("timeline.title")}</h2>
            <ol className="flex flex-col">
              {timeline.map((item, i) => (
                <li className="flex gap-space-sm" key={item.label}>
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        item.tone === "bad" ? "bg-error-container text-on-error-container" : "bg-primary-fixed text-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{item.icon}</span>
                    </span>
                    {i < timeline.length - 1 && <span className="w-0.5 flex-1 min-h-4 bg-[#EFE7DE]" />}
                  </div>
                  <div className="pb-space-md min-w-0">
                    <p className="font-label-lg text-label-lg text-on-surface">{item.label}</p>
                    {item.at && <p className="font-body-sm text-body-sm text-on-surface-variant">{formatDateTime(item.at, tz, locale)}</p>}
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
