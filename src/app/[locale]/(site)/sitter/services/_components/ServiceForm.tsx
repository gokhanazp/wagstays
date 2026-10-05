"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { updateService } from "@/app/actions/sitter";
import { BTN, Card, Field, INPUT, TEXTAREA } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import type { ServiceType } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { priceBooking, type Fees } from "@/lib/pricing";
import { ADDON_BOUNDS, SERVICE_DURATIONS, SERVICE_PRICE_BOUNDS, SERVICE_UNITS, dollarsToCents } from "@/lib/sitter";
import { quoteBooking } from "@/lib/quote";
import { PriceDetails } from "@/components/pricing/PriceDetails";
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
  /** City.provinceCode — statutory holidays in the preview */
  provinceCode: string;
};

export function ServiceForm({ type, title, icon, service: s, fees, taxRateBps, taxLabel, provinceCode }: Props) {
  const t = useTranslations("sitter.serviceForm");
  const tc = useTranslations("common");
  const ts = useTranslations("sitter");
  const locale = useLocale();
  const money = (c: number, exact = false) => formatMoney(c, { exact, locale });
  const { state, pending, onSubmit } = useFormAction(updateService);
  const [active, setActive] = useState(s.exists && s.active);
  const [price, setPrice] = useState((s.priceCents / 100).toString());
  const bounds = SERVICE_PRICE_BOUNDS[type];
  const durations = SERVICE_DURATIONS[type];
  const unit = tc(`enums.unit.${SERVICE_UNITS[type] as "WALK" | "NIGHT" | "DAY" | "VISIT"}`);
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
  const pk = walk ? "dog" : "pet";
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
  // Live "What pet parents will see" — the same list as the profile (src/components/pricing/PriceDetails.tsx).
  const shown = (c: number | null) => (c !== null && Number.isFinite(c) ? c : null);
  const maxN = Number(maxPets);
  const seen = {
    type,
    unit: SERVICE_UNITS[type],
    priceCents: valid ? cents : s.priceCents,
    durationMins: s.durationMins,
    maxPetsPerBooking: maxN,
    additionalPetPriceCents: multi ? (shown(extraCents) ?? 0) : null,
    holidayPriceCents: shown(holidayCents),
    puppyPriceCents: shown(puppyCents),
  };
  const previewLabel = t(`preview.${type}${holidayCents ? "_holiday" : ""}`, { pets: t(`${pk}.count`, { count: multi ? 2 : 1 }) });

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
              {active ? t("offered") : s.exists ? t("hidden") : t("notSetUp")}
            </span>
          </div>
          <label className="flex items-center gap-space-sm cursor-pointer">
            <span className="sr-only">{t("offer", { title })}</span>
            <input checked={active} className="peer sr-only" name="active" onChange={(e) => setActive(e.target.checked)} type="checkbox" value="1" />
            <span className="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-container/20 transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
          </label>
        </div>

        <div className={`grid grid-cols-1 ${durations ? "sm:grid-cols-2" : ""} gap-space-md`}>
          <Field error={err("price")} hint={t("priceHint", { min: money(bounds.min), max: money(bounds.max), unit })} label={t("priceLabel", { unit })}>
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
            <Field error={err("durationMins")} label={t("visitLength")}>
              <Select
                aria-label={t("visitLength")}
                defaultValue={String(s.durationMins ?? (type === "DOG_WALKING" ? 60 : 30))}
                name="durationMins"
                options={durations.map((d) => ({ value: String(d), label: ts("durationMins", { mins: d }) }))}
              />
            </Field>
          )}
        </div>

        <fieldset className="flex flex-col gap-space-md p-space-md rounded-2xl bg-surface-container-low">
          <legend className="sr-only">{t("addons")}</legend>
          <div className="flex items-start justify-between gap-space-md">
            <span className="flex flex-col min-w-0">
              <span className="font-label-lg text-label-lg text-on-surface">{t(`${pk}.multiTitle`)}</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {multi ? t(`${pk}.multiOn`) : t(`${pk}.multiOff`)}
              </span>
            </span>
            <label className="flex items-center cursor-pointer shrink-0">
              <span className="sr-only">{t(`${pk}.multiTitle`)}</span>
              <input checked={multi} className="peer sr-only" name="multiPets" onChange={(e) => setMulti(e.target.checked)} type="checkbox" value="1" />
              <span className="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-container/20 transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
            </label>
          </div>
          {multi && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <Field error={err("additionalPet")} hint={extraCents ? t(`${pk}.additionalHintPaid`, { unit, amount: money(extraCents) }) : t(`${pk}.additionalHintFree`, { unit })} label={t(`${pk}.additionalLabel`)}>
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
              <Field error={err("maxPets")} hint={t(`${pk}.maxHint`, { count: maxN })} label={walk ? t("maxDogs") : t("maxPets")}>
                <Select
                  aria-label={walk ? t("maxDogs") : t("maxPets")}
                  name="maxPets"
                  onChange={setMaxPets}
                  options={Array.from({ length: ADDON_BOUNDS.maxPets.max - ADDON_BOUNDS.maxPets.min + 1 }, (_, i) => {
                    const n = i + ADDON_BOUNDS.maxPets.min;
                    return { value: String(n), label: t(`${pk}.count`, { count: n }) };
                  })}
                  value={maxPets}
                />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <Field error={err("holiday")} hint={`${t("holidayHint", { price: valid ? money(cents) : t("yourPrice") })}${holidayCents && holidayCents > cents ? ` ${t("holidaySee", { amount: money(holidayCents), unit })}` : ""}`} label={t("holidayLabel")}>
              <div className="relative">
                <span className="absolute left-space-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">$</span>
                <input
                  className={`${INPUT} pl-8`}
                  inputMode="decimal"
                  min={valid ? cents / 100 : bounds.min / 100}
                  name="holiday"
                  onChange={(e) => setHoliday(e.target.value)}
                  placeholder={t("holidayPlaceholder")}
                  step="0.5"
                  type="number"
                  value={holiday}
                />
              </div>
            </Field>
            <Field error={err("puppy")} hint={`${t("puppyHint", { unit })}${puppyCents ? ` ${t("puppySee", { amount: money(puppyCents), unit })}` : ""}`} label={t("puppyLabel")}>
              <div className="relative">
                <span className="absolute left-space-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">$</span>
                <input
                  className={`${INPUT} pl-8`}
                  inputMode="decimal"
                  max={ADDON_BOUNDS.puppy.max / 100}
                  min={ADDON_BOUNDS.puppy.min / 100}
                  name="puppy"
                  onChange={(e) => setPuppy(e.target.value)}
                  placeholder={t("puppyPlaceholder")}
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
              {previewLabel}: {money(preview.subtotalCents)}
              <span className="font-body-sm text-body-sm text-on-surface-variant">{t("youEarnParen")}</span>
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-space-xs p-space-md rounded-2xl border border-dashed border-outline-variant" data-testid="owner-preview">
          <span className="flex items-center gap-1 font-label-md text-label-md text-on-surface">
            <span className="material-symbols-outlined text-lg text-primary">visibility</span>
            {t("ownerSees")}
          </span>
          <PriceDetails provinceCode={provinceCode} service={seen} />
        </div>

        <Field error={err("description")} hint={t("descriptionHint")} label={t("description")}>
          <textarea className={`${TEXTAREA} min-h-[88px]`} defaultValue={s.description} maxLength={300} name="description" />
        </Field>
        <Field error={err("extraNote")} hint={t("highlightHint")} label={t("highlight")}>
          <input className={INPUT} defaultValue={s.extraNote} maxLength={40} name="extraNote" />
        </Field>

        <div className="grid grid-cols-2 gap-space-sm">
          <div className="flex flex-col gap-0.5 p-space-md rounded-2xl bg-[#EBF3EF]">
            <span className="font-label-md text-label-md text-on-surface-variant">{t("youEarn")}</span>
            <span className="font-title-md text-title-md text-primary">{quote ? money(quote.subtotalCents) : "—"}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{t("perUnit", { unit })}</span>
          </div>
          <div className="flex flex-col gap-0.5 p-space-md rounded-2xl bg-surface-container-low">
            <span className="font-label-md text-label-md text-on-surface-variant">{t("ownerPays")}</span>
            <span className="font-title-md text-title-md text-on-surface">{quote ? money(quote.totalCents, true) : "—"}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {t("feesIncl", { wagShield: money(fees.wagShieldFeeCents), serviceFee: money(fees.serviceFeeCents), tax: taxLabel })}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-space-sm">
          <button className={BTN.sage} disabled={pending} type="submit">
            {pending ? tc("actions.saving") : tc("actions.save")}
          </button>
          <Feedback state={state} />
        </div>
      </form>
    </Card>
  );
}
