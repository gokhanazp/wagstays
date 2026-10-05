import { getLocale, getTranslations } from "next-intl/server";
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
  addDays,
  canRecur,
  checkSeries,
  daysBetween,
  dropOffSlots,
  formatDay,
  formatDayLong,
  formatMinute,
  formatMinuteRange,
  eachDate,
  isIsoDay,
  isStayService,
  minuteToHHMM,
  nextBookableDay,
  parseSlot,
  quantityLabel,
  todayIn,
  visitMinutes,
  visitSlots,
  weekdayLabel,
  weekdayOf,
} from "@/lib/availability-core";
import { formatLongDate } from "@/lib/booking-time";
import { CheckoutForm } from "./_components/CheckoutForm";
import { ReadinessChecklist } from "./_components/ReadinessChecklist";
import { getOwnerReadiness } from "@/lib/owner-readiness";
import { durationLabel, petCountNote, serviceLine } from "./_lib";
import { petLimit } from "@/lib/quote";
import { localizedPath } from "@/i18n/server";

export async function generateMetadata() {
  const t = await getTranslations("booking.checkout");
  return { title: t("metaTitle") };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const flag = (v: string | string[] | undefined) => ["1", "true", "on", "yes"].includes(one(v) ?? "");

export default async function BookPage({ params, searchParams }: PageProps<"/[locale]/book/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v !== undefined) qs.set(k, one(v)!);
    const current = `/book/${slug}${qs.size ? `?${qs}` : ""}`;
    redirect(await localizedPath(`/login?next=${encodeURIComponent(current)}`));
  }

  const locale = await getLocale();
  const t = await getTranslations("booking.checkout");
  const sitter = await getSitterBySlug(slug);
  const fees = await getFees();
  if (!sitter || sitter.status !== "ACTIVE" || sitter.services.length === 0) notFound();
  const [pets, readiness] = await Promise.all([getOwnerPets(user.id), getOwnerReadiness(user.id, locale)]);

  const service = sitter.services.find((s) => s.id === one(sp.service)) ?? sitter.services.find((s) => s.type === "DOG_WALKING") ?? sitter.services[0];
  const acceptance = {
    ...sitter,
    firstName: sitter.displayName.includes("&") ? sitter.displayName : sitter.displayName.split(" ")[0],
    kinds: sitter.species.map((s) => s.kind),
  };
  const blockedFor = (p: (typeof pets)[number]) => petBlockReason(acceptance, p, service.type, locale);
  // Pets from the widget (?pets=id,id) plus a pet just added from here (?pet=id, also the legacy single param).
  const limit = petLimit(service);
  const wanted = [...(one(sp.pets) ?? "").split(","), one(sp.pet) ?? ""].map((x) => x.trim()).filter((id) => pets.some((p) => p.id === id));
  const unique = [...new Set(wanted)];
  const picked = limit === 1 ? (one(sp.pet) && unique.includes(one(sp.pet)!) ? [one(sp.pet)!] : unique.slice(0, 1)) : unique.slice(0, limit);
  const petIds = picked.length ? picked : [(pets.find((p) => !blockedFor(p)) ?? pets[0])?.id].filter((x): x is string => !!x);
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
  const slots = stay ? dropOffSlots(snap, date, nowMs, locale) : visitSlots(snap, date, visitMinutes(service.type, service.durationMins), nowMs, null, locale);
  const minute = parseSlot(one(sp.slot)) ?? slots.find((s) => s.available)?.minute ?? 9 * 60;
  const recurring = flag(sp.recurring) && canRecur(service.type);
  const weeksRaw = Number(one(sp.weeks));
  const weeks = recurring ? (Number.isInteger(weeksRaw) && weeksRaw >= MIN_WEEKS && weeksRaw <= MAX_WEEKS ? weeksRaw : DEFAULT_WEEKS) : 1;
  const lastDate = addDays(endDate ?? date, 7 * (weeks - 1));
  const planSnap = lastDate > addDays(today, 180) ? ((await loadSnapshot(sitter.id, today, lastDate)) ?? snap) : snap;
  const plan = { type: service.type, date, endDate, minute, durationMins: service.durationMins };
  const rows = checkSeries(planSnap, { ...plan, petCount: petIds.length || 1 }, weeks, nowMs, locale);
  // Conflicts for every pet count the owner can pick here (stays need one free place per pet).
  const conflictsByCount = Object.fromEntries(
    Array.from({ length: limit }, (_, i) => i + 1).map((n) => [
      n,
      (n === (petIds.length || 1) ? rows : checkSeries(planSnap, { ...plan, petCount: n }, weeks, nowMs, locale))
        .filter((r) => !r.check.ok)
        .map((r) => ({ date: formatDayLong(r.req.date, locale), error: r.check.ok ? "" : r.check.error })),
    ]),
  );
  // Local dates priced per occurrence (nights / days / visits) — holiday rates depend on them.
  const occurrenceDates = rows.map((r) =>
    r.check.ok
      ? r.check.days
      : !stay
        ? [r.req.date]
        : service.type === "BOARDING"
          ? eachDate(r.req.date, addDays(r.req.endDate!, -1))
          : eachDate(r.req.date, r.req.endDate!),
  );
  const first = rows[0].check;
  const quantity = first.ok ? first.quantity : stay ? Math.max(1, daysBetween(date, endDate!) + (service.type === "DAY_CARE" ? 1 : 0)) : 1;
  const duration = durationLabel(service.durationMins, locale);
  const visitLen = visitMinutes(service.type, service.durationMins);
  const range = formatMinuteRange(minute, minute + visitLen, locale);
  const timeLabel = stay
    ? service.type === "BOARDING"
      ? t("schedule.dropOffPickUp", { time: formatMinute(minute, locale) })
      : t("schedule.dropOffQty", { time: formatMinute(minute, locale), qty: quantityLabel(service.type, quantity, locale) })
    : duration
      ? t("schedule.visitDuration", { range, duration })
      : range;
  const dateLabel = stay ? t("schedule.dateRange", { from: formatDayLong(date, locale), to: formatDayLong(endDate!, locale) }) : formatLongDate(date, locale);

  // "Add a new pet" returns here (the pet form appends pet=<newId>).
  const backQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v !== undefined && k !== "pet" && k !== "pets") backQs.set(k, one(v)!);
  if (petIds.length) backQs.set("pets", petIds.join(","));
  const addPetHref = `/account/pets/new?next=${encodeURIComponent(`/book/${slug}${backQs.size ? `?${backQs}` : ""}`)}`;

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="flex flex-col w-full">
        {/* Stepper Progress Header */}
        <div className="w-full bg-surface-container-low py-space-lg shadow-sm">
          <div className="max-w-[1240px] mx-auto px-margin-mobile md:px-margin">
            <div className="flex flex-col md:flex-row items-center justify-between gap-space-md">
              <div className="text-center md:text-left">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">{t("header.secure")}</span>
                <h1 className="font-headline-md text-headline-md text-on-surface">{t("header.title")}</h1>
              </div>
              <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-space-sm rounded-full">
                <div className="flex items-center gap-space-xs text-primary">
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md">
                    <span className="material-symbols-outlined text-sm">done</span>
                  </div>
                  <span className="font-label-md text-label-md hidden sm:inline font-semibold">{t("header.stepDate")}</span>
                </div>
                <div className="w-6 h-0.5 bg-primary/40 rounded-full" />
                <div className="flex items-center gap-space-xs text-secondary">
                  <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-md text-label-md font-bold">
                    2
                  </div>
                  <span className="font-label-md text-label-md font-bold">{t("header.stepPets")}</span>
                </div>
                <div className="w-6 h-0.5 bg-outline-variant/60 rounded-full" />
                <div className="flex items-center gap-space-xs text-on-surface-variant/70">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-md text-label-md">
                    3
                  </div>
                  <span className="font-label-md text-label-md hidden sm:inline">{t("header.stepPayment")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {!readiness.ready && (
          <div className="w-full max-w-[1240px] mx-auto px-margin-mobile md:px-margin pt-space-lg md:pt-space-xl -mb-space-sm md:-mb-space-md">
            <ReadinessChecklist addPetHref={addPetHref} phone={readiness.phone} steps={readiness.steps} />
          </div>
        )}
        <CheckoutForm
          notReady={!readiness.ready}
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
            unit: service.unit,
            durationMins: service.durationMins,
            line: serviceLine(service, locale),
            maxPetsPerBooking: service.maxPetsPerBooking,
            additionalPetPriceCents: service.additionalPetPriceCents,
            holidayPriceCents: service.holidayPriceCents,
            puppyPriceCents: service.puppyPriceCents,
            petLimit: limit,
            oneNote: petCountNote(service, 2, acceptance.firstName, locale),
          }}
          provinceCode={sitter.city.provinceCode}
          pets={pets.map((p) => ({
            id: p.id,
            name: p.name,
            species: p.species,
            // other pets: lead with what they are ("Rabbit · Holland Lop")
            breed: p.species === "OTHER" ? [petKindLabel(p, locale), p.breed].filter(Boolean).join(" · ") : p.breed,
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
          initialPetIds={petIds}
          schedule={{
            date,
            endDate,
            slot: minuteToHHMM(minute),
            dateLabel,
            timeLabel,
            cancelLabel: t("schedule.cancelAt", { date: formatDay(date, locale), time: formatMinute(minute, locale) }),
            recurring,
            weeks,
            seriesLabel: recurring
              ? t("schedule.series", { weekday: weekdayLabel(weekdayOf(date), locale), weeks, date: formatDay(rows[rows.length - 1].req.date, locale) })
              : null,
            quantity,
            quantityLabel: quantityLabel(service.type, quantity, locale),
            meet: flag(sp.meet),
            changeHref: `/sitters/${sitter.slug}#book`,
            conflictsByCount,
            occurrenceDates,
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
