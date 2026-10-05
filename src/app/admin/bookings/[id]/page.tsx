import type { Metadata } from "next";
import { bookingPets, petKindLabel, petNames } from "@/lib/pets";
import { bookingPriceLines } from "@/lib/quote";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { allowedTransitions } from "@/lib/booking-lifecycle";
import { BOOKING_STATUS_LABELS, SERVICE_LABELS, UNIT_LABELS, type BookingStatus, type ServiceType } from "@/lib/constants";
import { Card, CardHeader, PageHeader, StatusChip, formatDate, formatDateTime } from "@/components/ui";
import { shortRef } from "../_lib";
import { StatusActions } from "./_components/StatusActions";
import { CreditForm } from "./_components/CreditForm";

export async function generateMetadata({ params }: PageProps<"/admin/bookings/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Booking ${shortRef(id)}` };
}

const TRAIT_TONES: Record<string, "neutral" | "primary" | "warning"> = { neutral: "neutral", primary: "primary", warning: "warning" };
const ACTOR: Record<string, string> = { OWNER: "the owner", SITTER: "the sitter", ADMIN: "WagStays (admin)" };

export default async function AdminBookingDetailPage({ params }: PageProps<"/admin/bookings/[id]">) {
  const { id } = await params;
  const b = await db.booking.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, wagPointsCents: true, createdAt: true, suspended: true } },
      pet: { include: { traits: true } },
      pets: { include: { pet: { include: { traits: true } } } },
      sitter: {
        include: {
          user: { select: { email: true, phone: true } },
          city: { select: { name: true, timeZone: true } },
          neighbourhood: { select: { name: true } },
        },
      },
      service: true,
      review: true,
    },
  });
  if (!b) notFound();

  const tz = b.sitter.city.timeZone;
  const status = b.status as BookingStatus;
  const st = BOOKING_STATUS_LABELS[status] ?? { label: b.status, tone: "neutral" as const };
  const allowed = allowedTransitions(b.status, "ADMIN").filter(
    (t): t is "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELLED" => t !== "DRAFT" && t !== "PENDING",
  );

  const history = await db.auditLog.findMany({
    where: {
      OR: [
        { entityType: "Booking", entityId: b.id },
        { entityType: "User", entityId: b.ownerId, action: "user.wagpoints_credit", details: { contains: b.id } },
      ],
    },
    include: { actor: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const timeline: { icon: string; title: string; at: Date | null; text?: string; tone: string }[] = [
    { icon: "add_circle", title: "Requested", at: b.createdAt, text: `by ${b.owner.firstName} ${b.owner.lastName}`, tone: "text-primary" },
  ];
  if (b.confirmedAt) timeline.push({ icon: "check_circle", title: "Confirmed", at: b.confirmedAt, tone: "text-primary" });
  if (b.completedAt) timeline.push({ icon: "task_alt", title: "Completed", at: b.completedAt, tone: "text-primary" });
  if (b.status === "DECLINED") timeline.push({ icon: "block", title: "Declined", at: b.updatedAt, text: b.cancelReason ?? undefined, tone: "text-error" });
  if (b.cancelledAt)
    timeline.push({
      icon: "cancel",
      title: `Cancelled${b.cancelledBy ? ` by ${ACTOR[b.cancelledBy] ?? b.cancelledBy.toLowerCase()}` : ""}`,
      at: b.cancelledAt,
      text: b.cancelReason ? `“${b.cancelReason}”` : "No reason given",
      tone: "text-error",
    });
  if (b.status === "PENDING") timeline.push({ icon: "hourglass_top", title: "Awaiting the sitter's reply", at: null, tone: "text-tertiary" });

  const unit = UNIT_LABELS[b.service.unit] ?? b.service.unit.toLowerCase();
  const pets = bookingPets(b);
  const price: [string, number, string?][] = [
    ...(b.priceLines
      ? bookingPriceLines(b).map((l): [string, number] => [l.label, l.amountCents])
      : [
          [`${SERVICE_LABELS[b.service.type as ServiceType] ?? b.service.type} (${formatMoney(b.service.priceCents)} / ${unit})`, b.subtotalCents] as [
            string,
            number,
          ],
        ]),
    ["WagShield protection", b.protectionFeeCents],
    ["Service fee", b.serviceFeeCents],
  ];
  if (b.discountCents) price.push(["WagPoints discount", -b.discountCents, "text-primary"]);
  price.push(["HST", b.taxCents]);

  return (
    <>
      <Link className="inline-flex items-center gap-1 font-label-lg text-label-lg text-primary hover:underline w-fit" href="/admin/bookings">
        <span className="material-symbols-outlined text-xl">arrow_back</span>
        All bookings
      </Link>
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-space-xs">
            <StatusChip tone={st.tone}>{st.label}</StatusChip>
            {b.meetAndGreet && (
              <StatusChip icon="handshake" tone="warning">
                Meet &amp; Greet requested
              </StatusChip>
            )}
            {b.recurringWeekly && (
              <StatusChip icon="event_repeat" tone="primary">
                Repeats weekly
              </StatusChip>
            )}
          </div>
        }
        description={
          <>
            {petNames(pets.map((p) => p.name))} with {b.sitter.displayName} · {formatDateTime(b.startAt, tz)} ·{" "}
            <span className="font-mono text-body-sm">{b.id}</span>
          </>
        }
        eyebrow="Booking"
        title={shortRef(b.id)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-space-lg items-start">
        <div className="flex flex-col gap-space-lg min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            <Card className="pb-space-lg">
              <CardHeader icon="person" title="Owner" />
              <dl className="px-space-lg pt-space-md flex flex-col gap-space-sm">
                <Row label="Name">
                  {b.owner.firstName} {b.owner.lastName}
                  {b.owner.suspended && (
                    <span className="ml-2">
                      <StatusChip tone="danger">Suspended</StatusChip>
                    </span>
                  )}
                </Row>
                <Row label="Email">
                  <a className="text-primary hover:underline break-all" href={`mailto:${b.owner.email}`}>
                    {b.owner.email}
                  </a>
                </Row>
                <Row label="Phone">{b.owner.phone ?? "—"}</Row>
                <Row label="WagPoints">{formatMoney(b.owner.wagPointsCents, { exact: true })}</Row>
                <Row label="Member since">{formatDate(b.owner.createdAt, tz)}</Row>
              </dl>
            </Card>
            <Card className="pb-space-lg">
              <CardHeader icon="volunteer_activism" title="Sitter" />
              <dl className="px-space-lg pt-space-md flex flex-col gap-space-sm">
                <Row label="Name">
                  <Link className="text-primary hover:underline" href={`/sitters/${b.sitter.slug}`}>
                    {b.sitter.displayName}
                  </Link>
                </Row>
                <Row label="Email">
                  <a className="text-primary hover:underline break-all" href={`mailto:${b.sitter.user.email}`}>
                    {b.sitter.user.email}
                  </a>
                </Row>
                <Row label="Phone">{b.sitter.user.phone ?? "—"}</Row>
                <Row label="Area">
                  {b.sitter.neighbourhood.name}, {b.sitter.city.name}
                </Row>
                <Row label="Profile">{b.sitter.status === "ACTIVE" ? "Active" : "Paused"}</Row>
              </dl>
            </Card>
          </div>

          <Card className="pb-space-lg">
            <CardHeader icon="pets" title={pets.length > 1 ? `${pets.length} pets` : "Pet"} />
            <div className="px-space-lg pt-space-md flex flex-col gap-space-lg">
              {pets.map((pet) => (
                <div className="flex flex-col gap-space-md" key={pet.id}>
                  <div className="flex items-center gap-space-md">
                    {pet.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="w-14 h-14 rounded-2xl object-cover" src={pet.photoUrl} />
                    ) : (
                      <span className="w-14 h-14 rounded-2xl bg-surface-container-low text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">pets</span>
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span className="font-title-md text-title-md text-on-surface">{pet.name}</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {[
                          petKindLabel(b.pet),
                          pet.breed,
                          pet.ageYears != null && `${pet.ageYears} yrs`,
                          pet.size && pet.size.toLowerCase(),
                          pet.sex && pet.sex.toLowerCase(),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-space-xs">
                    {pet.neutered && <StatusChip tone="neutral">Spayed / neutered</StatusChip>}
                    <StatusChip tone={pet.rabiesVaccinated ? "success" : "warning"}>
                      {pet.rabiesVaccinated ? "Rabies vaccinated" : "Rabies vaccine not on file"}
                    </StatusChip>
                    {pet.microchip && <StatusChip tone="neutral">Microchip {pet.microchip}</StatusChip>}
                    {pet.traits.map((t) => (
                      <StatusChip key={t.id} icon={t.icon ?? undefined} tone={TRAIT_TONES[t.tone] ?? "neutral"}>
                        {t.label}
                      </StatusChip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="calendar_month" title="Service & schedule" />
            <dl className="px-space-lg pt-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <Row label="Service">
                {SERVICE_LABELS[b.service.type as ServiceType] ?? b.service.type}
                {b.service.durationMins ? ` · ${b.service.durationMins} min` : ""}
              </Row>
              <Row label="Rate">
                {formatMoney(b.service.priceCents)} / {unit}
              </Row>
              <Row label="Starts">{formatDateTime(b.startAt, tz)}</Row>
              <Row label="Ends">{formatDateTime(b.endAt, tz)}</Row>
              <Row label="Repeats">{b.recurringWeekly ? "Every week" : "One-off"}</Row>
              <Row label="Meet & Greet">{b.meetAndGreet ? "Requested before the first visit" : "Not requested"}</Row>
              <div className="sm:col-span-2">
                <Row label="Meeting address">{b.meetingAddress ?? "—"}</Row>
              </div>
            </dl>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="assignment" title="Care instructions" />
            <dl className="px-space-lg pt-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <Row label="Leash">{b.leashPreference ?? "—"}</Row>
              <Row label="Around other animals">{b.otherAnimalsReaction ?? "—"}</Row>
              <div className="sm:col-span-2">
                <Row label="Feeding">{b.feedingRules ?? "—"}</Row>
              </div>
              <div className="sm:col-span-2">
                <Row label="Notes">{b.notes ? <span className="whitespace-pre-line">{b.notes}</span> : "—"}</Row>
              </div>
              <Row label="GPS walk updates">{b.gpsUpdates ? "On" : "Off"}</Row>
            </dl>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="emergency" title="Emergency & vet" />
            <dl className="px-space-lg pt-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <Row label="Emergency contact">{b.emergencyName ?? "—"}</Row>
              <Row label="Emergency phone">
                {b.emergencyPhone ? (
                  <a className="text-primary hover:underline" href={`tel:${b.emergencyPhone}`}>
                    {b.emergencyPhone}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Vet clinic">{b.vetClinic ?? "—"}</Row>
              <Row label="Vet phone">{b.vetPhone ?? "—"}</Row>
            </dl>
          </Card>

          {b.sitterNote && (
            <Card className="pb-space-lg">
              <CardHeader icon="chat" title="Note from the sitter" />
              <p className="px-space-lg pt-space-md font-body-md text-body-md text-on-surface whitespace-pre-line">{b.sitterNote}</p>
            </Card>
          )}

          <Card className="pb-space-lg">
            <CardHeader
              action={
                b.review ? (
                  <Link
                    className="font-label-md text-label-md text-primary hover:underline"
                    href={`/admin/reviews?q=${encodeURIComponent(b.review.authorName)}&sitter=${b.sitterId}`}
                  >
                    Moderate
                  </Link>
                ) : undefined
              }
              icon="reviews"
              title="Review"
            />
            <div className="px-space-lg pt-space-md">
              {b.review ? (
                <div className="flex flex-col gap-space-sm">
                  <div className="flex flex-wrap items-center gap-space-sm">
                    <span aria-label={`${b.review.rating} out of 5`} className="text-secondary tracking-tight">
                      {"★".repeat(b.review.rating)}
                      <span className="text-outline-variant">{"★".repeat(5 - b.review.rating)}</span>
                    </span>
                    <span className="font-label-lg text-label-lg text-on-surface">{b.review.authorName}</span>
                    {b.review.hidden && <StatusChip tone="danger">Hidden</StatusChip>}
                    {b.review.featuredOnHome && <StatusChip tone="primary">On home page</StatusChip>}
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant">{b.review.body}</p>
                </div>
              ) : (
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {b.status === "COMPLETED" ? "The owner hasn't left a review yet." : "Reviews open once the booking is completed."}
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-space-lg min-w-0 lg:sticky lg:top-space-lg">
          <Card className="pb-space-lg">
            <CardHeader icon="admin_panel_settings" title="Admin actions" />
            <div className="px-space-lg pt-space-md">
              <StatusActions allowed={allowed} bookingId={b.id} hasDiscount={b.discountCents > 0} />
            </div>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="receipt_long" title="Payment" />
            <div className="px-space-lg pt-space-md flex flex-col gap-space-sm">
              {price.map(([label, cents, tone]) => (
                <div key={label} className="flex justify-between gap-space-md font-body-md text-body-md">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className={`whitespace-nowrap ${tone ?? "text-on-surface"}`}>
                    {cents < 0 ? "−" : ""}
                    {formatMoney(Math.abs(cents), { exact: true })}
                  </span>
                </div>
              ))}
              <div className="flex justify-between gap-space-md pt-space-sm border-t border-[#EFE7DE] font-title-md text-title-md text-on-surface">
                <span>Total</span>
                <span>{formatMoney(b.totalCents, { exact: true })}</span>
              </div>
              <div className="flex items-center gap-space-sm mt-space-xs p-space-sm rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-xl text-primary">credit_card</span>
                {b.cardBrand && b.cardLast4 ? `${b.cardBrand} ending in ${b.cardLast4}` : "No card on file"}
              </div>
            </div>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="redeem" title="Goodwill credit" />
            <div className="px-space-lg pt-space-sm flex flex-col gap-space-md">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Add WagPoints to {b.owner.firstName}&apos;s balance (currently {formatMoney(b.owner.wagPointsCents, { exact: true })}). Every credit is logged.
              </p>
              <CreditForm bookingId={b.id} ownerName={`${b.owner.firstName} ${b.owner.lastName}`} />
            </div>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="timeline" title="Timeline" />
            <ol className="px-space-lg pt-space-md flex flex-col">
              {timeline.map((t, i) => (
                <li key={t.title} className="relative flex gap-space-md pb-space-md last:pb-0">
                  {i < timeline.length - 1 && <span className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-[#EFE7DE]" />}
                  <span className={`material-symbols-outlined text-2xl ${t.tone}`}>{t.icon}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface">{t.title}</span>
                    {t.at && <span className="font-body-sm text-body-sm text-on-surface-variant">{formatDateTime(t.at, tz)}</span>}
                    {t.text && <span className="font-body-sm text-body-sm text-on-surface-variant break-words">{t.text}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {history.length > 0 && (
            <Card className="pb-space-lg">
              <CardHeader icon="history" title="Admin activity" />
              <ul className="px-space-lg pt-space-md flex flex-col gap-space-sm">
                {history.map((h) => {
                  const d = safeJson(h.details);
                  return (
                    <li key={h.id} className="flex flex-col font-body-sm text-body-sm">
                      <span className="font-label-md text-label-md text-on-surface">{ACTION_LABELS[h.action] ?? h.action}</span>
                      <span className="text-on-surface-variant">
                        {h.actor.firstName} {h.actor.lastName} · {formatDateTime(h.createdAt, tz)}
                      </span>
                      {typeof d?.amountCents === "number" && <span className="text-on-surface-variant">{formatMoney(d.amountCents, { exact: true })}</span>}
                      {typeof d?.reason === "string" && <span className="text-on-surface-variant break-words">“{d.reason}”</span>}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

const ACTION_LABELS: Record<string, string> = {
  "booking.confirmed": "Confirmed by admin",
  "booking.declined": "Declined by admin",
  "booking.completed": "Marked completed by admin",
  "booking.cancelled": "Cancelled by admin",
  "user.wagpoints_credit": "WagPoints credit issued",
};

function safeJson(s: string | null): Record<string, unknown> | null {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="font-label-md text-label-md uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="font-body-md text-body-md text-on-surface break-words">{children}</dd>
    </div>
  );
}
