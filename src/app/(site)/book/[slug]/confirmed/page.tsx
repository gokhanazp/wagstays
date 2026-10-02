import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatMoney, formatRating } from "@/lib/format";
import { TIME_SLOTS } from "@/lib/booking-slots";
import { formatClock, formatLongDate, slotRange, toZonedParts } from "@/lib/booking-time";
import { SERVICE_ICONS, serviceLine } from "../_lib";

export const metadata: Metadata = { title: "Booking Requested | WagStays" };

export default async function BookingConfirmedPage({ params, searchParams }: PageProps<"/book/[slug]/confirmed">) {
  const { slug } = await params;
  const { id } = await searchParams;
  const bookingId = Array.isArray(id) ? id[0] : id;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/book/${slug}/confirmed?id=${bookingId ?? ""}`)}`);
  if (!bookingId) notFound();

  const booking = await db.booking.findFirst({
    where: { id: bookingId, ownerId: user.id, sitter: { slug } },
    include: { sitter: true, service: true, pet: true },
  });
  if (!booking) notFound();

  const start = toZonedParts(booking.startAt);
  const end = toZonedParts(booking.endAt);
  const slot = TIME_SLOTS.find((s) => s.start === start.hhmm);
  const timeLabel = slot ? slotRange(slot) : `${formatClock(start.hhmm)} – ${formatClock(end.hhmm)}`;
  const ref = `#WS-${booking.id.slice(-6).toUpperCase()}`;

  const rows = [
    { icon: SERVICE_ICONS[booking.service.type] ?? "pets", label: "Service", value: serviceLine(booking.service) },
    { icon: "pets", label: "Pet", value: `${booking.pet.name}${booking.pet.breed ? ` (${booking.pet.breed})` : ""}` },
    {
      icon: "calendar_month",
      label: "Date & Time",
      value: formatLongDate(start.iso),
      extra: `${timeLabel}${booking.recurringWeekly ? " · Repeats weekly" : ""}`,
    },
    { icon: "location_on", label: "Meeting Address", value: booking.meetingAddress ?? "—" },
    {
      icon: "credit_card",
      label: "Payment",
      value: booking.cardBrand && booking.cardLast4 ? `${booking.cardBrand} ending in ${booking.cardLast4}` : "Card on file",
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
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Booking Requested · {ref}</span>
            <h1 className="font-headline-md text-headline-md text-on-surface">You&apos;re all set, {user.firstName}! 🐾</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              We&apos;ve sent your request to {booking.sitter.displayName}. Your card is only charged once {booking.sitter.displayName.split(" ")[0]}{" "}
              confirms — funds are held securely until after the booking.
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
                <span className="text-tertiary-container font-bold">★ {formatRating(booking.sitter.rating)}</span>
                {booking.sitter.isSuperSitter && (
                  <>
                    <span>•</span>
                    <span className="bg-secondary/10 text-secondary px-1.5 py-0.5 rounded font-semibold text-xs">Super Sitter</span>
                  </>
                )}
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 bg-secondary-fixed/60 text-secondary px-space-sm py-1 rounded-full font-label-sm text-label-sm font-semibold">
              <span className="material-symbols-outlined text-sm">schedule</span>
              Awaiting confirmation
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
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-on-surface">{formatMoney(booking.subtotalCents, { exact: true })}</span>
            </div>
            <div className="flex justify-between">
              <span>WagShield Vet Protection</span>
              <span className="font-semibold text-on-surface">{formatMoney(booking.protectionFeeCents, { exact: true })}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform Service Fee</span>
              <span className="font-semibold text-on-surface">{formatMoney(booking.serviceFeeCents, { exact: true })}</span>
            </div>
            {booking.discountCents > 0 && (
              <div className="flex justify-between text-secondary font-medium">
                <span>WagPoints Discount</span>
                <span>-{formatMoney(booking.discountCents, { exact: true })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>HST</span>
              <span className="font-semibold text-on-surface">{formatMoney(booking.taxCents, { exact: true })}</span>
            </div>
          </div>
          <div className="bg-surface-container p-space-md rounded-xl flex justify-between items-baseline">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Total</span>
            <span className="font-headline-md text-headline-md text-primary font-extrabold">{formatMoney(booking.totalCents, { exact: true })}</span>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-space-sm">
          <Link
            className="w-full sm:w-auto py-3 px-space-lg rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg font-bold shadow-md hover:bg-secondary-container hover:text-on-secondary-container hover:-translate-y-0.5 transition-all flex items-center justify-center gap-space-xs"
            href="/"
          >
            <span className="material-symbols-outlined text-xl">home</span>
            Back to Home
          </Link>
          <Link
            className="w-full sm:w-auto py-3 px-space-lg rounded-full bg-surface-container-lowest text-primary ring-1 ring-primary/30 font-label-lg text-label-lg font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-space-xs"
            href={`/sitters/${booking.sitter.slug}`}
          >
            <span className="material-symbols-outlined text-xl">person</span>
            View Sitter
          </Link>
          <Link
            className="w-full sm:w-auto py-3 px-space-lg rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-space-xs"
            href="/account/bookings"
          >
            <span className="material-symbols-outlined text-xl">event_note</span>
            View my bookings
          </Link>
        </div>
      </div>
    </main>
  );
}
