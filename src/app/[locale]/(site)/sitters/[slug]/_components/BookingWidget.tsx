"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/routing";
import { useMemo, useState } from "react";
import { DatePicker, DateRangePicker } from "@/components/forms/DatePicker";
import { Select } from "@/components/forms/Select";
import {
  DEFAULT_WEEKS,
  MAX_WEEKS,
  MIN_WEEKS,
  addDays,
  canRecur,
  checkSeries,
  dropOffSlots,
  formatDayLong,
  isDayBookable,
  isStayService,
  minuteToHHMM,
  nextBookableDay,
  quantityLabel,
  todayIn,
  visitMinutes,
  visitSlots,
  type AvailabilitySnapshot,
} from "@/lib/availability-core";
import type { ServiceType } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { priceBooking, type Fees } from "@/lib/pricing";
import { holidaysForDates } from "@/lib/holidays";
import { isPuppy, petCountBlockReason, petLimit, quoteBooking } from "@/lib/quote";
import { explainLine, feeExplanations, perBookingPhrase, priceLineLabel } from "@/lib/price-details";
import { InfoTip } from "@/components/pricing/InfoTip";
import { SERVICE_ICONS } from "../../_components/search-url";

export type WidgetService = {
  id: string;
  type: string;
  priceCents: number;
  unit: string;
  durationMins: number | null;
  maxPetsPerBooking: number;
  additionalPetPriceCents: number | null;
  holidayPriceCents: number | null;
  puppyPriceCents: number | null;
};
export type WidgetPet = {
  id: string;
  name: string;
  breed: string | null;
  ageYears: number | null;
  icon: string;
  photoUrl: string | null;
  isDog: boolean;
  /** why this sitter can't take the pet ("Sarah doesn't care for rabbits"), null when bookable */
  blocked: string | null;
};

type ProfileT = ReturnType<typeof useTranslations<"profile">>;
type CommonT = ReturnType<typeof useTranslations<"common">>;

const SERVICE_KEYS = ["DOG_WALKING", "BOARDING", "DAY_CARE", "DROP_IN"] as const;
const isServiceKey = (v: string): v is ServiceType => (SERVICE_KEYS as readonly string[]).includes(v);
const UNITS = ["WALK", "NIGHT", "DAY", "VISIT"] as const;
const isUnit = (u: string): u is (typeof UNITS)[number] => (UNITS as readonly string[]).includes(u);
/** "walk" / "night" / "day" / "visit" (fallback "visit"), in the current language */
const unitName = (unit: string, tc: CommonT) => tc(`enums.unit.${isUnit(unit) ? unit : "VISIT"}`);

function optionSuffix(s: WidgetService, t: ProfileT, tc: CommonT) {
  switch (s.type) {
    case "DOG_WALKING":
      return t("booking.option.minutes", { count: s.durationMins ?? 60 });
    case "BOARDING":
      return t("booking.option.perNight");
    case "DAY_CARE":
      return t("booking.option.fullDay");
    case "DROP_IN":
      return t("booking.option.minutes", { count: s.durationMins ?? 30 });
    default:
      return isUnit(s.unit) ? tc(`enums.unit.${s.unit}`) : undefined;
  }
}

const timeLabel = (type: string, t: ProfileT) => (isServiceKey(type) ? t(`booking.timeLabel.${type}`) : t("booking.time"));

/** Plain dates of each night / day / visit when the availability check couldn't produce them. */
function fallbackDays(type: string, date: string, endDate: string | null) {
  if (!isStayService(type) || !endDate) return [date];
  const out: string[] = [];
  const last = type === "BOARDING" ? addDays(endDate, -1) : endDate;
  for (let d = date; d <= last; d = addDays(d, 1)) out.push(d);
  return out.length ? out : [date];
}

