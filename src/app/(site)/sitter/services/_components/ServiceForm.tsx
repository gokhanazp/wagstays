"use client";

import { useState } from "react";
import { updateService } from "@/app/actions/sitter";
import { BTN, Card, Field, INPUT, TEXTAREA } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { UNIT_LABELS, type ServiceType } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { priceBooking, type Fees } from "@/lib/pricing";
import { SERVICE_DURATIONS, SERVICE_PRICE_BOUNDS, SERVICE_UNITS } from "@/lib/sitter";
import { Feedback } from "../../_components/Feedback";
import { useFormAction } from "../../_components/useFormAction";

type Props = {
  type: ServiceType;
  title: string;
  icon: string;
  service: { active: boolean; priceCents: number; durationMins: number | null; description: string; extraNote: string; exists: boolean };
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
