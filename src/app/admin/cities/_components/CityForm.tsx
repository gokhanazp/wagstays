"use client";

import { useActionState, useState } from "react";
import { saveCity } from "@/app/actions/admin-core";
import { CANADIAN_TIME_ZONES, kebab } from "@/lib/admin-core";
import { BTN, Field, INPUT } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { FormStatus } from "../../_components/FormStatus";
import { keepValuesOnSubmit } from "../../_components/form-utils";

/** Standard-time offsets shown under each zone in the picker. */
const TZ_HINTS: Record<(typeof CANADIAN_TIME_ZONES)[number]["value"], string> = {
  "America/St_Johns": "UTC−3:30 · Newfoundland",
  "America/Halifax": "UTC−4 · Atlantic",
  "America/Moncton": "UTC−4 · Atlantic",
  "America/Toronto": "UTC−5 · Eastern",
  "America/Winnipeg": "UTC−6 · Central",
  "America/Regina": "UTC−6 · Central, no DST",
  "America/Edmonton": "UTC−7 · Mountain",
  "America/Vancouver": "UTC−8 · Pacific",
  "America/Whitehorse": "UTC−7 · Mountain, no DST",
};

type CityValues = {
  id?: string;
  name: string;
  slug: string;
  province: string;
  provinceCode: string;
  taxRateBps: number;
  timeZone: string;
  lat: number | "";
  lng: number | "";
};

export function CityForm({ city }: { city?: CityValues }) {
  const [state, action, pending] = useActionState(saveCity, undefined);
  const [slug, setSlug] = useState(city?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!city);
  const [tax, setTax] = useState(city ? String(city.taxRateBps / 100) : "13");
  const fe = state?.fieldErrors ?? {};
  const taxNum = Number(tax);
  const storedBps = Number.isFinite(taxNum) ? Math.round(taxNum * 100) : null;

  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="flex flex-col gap-space-lg" noValidate>
      {city?.id && <input name="id" type="hidden" value={city.id} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <Field error={fe.name} label="City name">
          <input
            className={INPUT}
            defaultValue={city?.name}
            name="name"
            onChange={(e) => !slugTouched && setSlug(kebab(e.target.value))}
            placeholder="e.g. Halifax"
            required
          />
        </Field>
        <Field error={fe.slug} hint={city ? "Changing the slug changes public URLs for this city." : "Lowercase, hyphenated. Used in URLs."} label="URL slug">
          <input
            className={INPUT}
            name="slug"
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="halifax"
            required
            value={slug}
          />
        </Field>
        <Field error={fe.province} label="Province / territory">
          <input className={INPUT} defaultValue={city?.province} name="province" placeholder="Nova Scotia" required />
        </Field>
        <Field error={fe.provinceCode} label="Province code">
          <input className={`${INPUT} uppercase`} defaultValue={city?.provinceCode} maxLength={2} name="provinceCode" placeholder="NS" required />
        </Field>
        <Field
          error={fe.taxRatePct}
          hint={storedBps !== null ? `Stored as ${storedBps} basis points (${(storedBps / 100).toFixed(2)}%). Applied to subtotal + fees.` : undefined}
          label="Sales tax (HST / GST + PST) %"
        >
          <input className={INPUT} inputMode="decimal" name="taxRatePct" onChange={(e) => setTax(e.target.value)} required type="text" value={tax} />
        </Field>
        <Field error={fe.timeZone} hint="IANA zone used for booking dates and times in this city." label="Time zone">
          <Select
            aria-label="Time zone"
            defaultValue={city?.timeZone ?? "America/Toronto"}
            name="timeZone"
            options={CANADIAN_TIME_ZONES.map((t) => ({ value: t.value, label: t.label, hint: TZ_HINTS[t.value] }))}
          />
        </Field>
        <Field error={fe.lat} hint="City centre, decimal degrees." label="Latitude">
          <input className={INPUT} defaultValue={city?.lat} inputMode="decimal" name="lat" placeholder="44.6488" required type="text" />
        </Field>
        <Field error={fe.lng} hint="Negative for Canada (west of Greenwich)." label="Longitude">
          <input className={INPUT} defaultValue={city?.lng} inputMode="decimal" name="lng" placeholder="-63.5752" required type="text" />
        </Field>
      </div>
      <FormStatus state={state} />
      <div className="flex flex-wrap gap-space-sm">
        <button className={BTN.primary} disabled={pending} type="submit">
          <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "progress_activity" : "save"}</span>
          {pending ? "Saving…" : city?.id ? "Save changes" : "Create city"}
        </button>
      </div>
    </form>
  );
}