function lineTitle(s: WidgetService, quantity: number, t: ProfileT, tc: CommonT, locale: string) {
  const mins = s.durationMins;
  switch (s.type) {
    case "DOG_WALKING":
      return mins && mins % 60 === 0 ? t("booking.walkHours", { count: mins / 60 }) : t("booking.walkMinutes", { count: mins ?? 60 });
    case "BOARDING":
    case "DAY_CARE":
      return `${quantityLabel(s.type, quantity, locale)} × ${formatMoney(s.priceCents, { locale })}`;
    case "DROP_IN":
      return t("booking.dropInMinutes", { count: mins ?? 30 });
    default:
      return isServiceKey(s.type) ? tc(`enums.service.${s.type}`) : s.type;
  }
}

const FIELD =
  "w-full h-11 pl-3 pr-9 rounded-xl bg-surface-container-low font-body-sm text-body-sm text-on-surface text-left focus:outline-none focus:bg-surface-container focus-visible:ring-[3px] focus-visible:ring-primary-container/15 cursor-pointer";

function petLabel(p: WidgetPet, t: ProfileT) {
  const breed = p.breed ? (p.breed.length > 10 ? p.breed.split(" ")[0] : p.breed) : null;
  const age = p.ageYears != null ? (p.ageYears < 1 ? t("booking.puppy") : t("booking.ageYears", { count: Math.floor(p.ageYears) })) : null;
  const meta = [breed, age].filter(Boolean).join(", ");
  return meta ? `${p.name} (${meta})` : p.name;
}

