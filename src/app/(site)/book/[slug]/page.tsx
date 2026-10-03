import type { Metadata } from "next";
import { PET_KIND_META, petBlockReason, petKindLabel, petKindOf } from "@/lib/pets";
import { getFees, getPlatformSettings } from "@/lib/settings";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOwnerPets, getSitterBySlug } from "@/lib/queries";
import { loadSnapshot } from "@/lib/availability";
import {
  DEFAULT_WEEKS,
  MAX_WEEKS,
  MIN_WEEKS,
  WEEKDAY_LABELS,
  addDays,
  canRecur,
  checkSeries,
  daysBetween,
  dropOffSlots,
  formatDay,
  formatDayLong,
  formatMinute,
  formatMinuteRange,
  isIsoDay,
  isStayService,
  minuteToHHMM,
  nextBookableDay,
  parseSlot,
  quantityLabel,
  todayIn,
  visitMinutes,
  visitSlots,
  weekdayOf,
} from "@/lib/availability-core";
import { formatLongDate } from "@/lib/booking-time";
import { CheckoutForm } from "./_components/CheckoutForm";
import { durationLabel, serviceLine } from "./_lib";

export const metadata: Metadata = { title: "Booking & Care Instructions" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const flag = (v: string | string[] | undefined) => ["1", "true", "on", "yes"].includes(one(v) ?? "");

export default async function BookPage({ params, searchParams }: PageProps<"/book/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v !== undefined) qs.set(k, one(v)!);
    const current = `/book/${slug}${qs.size ? `?${qs}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(current)}`);
  }

  const sitter = await getSitterBySlug(slug);
  const fees = await getFees();
  if (!sitter || sitter.status !== "ACTIVE" || sitter.services.length === 0) notFound();
  const pets = await getOwnerPets(user.id);

  const service = sitter.services.find((s) => s.id === one(sp.service)) ?? sitter.services.find((s) => s.type === "DOG_WALKING") ?? sitter.services[0];
  const acceptance = {
    ...sitter,
    firstName: sitter.displayName.includes("&") ? sitter.displayName : sitter.displayName.split(" ")[0],
    kinds: sitter.species.map((s) => s.kind),
  };
  const blockedFor = (p: (typeof pets)[number]) => petBlockReason(acceptance, p, service.type);
  const petId = pets.find((p) => p.id === one(sp.pet))?.id ?? (pets.find((p) => !blockedFor(p)) ?? pets[0])?.id ?? "";
  // Schedule from the profile widget (?date, ?end, ?slot=HH:MM, ?recurring=1&weeks=N). Missing or stale
  // values fall back to the sitter's next bookable day; the availability check below reports conflicts.
  const tz = sitter.city.timeZone;
  const nowMs = new Date().getTime();
  const today = todayIn(tz, nowMs);
  const stay = isStayService(service.type);
  const horizon = await loadSnapshot(sitter.id, today, addDays(today, 180));
  const snap = horizon!;
  const rawDate = one(sp.date);
  const date =
    isIsoDay(rawDate) && rawDate >= today ? rawDate : (nextBookableDay(snap, addDays(today, 1), service.type, service.durationMins, nowMs, 120) ?? addDays(today, 1));
  const rawEnd = one(sp.end);
  const endDate = stay ? (isIsoDay(rawEnd) && rawEnd >= date ? rawEnd : service.type === "BOARDING" ? addDays(date, 1) : date) : null;
  const slots = stay ? dropOffSlots(snap, date, nowMs) : visitSlots(snap, date, visitMinutes(service.type, service.durationMins), nowMs);
  const minute = parseSlot(one(sp.slot)) ?? slots.find((s) => s.available)?.minute ?? 9 * 60;
  const recurring = flag(sp.recurring) && canRecur(service.type);
  const weeksRaw = Number(one(sp.weeks));
  const weeks = recurring ? (Number.isInteger(weeksRaw) && weeksRaw >= MIN_WEEKS && weeksRaw <= MAX_WEEKS ? weeksRaw : DEFAULT_WEEKS) : 1;
  const lastDate = addDays(endDate ?? date, 7 * (weeks - 1));
  const planSnap = lastDate > addDays(today, 180) ? ((await loadSnapshot(sitter.id, today, lastDate)) ?? snap) : snap;
  const rows = checkSeries(planSnap, { type: service.type, date, endDate, minute, durationMins: service.durationMins }, weeks, nowMs);
  const first = rows[0].check;
  const quantity = first.ok ? first.quantity : stay ? Math.max(1, daysBetween(date, endDate!) + (service.type === "DAY_CARE" ? 1 : 0)) : 1;
  const duration = durationLabel(service.durationMins);
  const visitLen = visitMinutes(service.type, service.durationMins);
  const timeLabel = stay
    ? service.type === "BOARDING"
      ? `Drop-off ${formatMinute(minute)} · Pick-up ${formatMinute(minute)}`
      : `Drop-off ${formatMinute(minute)} · ${quantityLabel(service.type, quantity)}`
    : `${formatMinuteRange(minute, minute + visitLen)}${duration ? ` (${duration})` : ""}`;
  const dateLabel = stay ? `${formatDayLong(date)} → ${formatDayLong(endDate!)}` : formatLongDate(date);

  // "Add a new pet" returns here (the pet form appends pet=<newId>).
  const backQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v !== undefined && k !== "pet") backQs.set(k, one(v)!);
  const addPetHref = `/account/pets/new?next=${encodeURIComponent(`/book/${slug}${backQs.size ? `?${backQs}` : ""}`)}`;

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="flex flex-col w-full">
        {/* Stepper Progress Header */}
        <div className="w-full bg-surface-container-low py-space-lg shadow-sm">
          <div className="max-w-[1240px] mx-auto px-margin-mobile md:px-margin">
            <div className="flex flex-col md:flex-row items-center justify-between gap-space-md">
              <div className="text-center md:text-left">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Secure Booking</span>
                <h1 className="font-headline-md text-headline-md text-on-surface">Booking &amp; Care Instructions</h1>
              </div>
              <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-space-sm rounded-full">
                <div className="flex items-center gap-space-xs text-primary">
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md">
                    <span className="material-symbols-outlined text-sm">done</span>
                  </div>
                  <span className="font-label-md text-label-md hidden sm:inline font-semibold">Date &amp; Time</span>
                </div>
                <div className="w-6 h-0.5 bg-primary/40 rounded-full" />
                <div className="flex items-center gap-space-xs text-secondary">
                  <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-md text-label-md font-bold">
                    2
                  </div>
                  <span className="font-label-md text-label-md font-bold">Pets &amp; Instructions</span>
                </div>
                <div className="w-6 h-0.5 bg-outline-variant/60 rounded-full" />
                <div className="flex items-center gap-space-xs text-on-surface-variant/70">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-md text-label-md">
                    3
                  </div>
                  <span className="font-label-md text-label-md hidden sm:inline">Payment</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <CheckoutForm
          sitter={{
            slug: sitter.slug,
            displayName: sitter.displayName,
            firstName: sitter.displayName.split(" ")[0],
            avatarUrl: sitter.avatarUrl,
            rating: sitter.rating,
            isSuperSitter: sitter.isSuperSitter,
            completedBookings: sitter.completedBookings,
          }}
          service={{
            id: service.id,
            type: service.type,
            unitPriceCents: service.priceCents,
            line: serviceLine(service),
          }}
          pets={pets.map((p) => ({
            id: p.id,
            name: p.name,
            species: p.species,
            // other pets: lead with what they are ("Rabbit · Holland Lop")
            breed: p.species === "OTHER" ? [petKindLabel(p), p.breed].filter(Boolean).join(" · ") : p.breed,
            ageYears: p.ageYears,
            sex: p.sex,
            neutered: p.neutered,
            rabiesVaccinated: p.rabiesVaccinated,
            microchip: p.microchip,
            photoUrl: p.photoUrl,
            traits: p.traits.map((t) => ({ id: t.id, label: t.label, tone: t.tone })),
            icon: PET_KIND_META[petKindOf(p)].icon,
            blocked: blockedFor(p),
          }))}
          initialPetId={petId}
          schedule={{
            date,
            endDate,
            slot: minuteToHHMM(minute),
            dateLabel,
            timeLabel,
            cancelLabel: `${formatDay(date)}, ${formatMinute(minute)}`,
            recurring,
            weeks,
            seriesLabel: recurring ? `Every ${WEEKDAY_LABELS[weekdayOf(date)]} · ${weeks} weeks (until ${formatDay(rows[rows.length - 1].req.date)})` : null,
            quantity,
            quantityLabel: quantityLabel(service.type, quantity),
            meet: flag(sp.meet),
            changeHref: `/sitters/${sitter.slug}#book`,
            conflicts: rows.filter((r) => !r.check.ok).map((r) => ({ date: formatDayLong(r.req.date), error: r.check.ok ? "" : r.check.error })),
            occurrenceCount: rows.length,
          }}
          owner={{
            fullName: `${user.firstName} ${user.lastName}`.toUpperCase(),
            wagPointsCents: user.wagPointsCents,
          }}
          taxRateBps={sitter.city.taxRateBps}
          fees={fees}
          earnRateBps={(await getPlatformSettings()).pointsEarnRateBps}
          addPetHref={addPetHref}
        />
      </div>
    </main>
  );
}
