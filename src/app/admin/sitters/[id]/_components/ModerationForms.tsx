"use client";

import { useActionState, useState } from "react";
import { removeSitterContent, updateSitterContent, type AdminFormState } from "@/app/actions/admin-sitters";
import { BTN, Field, INPUT, TEXTAREA } from "@/components/ui";

// Profile moderation (Terms → "Profile content"): every change needs a reason, is audited and emailed to the sitter.

function Status({ state }: { state: AdminFormState }) {
  if (state?.error) return <p className="font-body-sm text-body-sm text-error" role="alert">{state.error}</p>;
  if (state?.ok && state.message) return <p className="font-body-sm text-body-sm text-primary" role="status">{state.message}</p>;
  return null;
}

export type SitterContentValues = {
  id: string;
  displayName: string;
  headline: string;
  bio: string;
  about: string | null;
  residentPetName: string | null;
  locationNote: string | null;
  serviceAreaNote: string | null;
  homeTitle: string | null;
  homeNote: string | null;
  otherPetsNote: string | null;
  yearsExperience: number;
};

export function SitterContentForm({ sitter }: { sitter: SitterContentValues }) {
  const [state, action, pending] = useActionState(updateSitterContent, undefined);
  const fe = state?.fieldErrors ?? {};
  const text = (name: keyof SitterContentValues, label: string, max: number) => (
    <Field error={fe[name]} label={label}>
      <input className={INPUT} defaultValue={(sitter[name] as string | null) ?? ""} maxLength={max} name={name} />
    </Field>
  );
  return (
    <form action={action} className="flex flex-col gap-space-md px-space-lg" noValidate>
      <input name="sitterId" type="hidden" value={sitter.id} />
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        For factual corrections and content that breaks our Terms. The sitter is emailed what changed and why, and can edit their profile again at any time.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {text("displayName", "Display name", 60)}
        {text("headline", "Headline", 80)}
      </div>
      <Field error={fe.bio} label="Short bio">
        <textarea className={TEXTAREA} defaultValue={sitter.bio} maxLength={500} name="bio" rows={3} />
      </Field>
      <Field error={fe.about} label="About">
        <textarea className={TEXTAREA} defaultValue={sitter.about ?? ""} maxLength={4000} name="about" rows={5} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {text("homeTitle", "Home title", 60)}
        {text("homeNote", "Home description", 200)}
        {text("otherPetsNote", "Other pets note", 200)}
        {text("residentPetName", "Resident pet's name", 40)}
        {text("locationNote", "Location note", 80)}
        {text("serviceAreaNote", "Service area note", 200)}
        <Field error={fe.yearsExperience} label="Years of experience">
          <input className={INPUT} defaultValue={sitter.yearsExperience} max={60} min={0} name="yearsExperience" type="number" />
        </Field>
      </div>
      <Field error={fe.reason} hint="Required. The sitter sees this in the email." label="Reason for the change">
        <textarea className={TEXTAREA} maxLength={500} name="reason" placeholder="e.g. Removed a phone number from the bio — contact details must stay in WagStays messages." rows={2} />
      </Field>
      <Status state={state} />
      <div className="flex justify-end">
        <button className={BTN.sage} disabled={pending} type="submit">
          {pending ? "Saving…" : "Save & notify sitter"}
        </button>
      </div>
    </form>
  );
}

/** Small "Remove" control that asks for a reason inline before removing a photo / tag / skill / the profile photo. */
export function RemoveContentButton({ sitterId, target, targetId, label = "Remove" }: { sitterId: string; target: "photo" | "tag" | "skill" | "avatar"; targetId?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(removeSitterContent, undefined);
  if (state?.ok) return <span className="font-body-sm text-body-sm text-primary">{state.message}</span>;
  if (!open)
    return (
      <button className={`${BTN.small} text-error hover:bg-error-container/50`} onClick={() => setOpen(true)} type="button">
        <span className="material-symbols-outlined text-base">delete</span>
        {label}
      </button>
    );
  return (
    <form action={action} className="flex flex-col gap-space-xs w-full">
      <input name="sitterId" type="hidden" value={sitterId} />
      <input name="target" type="hidden" value={target} />
      {targetId && <input name="targetId" type="hidden" value={targetId} />}
      <input autoFocus className={`${INPUT} h-10`} maxLength={500} name="reason" placeholder="Reason (the sitter will see this)" />
      {state?.fieldErrors?.reason?.[0] && <span className="font-body-sm text-body-sm text-error">{state.fieldErrors.reason[0]}</span>}
      <Status state={state} />
      <span className="flex gap-space-xs">
        <button className={`${BTN.small} bg-error text-on-error`} disabled={pending} type="submit">
          {pending ? "Removing…" : "Remove & notify"}
        </button>
        <button className={`${BTN.small} hover:bg-surface-container`} onClick={() => setOpen(false)} type="button">
          Cancel
        </button>
      </span>
    </form>
  );
}
