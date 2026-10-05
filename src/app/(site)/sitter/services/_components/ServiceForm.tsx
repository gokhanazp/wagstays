"use client";

import { useState } from "react";
import { updateService } from "@/app/actions/sitter";
import { BTN, Card, Field, INPUT, TEXTAREA } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { UNIT_LABELS, type ServiceType } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { priceBooking, type Fees } from "@/lib/pricing";
import { ADDON_BOUNDS, SERVICE_DURATIONS, SERVICE_PRICE_BOUNDS, SERVICE_UNITS, dollarsToCents } from "@/lib/sitter";
import { quoteBooking } from "@/lib/quote";
import { Feedback } from "../../_components/Feedback";
import { useFormAction } from "../../_components/useFormAction";

type Props = {
  type: ServiceType;
  title: string;
  icon: string;
  service: {
    active: boolean;
    priceCents: number;
    durationMins: number | null;
    description: string;
    extraNote: string;
    exists: boolean;
    maxPetsPerBooking: number;
    additionalPetPriceCents: number | null;
    holidayPriceCents: number | null;
    puppyPriceCents: number | null;
  };
  fees: Fees;
  taxRateBps: number;
  taxLabel: string;
};

export function ServiceForm({ type, title, icon, service: s, fees, taxRateBps, taxLabel }: Props) {
  const { state, pending, onSubmit } = useFormAction(updateService);
  const [active, setActive] = useState(s.exists && s.active);
  const [price, setPrice] = useState((s.priceCents / 100).toString());
  const bounds = SERVICE_PRICE_BOUNDS[type];
  const durations = SERVICE_DURATIONS[type];
  const unit = UNIT_LABELS[SERVICE_UNITS[type]];
  const err = (k: string) => state?.fieldErrors?.[k];

  const cents = Math.round(Number(price) * 100);
  const valid = Number.isFinite(cents) && cents >= bounds.min && cents <= bounds.max;
  const quote = valid ? priceBooking({ unitPriceCents: cents, taxRateBps, fees }) : null;

  // Add-on rates
  const toDollars = (c: number | null) => (c == null ? "" : (c / 100).toString());
  const [multi, setMulti] = useState(s.additionalPetPriceCents != null);
  const [extra, setExtra] = useState(toDollars(s.additionalPetPriceCents ?? (s.exists ? null : Math.round(s.priceCents / 2 / 100) * 100)));
  const [maxPets, setMaxPets] = useState(String(Math.max(ADDON_BOUNDS.maxPets.min, Math.min(ADDON_BOUNDS.maxPets.max, s.maxPetsPerBooking))));
  const [holiday, setHoliday] = useState(toDollars(s.holidayPriceCents));
  const [puppy, setPuppy] = useState(toDollars(s.puppyPriceCents));
  const walk = type === "DOG_WALKING";
  const petWord = walk ? "dog" : "pet";
  const extraCents = dollarsToCents(extra);
  const holidayCents = dollarsToCents(holiday);
  const puppyCents = dollarsToCents(puppy);
  const okMoney = (c: number | null) => c === null || Number.isFinite(c);
  // "2 dogs on a holiday walk: $X" — what the sitter earns, from the same quote the booking uses.
  const preview =
    valid && okMoney(extraCents) && okMoney(holidayCents) && okMoney(puppyCents)
      ? quoteBooking({
          service: {
            type,
            priceCents: cents,
            additionalPetPriceCents: multi ? (extraCents ?? 0) : null,
            holidayPriceCents: holidayCents,
            puppyPriceCents: puppyCents,
          },
          pets: multi ? [{}, {}] : [{}],
          dates: ["2026-12-25"],
          holidays: { "2026-12-25": "Christmas Day" },
        })
      : null;
  const UNIT_NOUN: Record<string, string> = { DOG_WALKING: "walk", BOARDING: "night", DAY_CARE: "day at day care", DROP_IN: "visit" };
  const previewLabel = `${multi ? `2 ${petWord}s` : `1 ${petWord}`} on a ${holidayCents ? "holiday " : ""}${UNIT_NOUN[type] ?? unit}`;

  return (
    <Card className={`p-space-lg flex flex-col gap-space-md transition-opacity ${active ? "" : "opacity-90"}`}>
      <form className="flex flex-col gap-space-md" noValidate onSubmit={onSubmit}>
        <input name="type" type="hidden" value={type} />
        <div className="flex items-center gap-space-md">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary-fixed text-primary" : "bg-surface-container-high text-outline"}`}>
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          </span>
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="font-title-md text-title-md text-on-surface">{title}</h2>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {active ? "Offered — owners can book this" : s.exists ? "Not offered — hidden from your profile" : "Not set up yet"}
            </span>
          </div>
          <label className="flex items-center gap-space-sm cursor-pointer">
            <span className="sr-only">Offer {title}</span>
            <input checked={active} className="peer sr-only" name="active" onChange={(e) => setActive(e.target.checked)} type="checkbox" value="1" />
            <span className="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-container/20 transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
          </label>
        </div>

        <div className={`grid grid-cols-1 ${durations ? "sm:grid-cols-2" : ""} gap-space-md`}>
          <Field error={err("price")} hint={`Between ${formatMoney(bounds.min)} and ${formatMoney(bounds.max)} per ${unit}.`} label={`Price per ${unit} (CAD)`}>
            <div className="relative">
              <span className="absolute left-space-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">$</span>
              <input
                className={`${INPUT} pl-8`}
                inputMode="decimal"
                max={bounds.max / 100}
                min={bounds.min / 100}
                name="price"
                onChange={(e) => setPrice(e.target.value)}
                step="0.5"
                type="number"
                value={price}
              />
            </div>
          </Field>
          {durations && (
            <Field error={err("durationMins")} label="Visit length">
              <Select
                aria-label="Visit length"
                defaultValue={String(s.durationMins ?? (type === "DOG_WALKING" ? 60 : 30))}
                name="durationMins"
                options={durations.map((d) => ({ value: String(d), label: `${d} min` }))}
              />
            </Field>
          )}
        </div>

        <fieldset className="flex flex-col gap-space-md p-space-md rounded-2xl bg-surface-container-low">
          <legend className="sr-only">Add-on rates</legend>
          <div className="flex items-start justify-between gap-space-md">
            <span className="flex flex-col min-w-0">
              <span className="font-label-lg text-label-lg text-on-surface">I take more than one {petWord}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {multi ? `Owners can book several ${petWord}s together.` : `Owners book one ${petWord} at a time.`}
              </span>
            </span>
            <label className="flex items-center cursor-pointer shrink-0">
              <span className="sr-only">I take more than one {petWord}</span>
              <input checked={multi} className="peer sr-only" name="multiPets" onChange={(e) => setMulti(e.target.checked)} type="checkbox" value="1" />
              <span className="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-container/20 transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
            </label>
          </div>
          {multi && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <Field error={err("additionalPet")} hint={`Per extra ${petWord}, per ${unit}. $0 is fine.`} label={`Additional ${petWord} (CAD)`}>
                <div className="relative">
                  <span className="absolute left-space-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">$</span>
                  <input
                    className={`${INPUT} pl-8`}
                    inputMode="decimal"
                    max={ADDON_BOUNDS.additionalPet.max / 100}
                    min={0}
                    name="additionalPet"
                    onChange={(e) => setExtra(e.target.value)}
                    step="0.5"
                    type="number"
                    value={extra}
                  />
                </div>
              </Field>
              <Field error={err("maxPets")} label={walk ? "Max dogs per walk" : "Max pets per booking"}>
                <Select
                  aria-label={walk ? "Max dogs per walk" : "Max pets per booking"}
                  name="maxPets"
                  onChange={setMaxPets}
                  options={Array.from({ length: ADDON_BOUNDS.maxPets.max - ADDON_BOUNDS.maxPets.min + 1 }, (_, i) => {
                    const n = i + ADDON_BOUNDS.maxPets.min;
                    return { value: String(n), label: `${n} ${n === 1 ? petWord : `${petWord}s`}` };
                  })}
                  value={maxPets}
                />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <Field error={err("holiday")} hint={`Optional. Replaces your price on statutory holidays (at least ${valid ? formatMoney(cents) : "your price"}).`} label="Holiday rate (CAD)">
              <div className="relative">
                <span className="absolute left-space-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">$</span>
                <input
                  className={`${INPUT} pl-8`}
                  inputMode="decimal"
                  min={valid ? cents / 100 : bounds.min / 100}
                  name="holiday"
                  onChange={(e) => setHoliday(e.target.value)}
                  placeholder="No holiday rate"
                  step="0.5"
                  type="number"
                  value={holiday}
                />
              </div>
            </Field>
            <Field error={err("puppy")} hint={`Optional. Added per puppy under 1 year, per ${unit}.`} label="Puppy surcharge (CAD)">
              <div className="relative">
                <span className="absolute left-space-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">$</span>
                <input
                  className={`${INPUT} pl-8`}
                  inputMode="decimal"
                  max={ADDON_BOUNDS.puppy.max / 100}
                  min={ADDON_BOUNDS.puppy.min / 100}
                  name="puppy"
                  onChange={(e) => setPuppy(e.target.value)}
                  placeholder="No surcharge"
                  step="0.5"
                  type="number"
                  value={puppy}
                />
              </div>
            </Field>
          </div>
          {preview && (multi || holidayCents) && (
            <p className="flex items-center gap-space-xs font-label-md text-label-md text-primary" data-testid="addon-preview">
              <span className="material-symbols-outlined text-lg">calculate</span>
              {previewLabel}: {formatMoney(preview.subtotalCents)}
              <span className="font-body-sm text-body-sm text-on-surface-variant">(you earn)</span>
            </p>
          )}
        </fieldset>

        <Field error={err("description")} hint="What's included — shown on your profile." label="Description">
          <textarea className={`${TEXTAREA} min-h-[88px]`} defaultValue={s.description} maxLength={300} name="description" />
        </Field>
        <Field error={err("extraNote")} hint="A short highlight, e.g. “Max 3 Pets” or “Ideal for Cats”." label="Highlight">
          <input className={INPUT} defaultValue={s.extraNote} maxLength={40} name="extraNote" />
        </Field>

        <div className="grid grid-cols-2 gap-space-sm">
          <div className="flex flex-col gap-0.5 p-space-md rounded-2xl bg-[#EBF3EF]">
            <span className="font-label-md text-label-md text-on-surface-variant">You earn</span>
            <span className="font-title-md text-title-md text-primary">{quote ? formatMoney(quote.subtotalCents) : "—"}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">per {unit}</span>
          </div>
          <div className="flex flex-col gap-0.5 p-space-md rounded-2xl bg-surface-container-low">
            <span className="font-label-md text-label-md text-on-surface-variant">Owner pays</span>
            <span className="font-title-md text-title-md text-on-surface">{quote ? formatMoney(quote.totalCents, { exact: true }) : "—"}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              incl. WagShield {formatMoney(fees.wagShieldFeeCents)}, service fee {formatMoney(fees.serviceFeeCents)} &amp; {taxLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-space-sm">
          <button className={BTN.sage} disabled={pending} type="submit">
            {pending ? "Saving…" : "Save"}
          </button>
          <Feedback state={state} />
        </div>
      </form>
    </Card>
  );
}
