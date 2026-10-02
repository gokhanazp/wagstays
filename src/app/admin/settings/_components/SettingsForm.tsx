"use client";

import { useActionState, useState } from "react";
import { saveSettings } from "@/app/actions/admin-core";
import { priceBooking } from "@/lib/pricing";
import { formatMoney } from "@/lib/format";
import { BTN, Card, CardHeader, Field, INPUT } from "@/components/ui";
import { FormStatus } from "../../_components/FormStatus";
import { keepValuesOnSubmit } from "../../_components/form-utils";

type Settings = {
  wagShieldFeeCents: number;
  serviceFeeCents: number;
  wagPointsDiscountCents: number;
  vetCoverageCents: number;
  supportEmail: string;
  supportPhone: string;
};

const toDollars = (c: number) => (c / 100).toFixed(2);
const signed = (c: number) => (c < 0 ? `−${formatMoney(-c, { exact: true })}` : formatMoney(c, { exact: true }));
const toCents = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};

function MoneyInput({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <span className="relative">
      <span className="absolute left-space-md top-1/2 -translate-y-1/2 font-body-md text-body-md text-on-surface-variant">$</span>
      <input className={`${INPUT} pl-8`} inputMode="decimal" name={name} onChange={(e) => onChange(e.target.value)} pattern="\d+(\.\d{1,2})?" required type="text" value={value} />
    </span>
  );
}

export function SettingsForm({ settings, taxRateBps }: { settings: Settings; taxRateBps: number }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const [v, setV] = useState({
    wagShieldFee: toDollars(settings.wagShieldFeeCents),
    serviceFee: toDollars(settings.serviceFeeCents),
    wagPointsDiscount: toDollars(settings.wagPointsDiscountCents),
    vetCoverage: toDollars(settings.vetCoverageCents),
  });
  const set = (k: keyof typeof v) => (val: string) => setV((s) => ({ ...s, [k]: val }));
  const fe = state?.fieldErrors ?? {};

  const fees = {
    wagShieldFeeCents: toCents(v.wagShieldFee),
    serviceFeeCents: toCents(v.serviceFee),
    wagPointsDiscountCents: toCents(v.wagPointsDiscount),
    vetCoverageCents: toCents(v.vetCoverage),
  };
  const plain = priceBooking({ unitPriceCents: 3200, taxRateBps, fees });
  const withPoints = priceBooking({ unitPriceCents: 3200, taxRateBps, fees, applyWagPoints: true });
  const taxLabel = `HST (${(taxRateBps / 100).toFixed(taxRateBps % 100 ? 2 : 0)}%)`;

  const lines: [string, number, number][] = [
    ["Dog walk (1 × $32)", plain.subtotalCents, withPoints.subtotalCents],
    ["WagShield Protection", plain.protectionFeeCents, withPoints.protectionFeeCents],
    ["Service fee", plain.serviceFeeCents, withPoints.serviceFeeCents],
    ["WagPoints discount", -plain.discountCents, -withPoints.discountCents],
    [taxLabel, plain.taxCents, withPoints.taxCents],
  ];

  return (
    <form onSubmit={keepValuesOnSubmit(action)} className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-space-lg items-start" noValidate>
      <div className="flex flex-col gap-space-lg">
        <Card className="flex flex-col gap-space-md pb-space-lg">
          <CardHeader icon="payments" title="Fees & rewards" />
          <div className="px-space-lg grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Field error={fe.wagShieldFee} hint="Added to every booking (taxable)." label="WagShield Protection fee">
              <MoneyInput name="wagShieldFee" onChange={set("wagShieldFee")} value={v.wagShieldFee} />
            </Field>
            <Field error={fe.serviceFee} hint="Platform service fee per booking (taxable)." label="Service fee">
              <MoneyInput name="serviceFee" onChange={set("serviceFee")} value={v.serviceFee} />
            </Field>
            <Field error={fe.wagPointsDiscount} hint="Max WagPoints a pet parent can redeem per booking." label="WagPoints discount">
              <MoneyInput name="wagPointsDiscount" onChange={set("wagPointsDiscount")} value={v.wagPointsDiscount} />
            </Field>
            <Field error={fe.vetCoverage} hint="Shown to pet parents as WagShield vet coverage." label="Vet coverage">
              <MoneyInput name="vetCoverage" onChange={set("vetCoverage")} value={v.vetCoverage} />
            </Field>
          </div>
        </Card>
        <Card className="flex flex-col gap-space-md pb-space-lg">
          <CardHeader icon="support_agent" title="Support contact" />
          <div className="px-space-lg grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Field error={fe.supportEmail} label="Support email">
              <input className={INPUT} defaultValue={settings.supportEmail} name="supportEmail" required type="email" />
            </Field>
            <Field error={fe.supportPhone} label="Support phone">
              <input className={INPUT} defaultValue={settings.supportPhone} name="supportPhone" required type="tel" />
            </Field>
          </div>
        </Card>
        <FormStatus state={state} />
        <div>
          <button className={BTN.primary} disabled={pending} type="submit">
            <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "progress_activity" : "save"}</span>
            {pending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>

      <Card className="flex flex-col gap-space-md pb-space-lg xl:sticky xl:top-space-lg">
        <CardHeader icon="receipt_long" title="Live price preview" />
        <p className="px-space-lg font-body-sm text-body-sm text-on-surface-variant">A $32 dog walk in Ontario, as a pet parent would see it at checkout.</p>
        <div className="px-space-lg">
          <table className="w-full text-left">
            <thead>
              <tr className="font-label-md text-label-md uppercase tracking-wide text-on-surface-variant">
                <th className="py-space-xs font-normal">
                  <span className="sr-only">Line</span>
                </th>
                <th className="py-space-xs text-right font-normal">Standard</th>
                <th className="py-space-xs text-right font-normal">With WagPoints</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface">
              {lines.map(([label, a, b]) => (
                <tr key={label} className="border-b border-[#EFE7DE]">
                  <td className="py-space-sm pr-space-sm">{label}</td>
                  <td className="py-space-sm text-right whitespace-nowrap">{signed(a)}</td>
                  <td className="py-space-sm text-right whitespace-nowrap">{signed(b)}</td>
                </tr>
              ))}
              <tr className="font-title-md text-title-md">
                <td className="pt-space-md">Total</td>
                <td className="pt-space-md text-right">{formatMoney(plain.totalCents, { exact: true })}</td>
                <td className="pt-space-md text-right text-primary">{formatMoney(withPoints.totalCents, { exact: true })}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mx-space-lg p-space-md rounded-xl bg-surface-container-low flex items-center justify-between gap-space-md">
          <span className="font-label-lg text-label-lg text-on-surface-variant">Platform revenue per booking</span>
          <span className="font-title-md text-title-md text-on-surface">{formatMoney(fees.wagShieldFeeCents + fees.serviceFeeCents, { exact: true })}</span>
        </div>
      </Card>
    </form>
  );
}
