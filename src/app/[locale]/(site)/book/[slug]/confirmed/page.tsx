import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatMoney, formatRating } from "@/lib/format";
import { TIME_SLOTS } from "@/lib/booking-slots";
import { formatClock, formatLongDate, slotRange, toZonedParts } from "@/lib/booking-time";
import { formatDayLong, isStayService, quantityLabel, zonedParts } from "@/lib/availability-core";
import { SERVICE_ICONS, serviceLine } from "../_lib";
import { getPlatformSettings } from "@/lib/settings";
import { EarnPointsNote } from "@/components/points/EarnPointsNote";
import { bookingPriceLines } from "@/lib/quote";
import { priceLineLabel, taxName } from "@/lib/price-details";
import { bookingPets, petNames } from "@/lib/pets";
import { localizedPath } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations("booking.confirmed");
  return { title: t("metaTitle") };
}

export default async function BookingConfirmedPage({ params, searchParams }: PageProps<"/[locale]/book/[slug]/confirmed">) {
  const { slug } = await params;
  const { id } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("booking.confirmed");
  const tc = await getTranslations("booking.checkout");
  const money = (c: number) => formatMoney(c, { exact: true, locale });
  const bookingId = Array.isArray(id) ? id[0] : id;

  const user = await getCurrentUser();
  if (!user) redirect(await localizedPath(`/login?next=${encodeURIComponent(`/book/${slug}/confirmed?id=${bookingId ?? ""}`)}`));
  if (!bookingId) notFound();

  const booking = await db.booking.findFirst({
    where: { id: bookingId, ownerId: user.id, sitter: { slug } },
    include: { sitter: { include: { city: { select: { timeZone: true } } } }, service: true, pet: true, pets: { include: { pet: true } } },
  });
  if (!booking) notFound();
  const series = booking.seriesId
    ? await db.booking.findMany({
        where: { seriesId: booking.seriesId, ownerId: user.id },
        orderBy: { startAt: "asc" },
        select: { id: true, startAt: true, totalCents: true },
      })
    : [];
  const stay = isStayService(booking.service.type);
  const pets = bookingPets(booking);
  const lines = bookingPriceLines(booking);

  const start = toZonedParts(booking.startAt);
  const end = toZonedParts(booking.endAt);
  const slot = TIME_SLOTS.find((s) => s.start === start.hhmm);
  const timeLabel = stay
    ? tc("schedule.dropOffQty", { time: formatClock(start.hhmm, locale), qty: quantityLabel(booking.service.type, booking.quantity, locale) })
    : slot
      ? slotRange(slot, locale)
      : `${formatClock(start.hhmm, locale)} – ${formatClock(end.hhmm, locale)}`;
  const seriesTotal = series.reduce((n, b) => n + b.totalCents, 0);
  const ref = `#WS-${booking.id.slice(-6).toUpperCase()}`;

  const rows = [
    { icon: SERVICE_ICONS[booking.service.type] ?? "pets", label: t("service"), value: serviceLine(booking.service, locale) },
    pets.length > 1
      ? { icon: "pets", label: t("pets", { count: pets.length }), value: petNames(pets.map((p) => p.name), locale) }
      : { icon: "pets", label: t("pet"), value: `${booking.pet.name}${booking.pet.breed ? ` (${booking.pet.breed})` : ""}` },
    {
      icon: "calendar_month",
      label: t("dateTime"),
      value: stay
        ? tc("schedule.dateRange", { from: formatDayLong(start.iso, locale), to: formatDayLong(end.iso, locale) })
        : formatLongDate(start.iso, locale),
      extra: `${timeLabel}${series.length > 1 ? ` · ${t("weekly", { count: series.length })}` : booking.recurringWeekly ? ` · ${t("repeats")}` : ""}`,
    },
    { icon: "location_on", label: t("address"), value: booking.meetingAddress ?? "—" },
    {
      icon: "credit_card",
      label: t("payment"),
      value: booking.cardBrand && booking.cardLast4 ? t("card", { brand: booking.cardBrand, last4: booking.cardLast4 }) : t("cardOnFile"),
    },
  ];

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="w-full max-w-[880px] mx-auto px-margin-mobile md:px-margin py-space-xl flex flex-col gap-space-xl">
        <section className="bg-surface-container-lowest rounded-3xl p-space-lg md:p-space-xl shadow-sm flex flex-col items-center text-center gap-space-md">
          <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">{t("requested", { ref })}</span>
            <h1 className="font-headline-md text-headline-md text-on-surface">{t("allSet", { name: user.firstName })}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              {t("sent", { sitter: booking.sitter.displayName, first: booking.sitter.displayName.split(" ")[0] })}
            </p>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="bg-surface-container-low p-space-md rounded-xl flex items-center gap-space-md">
            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 ring-2 ring-primary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={booking.sitter.displayName} className="w-full h-full object-cover" src={booking.sitter.avatarUrl} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="font-title-md text-title-md text-on-surface font-bold truncate">{booking.sitter.displayName}</h2>
                <span className="material-symbols-outlined text-primary text-base">verified</span>
              </div>
              <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                <span className="text-tertiary-container font-bold">★ {formatRating(booking.sitter.rating, locale)}</span>
                {booking.sitter.isSuperSitter && (
                  <>
                    <span>•</span>
                    <span className="bg-secondary/10 text-secondary px-1.5 py-0.5 rounded font-semibold text-xs">{tc("summary.superSitter")}</span>
                  </>
                )}
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 bg-secondary-fixed/60 text-secondary px-space-sm py-1 rounded-full font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-sm">schedule</span>
              {t("awaiting")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md font-body-sm text-body-sm">
            {rows.map((r) => (
              <div className="flex items-start gap-space-sm text-on-surface-variant" key={r.label}>
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">{r.icon}</span>
                <div className="min-w-0">
                  <span className="font-semibold text-on-surface block">{r.label}</span>
                  <span>{r.value}</span>
                  {r.extra && <span className="block text-primary font-medium">{r.extra}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="w-full h-px bg-surface-container-high" />

          <div className="flex flex-col gap-space-xs font-body-md text-body-md text-on-surface-variant">
            {series.length > 1 && (
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">{t("firstOfSeries", { count: series.length })}</span>
            )}
            {lines.map((l, i) => (
              <div className="flex justify-between gap-space-sm" data-price-line key={`${l.label}-${i}`}>
                <span className="min-w-0">{priceLineLabel(l, i, locale)}</span>
                <span className="font-semibold text-on-surface whitespace-nowrap">{money(l.amountCents)}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>{tc("summary.wagShield")}</span>
              <span className="font-semibold text-on-surface">{money(booking.protectionFeeCents)}</span>
            </div>
            <div className="flex justify-between">
              <span>{tc("summary.serviceFee")}</span>
              <span className="font-semibold text-on-surface">{money(booking.serviceFeeCents)}</span>
            </div>
            {booking.discountCents > 0 && (
              <div className="flex justify-between text-secondary font-medium">
                <span>{tc("summary.discount")}</span>
                <span>-{money(booking.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{taxName("HST", locale)}</span>
              <span className="font-semibold text-on-surface">{money(booking.taxCents)}</span>
            </div>
          </div>
          <div className="bg-surface-container p-space-md rounded-xl flex justify-between items-baseline">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">{series.length > 1 ? t("firstBooking") : t("total")}</span>
            <span className="font-headline-md text-headline-md text-primary font-extrabold" data-testid="confirmed-total">
              {money(booking.totalCents)}
            </span>
          </div>
          {series.length > 1 && (
            <div className="flex flex-col gap-space-sm">
              <h3 className="font-title-md text-title-md text-on-surface">{t("schedule")}</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                {series.map((b, i) => (
                  <li className="flex items-center justify-between gap-space-sm bg-surface-container-low rounded-xl px-space-md py-space-xs" key={b.id}>
                    <span>
                      <span className="font-semibold text-on-surface">{t("week", { n: i + 1 })}</span> ·{" "}
                      {formatDayLong(zonedParts(b.startAt.getTime(), booking.sitter.city.timeZone).iso, locale)}
                    </span>
                    <span className="font-semibold text-on-surface">{money(b.totalCents)}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-surface-container p-space-md rounded-xl flex justify-between items-baseline">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">{t("allWeeks", { count: series.length })}</span>
                <span className="font-headline-sm text-headline-sm text-primary font-extrabold">{money(seriesTotal)}</span>
              </div>
            </div>
          )}
          <EarnPointsNote className="justify-center" earnRateBps={(await getPlatformSettings()).pointsEarnRateBps} subtotalCents={booking.subtotalCents} />
        </section>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-space-sm">
          <Link
            className="w-full sm:w-auto py-3 px-space-lg rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg font-bold shadow-md hover:bg-secondary-container hover:text-on-secondary-container hover:-translate-y-0.5 transition-all flex items-center justify-center gap-space-xs"
            href="/"
          >
            <span className="material-symbols-outlined text-xl">home</span>
            {t("backHome")}
          </Link>
          <Link
            className="w-full sm:w-auto py-3 px-space-lg rounded-full bg-surface-container-lowest text-primary ring-1 ring-primary/30 font-label-lg text-label-lg font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-space-xs"
            href={`/sitters/${booking.sitter.slug}`}
          >
            <span className="material-symbols-outlined text-xl">person</span>
            {t("viewSitter")}
          </Link>
          <Link
            className="w-full sm:w-auto py-3 px-space-lg rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-space-xs"
            href="/account/bookings"
          >
            <span className="material-symbols-outlined text-xl">event_note</span>
            {t("viewBookings")}
          </Link>
        </div>
      </div>
    </main>
  );
}
