"use client";

import Link from "next/link";
import { useActionState } from "react";
import { savePhoneForBooking } from "@/app/actions/readiness";
import type { ReadinessStep } from "@/lib/owner-readiness";

/** "Before your first booking" card on checkout with inline quick actions. */
export function ReadinessChecklist({ steps, phone, addPetHref }: { steps: ReadinessStep[]; phone: string | null; addPetHref: string }) {
  const remaining = steps.filter((s) => !s.done).length;
  return (
    <section
      aria-labelledby="readiness-title"
      className="bg-surface-container-lowest rounded-2xl p-space-md sm:p-space-lg shadow-sm border border-tertiary-fixed-dim/40 flex flex-col gap-space-md"
      id="before-booking"
    >
      <div className="flex items-start gap-space-sm">
        <div className="w-10 h-10 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-xl">checklist</span>
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="font-title-md text-title-md text-on-surface" id="readiness-title">
            Before your first booking
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {remaining === 1 ? "One quick step" : `${remaining} quick steps`} to keep every stay safe — your details are saved for next time.
          </p>
        </div>
      </div>
      <ol className="flex flex-col gap-space-sm">
        {steps.map((s) => (
          <li key={s.key} className={`rounded-xl p-space-sm sm:p-space-md flex flex-col gap-space-sm ${s.done ? "bg-[#EBF3EF]" : "bg-surface-container-low"}`}>
            <div className="flex items-start gap-space-sm">
              <span
                className={`material-symbols-outlined text-xl shrink-0 ${s.done ? "text-primary" : s.status === "REJECTED" ? "text-error" : s.status === "PENDING" ? "text-tertiary" : "text-outline"}`}
              >
                {s.done ? "check_circle" : s.status === "PENDING" ? "hourglass_top" : s.status === "REJECTED" ? "error" : "radio_button_unchecked"}
              </span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className={`font-label-lg text-label-lg ${s.done ? "text-primary" : "text-on-surface"}`}>{s.label}</span>
                {s.detail && <span className="font-body-sm text-body-sm text-on-surface-variant break-words">{s.detail}</span>}
              </div>
              {!s.done && s.key === "pet" && (
                <Link
                  className="shrink-0 inline-flex items-center gap-1 h-9 px-space-md rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors"
                  href={addPetHref}
                >
                  <span className="material-symbols-outlined text-base">add</span>Add pet
                </Link>
              )}
              {!s.done && s.status === "REJECTED" && s.href && (
                <Link className="shrink-0 inline-flex items-center gap-1 h-9 px-space-md rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md hover:brightness-95" href={s.href}>
                  Contact support
                </Link>
              )}
            </div>
            {!s.done && s.key === "phone" && <PhoneForm defaultValue={phone ?? ""} />}
          </li>
        ))}
      </ol>
    </section>
  );
}

function PhoneForm({ defaultValue }: { defaultValue: string }) {
  const [state, action, pending] = useActionState(savePhoneForBooking, undefined);
  const error = state?.fieldErrors?.phone?.[0] ?? state?.error;
  return (
    <form action={action} className="flex flex-col gap-1 sm:pl-8">
      <div className="flex gap-space-xs">
        <label className="sr-only" htmlFor="readiness-phone">
          Phone number
        </label>
        <input
          aria-describedby={error ? "readiness-phone-error" : undefined}
          aria-invalid={!!error}
          autoComplete="tel"
          className="min-w-0 flex-1 h-11 px-space-md rounded-full bg-surface-container-lowest border-[1.5px] border-[#EFE7DE] font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/15"
          defaultValue={defaultValue}
          id="readiness-phone"
          inputMode="tel"
          maxLength={25}
          name="phone"
          placeholder="(416) 555-0123"
          required
          type="tel"
        />
        <button
          className="shrink-0 inline-flex items-center gap-1 h-11 px-space-md rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? <span className="material-symbols-outlined text-base animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-base">call</span>}
          Save
        </button>
      </div>
      {error && (
        <p className="font-body-sm text-body-sm text-error flex items-center gap-1" id="readiness-phone-error" role="alert">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </p>
      )}
    </form>
  );
}