export function BookingWidget({
  slug,
  firstName,
  services,
  pets,
  taxRateBps,
  fees,
  taxLabel,
  minDate,
  askHref,
  availability,
  nowMs,
  readinessHint,
  provinceCode,
}: {
  slug: string;
  firstName: string;
  services: WidgetService[];
  /** null when logged out */
  pets: WidgetPet[] | null;
  taxRateBps: number;
  fees: Fees;
  taxLabel: string;
  /** @deprecated the first bookable day is picked from `availability` */
  defaultDate?: string;
  minDate: string;
  /** sitter's hours, time off and busy times (src/lib/availability.ts → publicSnapshot) */
  availability: AvailabilitySnapshot;
  /** server render time, so the first render matches on the client */
  nowMs: number;
  /** "Ask <name> a question" target (messaging); falls back to the Meet & Greet flow. */
  askHref?: string;
  /** small "before you book" note (e.g. missing phone number); the checkout shows the full checklist */
  readinessHint?: string | null;
  /** City.provinceCode — statutory holidays for the holiday rate */
  provinceCode: string;
}) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const locale = useLocale();
  const money = (cents: number, exact = false) => formatMoney(cents, { exact, locale });
  const router = useRouter();
  const snap = availability;
  const now = nowMs;
  const today = todayIn(snap.timeZone, now);
  const firstDay = (s: WidgetService | undefined) =>
    (s && nextBookableDay(snap, minDate > today ? minDate : today, s.type, s.durationMins, now, 120)) ?? addDays(today, 1);

  const [serviceId, setServiceId] = useState(() => (services.find((s) => s.type === "DOG_WALKING") ?? services[0])?.id ?? "");
  const [petIds, setPetIds] = useState<string[]>(() => [(pets?.find((p) => !p.blocked) ?? pets?.[0])?.id].filter((x): x is string => !!x));
  const [date, setDate] = useState(() => firstDay(services.find((s) => s.id === serviceId)));
  // stays start with a full default range (1 night / 1 day) so the next calendar click starts a new range
  const defaultEnd = (s: WidgetService | undefined, start: string) => (!s || !isStayService(s.type) ? "" : s.type === "BOARDING" ? addDays(start, 1) : start);
  const [endDate, setEndDate] = useState<string>(() => defaultEnd(services.find((s) => s.id === serviceId), date));
  const [minute, setMinute] = useState<number | null>(null);
  const [recurring, setRecurring] = useState(false);
  const [weeks, setWeeks] = useState(DEFAULT_WEEKS);
  const [pending, setPending] = useState<"book" | "meet" | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const type = service?.type ?? "DOG_WALKING";
  const stay = isStayService(type);
  const duration = visitMinutes(type, service?.durationMins);
  const repeat = recurring && canRecur(type);
  const limit = service ? petLimit(service) : 1;
  const petCount = Math.max(1, petIds.length);

  const slots = useMemo(
    () => (!date ? [] : stay ? dropOffSlots(snap, date, now, locale) : visitSlots(snap, date, duration, now, undefined, locale)),
    [snap, date, now, stay, duration, locale],
  );
  // keep the chosen time if it's still free, otherwise the first free one
  const chosen = slots.find((s) => s.minute === minute && s.available) ?? slots.find((s) => s.available);
  const nextFree = useMemo(
    () => (!stay && date && !chosen ? nextBookableDay(snap, addDays(date, 1), type, service?.durationMins, now) : null),
    [stay, date, chosen, snap, type, service?.durationMins, now],
  );

  const rows = useMemo(() => {
    if (!date || !chosen || (stay && !endDate)) return null;
    return checkSeries(
      snap,
      { type, date, endDate: stay ? endDate : null, minute: chosen.minute, durationMins: service?.durationMins, petCount },
      repeat ? weeks : 1,
      now,
      locale,
    );
  }, [snap, type, date, endDate, stay, chosen, service?.durationMins, repeat, weeks, now, petCount, locale]);
  const first = rows?.[0]?.check;
  const quantity = first?.ok ? first.quantity : stay ? 0 : 1;
  const conflicts = rows?.filter((r) => !r.check.ok) ?? [];
  // Pets this sitter can't take (kind / dog size / dog walking for non-dogs) can't be booked.
  const petReason = (p: WidgetPet) => p.blocked ?? (type === "DOG_WALKING" && !p.isDog ? t("booking.dogsOnly") : null);
  const selectedPets = useMemo(() => petIds.map((id) => pets?.find((p) => p.id === id)).filter((p): p is WidgetPet => !!p), [petIds, pets]);
  const petBlocked = selectedPets.some((p) => petReason(p));
  const countBlocked = service ? petCountBlockReason(service, selectedPets.length, firstName, locale) : null;
  const valid = !!rows && conflicts.length === 0 && !petBlocked && !countBlocked;
  // "Adding Biscuit: +$12 per walk" for every pet after the first, plus puppy surcharges.
  const per = service ? unitName(service.unit, tc) : tc("enums.unit.VISIT");
  const addNotes = service
    ? selectedPets.flatMap((p, i) => {
        const out: string[] = [];
        if (i > 0 && service.additionalPetPriceCents != null) {
          out.push(
            service.additionalPetPriceCents
              ? t("booking.addingPet", { name: p.name, amount: money(service.additionalPetPriceCents), unit: per })
              : t("booking.addingPetFree", { name: p.name }),
          );
        }
        if (service.puppyPriceCents && isPuppy(p)) out.push(t("booking.puppyExtra", { name: p.name, amount: money(service.puppyPriceCents), unit: per }));
        return out;
      })
    : [];
  const selectable = pets?.filter((p) => !petReason(p)).length ?? 0;
  const limitReached = limit > 1 && selectedPets.length >= limit && selectable > limit;
  const occurrences = repeat ? weeks : 1;

  // Same quote + fees as checkout and the server: one quote per weekly occurrence (holiday rates differ).
  const quotes = useMemo(() => {
    if (!service) return [];
    const occ = rows?.length ? rows : [{ req: { date, endDate: stay ? endDate : null }, check: { ok: false as const, error: "" } }];
    return occ.map((r) => {
      const dates = r.check.ok ? r.check.days : date ? fallbackDays(type, r.req.date, r.req.endDate ?? null) : [];
      return quoteBooking({
        service,
        pets: selectedPets.length ? selectedPets : [{}],
        dates: stay && !r.check.ok && !endDate ? [] : dates,
        holidays: holidaysForDates(dates, provinceCode),
        quantity: Math.max(quantity, 1),
      });
    });
  }, [service, rows, date, endDate, stay, type, selectedPets, provinceCode, quantity]);
  const prices = useMemo(() => quotes.map((q) => priceBooking({ subtotalCents: q.subtotalCents, taxRateBps, fees })), [quotes, taxRateBps, fees]);
  const quote = quotes[0];
  const price = prices[0] ?? null;
  const feeText = useMemo(() => feeExplanations(fees, taxRateBps, taxLabel, provinceCode, locale), [fees, taxRateBps, taxLabel, provinceCode, locale]);
  const seriesTotal = prices.reduce((sum, p) => sum + p.totalCents, 0);
  const loggedIn = pets !== null;
  const profilePath = `/sitters/${slug}`;
  const disabledDay = (iso: string) => !isDayBookable(snap, iso, type, service?.durationMins, now, petCount);
  const togglePet = (id: string) =>
    setPetIds((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : limit > 1 ? [...cur, id] : [id]));

  function changeService(id: string) {
    const next = services.find((s) => s.id === id);
    setServiceId(id);
    setMinute(null);
    // a cat can't go on a dog walk — move the selection to a pet this service can take
    const okFor = (p: WidgetPet) => !p.blocked && (next?.type !== "DOG_WALKING" || p.isDog);
    const nextLimit = next ? petLimit(next) : 1;
    const keep = petIds.filter((id) => pets?.some((p) => p.id === id && okFor(p))).slice(0, nextLimit);
    if (keep.length !== petIds.length) {
      const fallback = pets?.find(okFor)?.id ?? petIds[0];
      setPetIds(keep.length ? keep : fallback ? [fallback] : []);
    }
    const start = next && (!date || !isDayBookable(snap, date, next.type, next.durationMins, now)) ? firstDay(next) : date;
    setDate(start);
    setEndDate(defaultEnd(next, start));
  }

  function go(meet: boolean) {
    if (!service || !date || !chosen || !valid) return;
    const q = new URLSearchParams({ service: service.id });
    if (petIds.length) q.set("pets", petIds.join(","));
    q.set("date", date);
    if (stay && endDate) q.set("end", endDate);
    q.set("slot", minuteToHHMM(chosen.minute));
    if (repeat) {
      q.set("recurring", "1");
      q.set("weeks", String(weeks));
    }
    if (meet) q.set("meet", "1");
    const url = `/book/${slug}?${q.toString()}`;
    setPending(meet ? "meet" : "book");
    router.push(loggedIn ? url : `/login?next=${encodeURIComponent(url)}`);
  }

  if (!service || !price || !quote) {
    return (
      <div className="bg-surface-container-lowest p-space-xl rounded-3xl shadow-xl flex flex-col gap-space-md" id="booking-card">
        <h3 className="font-headline-sm text-headline-sm text-on-surface">{t("booking.title", { name: firstName })}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{t("booking.unavailable", { name: firstName })}</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-3xl shadow-xl flex flex-col gap-space-lg relative overflow-hidden" id="booking-card">
        <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
          <div>
            <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider block">{t("booking.fastSecure")}</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{t("booking.title", { name: firstName })}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined">calendar_month</span>
          </div>
        </div>
        <form
          className="flex flex-col gap-space-md"
          onSubmit={(e) => {
            e.preventDefault();
            go(false);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" htmlFor="service-select">
              <span>{t("booking.serviceType")}</span>
              <span className="text-primary font-bold">
                {t("booking.pricePer", { amount: money(service.priceCents), unit: isUnit(service.unit) ? tc(`enums.unit.${service.unit}`) : service.unit.toLowerCase() })}
              </span>
            </label>
            <Select
              className="w-full h-12 pl-4 pr-10 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface text-left focus:outline-none focus:bg-surface-container focus-visible:ring-[3px] focus-visible:ring-primary-container/15 transition-all cursor-pointer"
              id="service-select"
              onChange={changeService}
              options={services.map((s) => ({
                value: s.id,
                label: `${isServiceKey(s.type) ? tc(`enums.service.${s.type}`) : s.type} (${optionSuffix(s, t, tc)}) - ${money(s.priceCents)}`,
                icon: SERVICE_ICONS[s.type as ServiceType],
              }))}
              value={service.id}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between gap-2">
              <span>{limit > 1 ? t("booking.yourPets") : t("booking.yourPet")}</span>
              {limit > 1 && loggedIn && pets.length > 1 && (
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  {t("booking.selectedOf", { count: selectedPets.length, limit })}
                </span>
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {loggedIn && pets.length > 0 ? (
                pets.map((p) => {
                  const active = petIds.includes(p.id);
                  const reason = petReason(p);
                  const full = limit > 1 && !active && selectedPets.length >= limit;
                  return (
                    <button
                      aria-describedby={reason ? `pet-reason-${p.id}` : undefined}
                      aria-pressed={active}
                      className={`grow basis-40 min-w-0 py-1.5 pl-1.5 pr-3 rounded-xl font-label-md text-label-md flex items-center justify-between gap-1 transition-colors ${
                        reason
                          ? "bg-surface-container-low text-outline line-through decoration-outline/60 cursor-not-allowed"
                          : active
                            ? "bg-primary-container text-on-primary-container shadow-sm"
                            : full
                              ? "bg-surface-container-low text-outline cursor-not-allowed"
                              : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                      }`}
                      data-pet-chip={p.id}
                      disabled={!!reason || full}
                      key={p.id}
                      onClick={() => togglePet(p.id)}
                      title={reason ?? (full ? t("booking.limitTitle", { limit }) : undefined)}
                      type="button"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="w-7 h-7 rounded-full overflow-hidden bg-surface-container-lowest/70 flex items-center justify-center shrink-0">
                          {p.photoUrl && !reason ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt="" className="w-full h-full object-cover" src={p.photoUrl} />
                          ) : (
                            <span className="material-symbols-outlined text-base">{reason ? "block" : p.icon}</span>
                          )}
                        </span>
                        <span className="truncate">{petLabel(p, t)}</span>
                      </span>
                      {active && !reason && <span className="material-symbols-outlined text-base">check_circle</span>}
                    </button>
                  );
                })
              ) : (
                <Link
                  className="flex-1 py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md flex items-center justify-between transition-colors"
                  href={loggedIn ? `/account/pets/new?next=${encodeURIComponent(profilePath)}` : `/login?next=${encodeURIComponent(profilePath)}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">pets</span>
                    {t("booking.addPet")}
                  </span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              )}
              <Link
                aria-label={t("booking.addNewPet")}
                className="p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md flex items-center justify-center transition-colors"
                href={loggedIn ? `/account/pets/new?next=${encodeURIComponent(profilePath)}` : `/login?next=${encodeURIComponent(profilePath)}`}
                title={t("booking.addNewPet")}
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </Link>
            </div>
            {loggedIn && (addNotes.length > 0 || limitReached) && (
              <ul aria-live="polite" className="flex flex-col gap-0.5" data-testid="pet-add-notes">
                {addNotes.map((n) => (
                  <li className="flex items-start gap-1 font-label-sm text-label-sm text-on-surface-variant" key={n}>
                    <span className="material-symbols-outlined text-sm text-primary">add_circle</span>
                    <span>{n}</span>
                  </li>
                ))}
                {limitReached && (
                  <li className="flex items-start gap-1 font-label-sm text-label-sm text-on-surface-variant" data-testid="pet-limit-note">
                    <span className="material-symbols-outlined text-sm text-secondary">info</span>
                    <span>
                      {t("booking.takesUpTo", { name: firstName, limit, phrase: perBookingPhrase(type, limit, locale) })}
                    </span>
                  </li>
                )}
              </ul>
            )}
            {loggedIn && service && limit === 1 && pets.filter((p) => !petReason(p)).length > 1 && (
              <p className="flex items-start gap-1 font-label-sm text-label-sm text-on-surface-variant" data-testid="one-pet-note">
                <span className="material-symbols-outlined text-sm text-secondary">info</span>
                <span>{petCountBlockReason(service, 2, firstName, locale)}.</span>
              </p>
            )}
            {pets?.some((p) => petReason(p)) && (
              <ul className="flex flex-col gap-0.5">
                {pets
                  .filter((p) => petReason(p))
                  .map((p) => (
                    <li className="flex items-start gap-1 font-label-sm text-label-sm text-on-surface-variant" id={`pet-reason-${p.id}`} key={p.id}>
                      <span className="material-symbols-outlined text-sm text-secondary">info</span>
                      <span>
                        {p.name}: {petReason(p)}.
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {stay ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-medium" htmlFor="booking-range">
                  {type === "BOARDING" ? t("booking.rangeBoarding") : t("booking.rangeDays")}
                </label>
                <DateRangePicker
                  className={FIELD}
                  end={endDate}
                  id="booking-range"
                  inclusive={type === "DAY_CARE"}
                  isDateDisabled={disabledDay}
                  min={today}
                  onChange={(s, e) => {
                    setDate(s);
                    setEndDate(e ?? "");
                  }}
                  placeholder={type === "BOARDING" ? t("booking.placeholderBoarding") : t("booking.placeholderDays")}
                  start={date}
                  unitLabel={type === "BOARDING" ? "night" : "day"}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant font-medium" htmlFor="booking-slot">
                  {timeLabel(type, t)}
                </label>
                <Select
                  className={FIELD}
                  disabled={!slots.length}
                  id="booking-slot"
                  onChange={(v) => setMinute(Number(v))}
                  options={slots.map((sl) => ({ value: String(sl.minute), label: sl.label, disabled: !sl.available, hint: sl.reason === "notice" ? t("booking.tooSoon") : undefined }))}
                  placeholder={date ? t("booking.closedThatDay") : t("booking.pickDatesFirst")}
                  value={chosen ? String(chosen.minute) : ""}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant font-medium" htmlFor="booking-date">
                    {t("booking.date")}
                  </label>
                  <DatePicker
                    className={FIELD}
                    format={{ weekday: "short", month: "short", day: "numeric" }}
                    id="booking-date"
                    isDateDisabled={disabledDay}
                    min={today}
                    onChange={setDate}
                    value={date}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-label-sm text-on-surface-variant font-medium" htmlFor="booking-slot">
                    {timeLabel(type, t)}
                  </label>
                  <Select
                    align="end"
                    className={FIELD}
                    disabled={!slots.some((sl) => sl.available)}
                    id="booking-slot"
                    onChange={(v) => setMinute(Number(v))}
                    options={slots.map((sl) => ({
                      value: String(sl.minute),
                      label: sl.label,
                      disabled: !sl.available,
                      hint: sl.reason === "booked" ? t("booking.booked") : sl.reason === "notice" ? t("booking.tooSoon") : undefined,
                    }))}
                    panelMinWidth={220}
                    placeholder={t("booking.fullyBooked")}
                    value={chosen ? String(chosen.minute) : ""}
                  />
                </div>
              </div>
              {date && !chosen && (
                <p className="flex flex-wrap items-center gap-x-1 font-label-sm text-label-sm text-on-surface-variant" role="status">
                  <span className="material-symbols-outlined text-base text-secondary">event_busy</span>
                  {slots.length ? t("booking.fullOn", { date: formatDayLong(date, locale) }) : t("booking.notAvailableOn", { date: formatDayLong(date, locale) })}
                  {nextFree && (
                    <button className="text-primary font-bold hover:underline" onClick={() => setDate(nextFree)} type="button">
                      {t("booking.nextAvailable", { date: formatDayLong(nextFree, locale) })}
                    </button>
                  )}
                </p>
              )}
            </div>
          )}

          {canRecur(type) && (
            <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-surface-container-low">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">repeat</span>
                  <label className="font-label-sm text-label-sm text-on-surface cursor-pointer" htmlFor="booking-recurring">
                    {t("booking.recurring")}
                  </label>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input checked={recurring} className="sr-only peer" id="booking-recurring" onChange={(e) => setRecurring(e.target.checked)} type="checkbox" />
                  <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                </label>
              </div>
              {recurring && (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{t("booking.repeatFor")}</span>
                  <Select
                    aria-label={t("booking.weeksAria")}
                    className="w-36 h-9 pl-3 pr-9 rounded-lg bg-surface-container-lowest font-body-sm text-body-sm text-on-surface text-left focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-container/15 cursor-pointer"
                    onChange={(v) => setWeeks(Number(v))}
                    options={Array.from({ length: MAX_WEEKS - MIN_WEEKS + 1 }, (_, i) => ({ value: String(i + MIN_WEEKS), label: t("booking.weeks", { count: i + MIN_WEEKS }) }))}
                    panelMinWidth={150}
                    value={String(weeks)}
                  />
                </div>
              )}
            </div>
          )}

          {countBlocked && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-error-container/60 text-on-error-container font-label-sm text-label-sm" role="alert">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{countBlocked}.</span>
            </div>
          )}
          {rows && conflicts.length > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-error-container/60 text-on-error-container font-label-sm text-label-sm" role="alert">
              <span className="material-symbols-outlined text-base">error</span>
              {rows.length === 1 ? (
                <span>{conflicts[0].check.ok ? "" : conflicts[0].check.error}</span>
              ) : (
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-bold">
                    {t("booking.conflicts", { count: conflicts.length, total: rows.length })}
                  </span>
                  {conflicts.slice(0, 4).map((c) => (
                    <span key={c.req.date}>{formatDayLong(c.req.date, locale)}</span>
                  ))}
                  {conflicts.length > 4 && <span>{t("booking.andMore", { count: conflicts.length - 4 })}</span>}
                </div>
              )}
            </div>
          )}
          {stay && date && !endDate && (
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {type === "BOARDING" ? t("booking.pickCheckout") : t("booking.pickLastDay")}
            </p>
          )}

          <div className="bg-surface-container p-space-md rounded-2xl flex flex-col gap-space-xs mt-1">
            {quote.lines.map((l, i) => {
              const ex = explainLine(l, i, { firstName, service, provinceCode, units: quote.units }, locale);
              return (
                <div className="flex items-start justify-between gap-2 font-body-sm text-body-sm text-on-surface-variant" data-price-line key={`${l.label}-${i}`}>
                  <span className="min-w-0">
                    {i === 0 && !stay ? lineTitle(service, quantity || 1, t, tc, locale) : priceLineLabel(l, i, locale)} <InfoTip body={ex.body} title={ex.title} />
                  </span>
                  <span className="font-semibold text-on-surface whitespace-nowrap">{money(l.amountCents)}</span>
                </div>
              );
            })}
            <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                {t("booking.vetCover")}
                <InfoTip body={feeText.wagShield.body} title={feeText.wagShield.title} />
              </span>
              <span className="font-semibold text-on-surface">{money(price.protectionFeeCents)}</span>
            </div>
            <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                {t("booking.serviceFee")}
                <InfoTip body={feeText.serviceFee.body} title={feeText.serviceFee.title} />
              </span>
              <span className="font-semibold text-on-surface">{money(price.serviceFeeCents)}</span>
            </div>
            <div className="flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                {t("booking.taxRate", { tax: taxLabel, rate: (taxRateBps / 100).toLocaleString(intlLocale(locale), { maximumFractionDigits: 3 }) })}
                <InfoTip body={feeText.tax.body} title={feeText.tax.title} />
              </span>
              <span className="font-semibold text-on-surface">{money(price.taxCents, true)}</span>
            </div>
            <div className="pt-2 mt-1 border-t border-outline-variant/40 flex items-baseline justify-between">
              <div>
                <span className="font-title-md text-title-md text-on-surface font-bold">{t("booking.total")}</span>
                <span className="block text-[11px] text-on-surface-variant">
                  {repeat
                    ? stay
                      ? t("booking.perWeek", { tax: taxLabel })
                      : t("booking.perVisit", { tax: taxLabel })
                    : t("booking.includes", { tax: taxLabel })}
                </span>
              </div>
              <span className="font-headline-md text-headline-md text-secondary font-extrabold" data-testid="widget-total">
                {money(price.totalCents, true)}
              </span>
            </div>
            {repeat && (
              <div className="flex items-baseline justify-between font-body-sm text-body-sm text-on-surface-variant">
                <span>
                  {prices.every((p) => p.totalCents === price.totalCents)
                    ? t(stay ? "booking.seriesStayTimes" : "booking.seriesVisitsTimes", { count: occurrences, amount: money(price.totalCents, true) })
                    : t(stay ? "booking.seriesStay" : "booking.seriesVisits", { count: occurrences })}
                </span>
                <span className="font-title-md text-title-md text-on-surface font-bold">
                  {money(prices.length === occurrences ? seriesTotal : price.totalCents * occurrences, true)}
                </span>
              </div>
            )}
            <Link className="self-start inline-flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold hover:underline" data-testid="widget-pricing-link" href="/pricing">
              <span className="material-symbols-outlined text-sm">help</span>
              {t("services.howPricing")}
            </Link>
          </div>

          {readinessHint && (
            <p className="flex items-start gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-base text-tertiary">info</span>
              {readinessHint}
            </p>
          )}
          <button
            className="w-full h-14 rounded-full bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container font-label-lg text-label-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 transform active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={pending !== null || !valid}
            type="submit"
          >
            <span className={`material-symbols-outlined text-xl ${pending === "book" ? "animate-spin" : ""}`}>{pending === "book" ? "autorenew" : "pets"}</span>
            <span>{pending === "book" ? t("booking.opening") : t("booking.send")}</span>
          </button>
          <button
            className="w-full h-11 rounded-full bg-surface-container-high hover:bg-surface-dim text-primary font-label-md text-label-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={pending !== null || !valid}
            onClick={() => go(true)}
            type="button"
          >
            <span className={`material-symbols-outlined text-lg ${pending === "meet" ? "animate-spin" : ""}`}>{pending === "meet" ? "autorenew" : "handshake"}</span>
            <span>{t("booking.meetGreet")}</span>
          </button>
          <div className="flex items-start gap-2 pt-1 text-center justify-center">
            <span className="material-symbols-outlined text-primary text-base">lock</span>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {t.rich("booking.notCharged", { b: (c) => <strong>{c}</strong> })}
            </p>
          </div>
        </form>
        <div className="p-3 rounded-2xl bg-primary-fixed/30 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">shield</span>
          <div className="text-left font-label-sm text-label-sm">
            <span className="font-bold text-on-primary-fixed block">{t("booking.guaranteeTitle")}</span>
            <span className="text-on-primary-fixed-variant">{t("booking.guaranteeText")}</span>
          </div>
        </div>
      </div>
      <div className="mt-space-md p-space-md rounded-2xl bg-surface-container flex items-center justify-between gap-2 transition-shadow" id="ask-question">
        <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
          <span className="material-symbols-outlined text-lg text-primary">support_agent</span>
          <span>{t("booking.question")}</span>
        </div>
        {askHref ? (
          <Link className="font-label-sm text-label-sm text-primary font-bold hover:underline text-right" href={askHref}>
            {t("booking.ask", { name: firstName })}
          </Link>
        ) : (
          <button className="font-label-sm text-label-sm text-primary font-bold hover:underline text-right" onClick={() => go(true)} type="button">
            {t("booking.ask", { name: firstName })}
          </button>
        )}
      </div>
    </>
  );
}
