"use client";

import { startTransition, useActionState, useState } from "react";
import { updateService, updateSitter, updateSitterSpecies, type AdminFormState } from "@/app/actions/admin-sitters";
import { PetKindPicker } from "@/components/PetKinds";
import { BTN, Field, INPUT, TEXTAREA, Toggle } from "@/components/ui";
import { Select } from "@/components/forms/Select";

function Feedback({ state }: { state: AdminFormState }) {
  if (state?.error)
    return (
      <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm" role="alert">
        <span className="material-symbols-outlined text-lg">error</span>
        {state.error}
      </div>
    );
  if (state?.ok && state.message)
    return (
      <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-[#EBF3EF] text-primary font-body-sm text-body-sm" role="status">
        <span className="material-symbols-outlined text-lg">check_circle</span>
        {state.message}
      </div>
    );
  return null;
}

export type SitterFormValues = {
  id: string;
  status: string;
  neighbourhoodId: string;
  featured: boolean;
  featuredBadge: string | null;
  featuredBadgeIcon: string | null;
  credential: string | null;
  quote: string | null;
  isSuperSitter: boolean;
  instantBook: boolean;
  idVerified: boolean;
  backgroundChecked: boolean;
  firstAidCertified: boolean;
  vetKnowledge: boolean;
  professionalTrainer: boolean;
};

const SECTION = "flex flex-col gap-space-md";
const H3 = "font-label-lg text-label-lg uppercase tracking-wide text-on-surface-variant";

export function SitterForm({ sitter, neighbourhoods }: { sitter: SitterFormValues; neighbourhoods: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateSitter, undefined);
  const [status, setStatus] = useState(sitter.status);
  const [featured, setFeatured] = useState(sitter.featured);
  const fe = state?.fieldErrors;

  // Submit manually (instead of <form action>) so React doesn't reset the fields — edits survive validation errors.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "PAUSED" && sitter.status !== "PAUSED" && !window.confirm("Pause this sitter? They'll disappear from search and can't receive new bookings.")) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <form className="flex flex-col gap-space-lg p-space-lg" noValidate onSubmit={onSubmit}>
      <input name="sitterId" type="hidden" value={sitter.id} />

      <div className={SECTION}>
        <h3 className={H3}>Visibility</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <Field error={fe?.status} hint={status === "PAUSED" ? "Hidden from search and booking." : "Visible in search and bookable."} label="Status">
            <Select
              aria-label="Status"
              name="status"
              onChange={setStatus}
              options={[
                { value: "ACTIVE", label: "Active", icon: "visibility" },
                { value: "PAUSED", label: "Paused", icon: "pause_circle" },
              ]}
              value={status}
            />
          </Field>
          <Field error={fe?.neighbourhoodId} hint="Also moves their map pin to the neighbourhood centre." label="Neighbourhood">
            <Select
              aria-label="Neighbourhood"
              defaultValue={sitter.neighbourhoodId}
              name="neighbourhoodId"
              options={neighbourhoods.map((n) => ({ value: n.id, label: n.name }))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          <Toggle defaultChecked={sitter.isSuperSitter} description="Gold badge on cards and profile." label="Super Sitter" name="isSuperSitter" />
          <Toggle defaultChecked={sitter.instantBook} description="Bookings confirm without sitter approval." label="Instant Book" name="instantBook" />
        </div>
      </div>

      <div className={SECTION}>
        <h3 className={H3}>Home page carousel</h3>
        <label className="flex items-center justify-between gap-space-md p-space-md rounded-xl bg-surface-container-low cursor-pointer">
          <span className="flex flex-col">
            <span className="font-label-lg text-label-lg text-on-surface">Featured on home page</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Shows in “Meet our top sitters”.</span>
          </span>
          <input checked={featured} className="peer sr-only" name="featured" onChange={(e) => setFeatured(e.target.checked)} type="checkbox" value="1" />
          <span className="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
        </label>
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-space-md ${featured ? "" : "opacity-60"}`}>
          <Field error={fe?.featuredBadge} label="Badge text">
            <input className={INPUT} defaultValue={sitter.featuredBadge ?? ""} maxLength={40} name="featuredBadge" placeholder="Super Sitter" />
          </Field>
          <Field error={fe?.featuredBadgeIcon} hint="Material Symbols name" label="Badge icon">
            <input className={INPUT} defaultValue={sitter.featuredBadgeIcon ?? ""} maxLength={40} name="featuredBadgeIcon" placeholder="workspace_premium" />
          </Field>
          <Field error={fe?.credential} label="Credential">
            <input className={INPUT} defaultValue={sitter.credential ?? ""} maxLength={60} name="credential" placeholder="Vet Technician" />
          </Field>
        </div>
        <Field error={fe?.quote} hint="Short first-person line for the card (max 220 characters)." label="Quote">
          <textarea className={TEXTAREA.replace("min-h-[120px]", "min-h-[88px]")} defaultValue={sitter.quote ?? ""} maxLength={220} name="quote" rows={2} />
        </Field>
      </div>

      <div className={SECTION}>
        <h3 className={H3}>Verification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          <Toggle defaultChecked={sitter.idVerified} label="ID verified" name="idVerified" />
          <Toggle defaultChecked={sitter.backgroundChecked} label="Background checked" name="backgroundChecked" />
          <Toggle defaultChecked={sitter.firstAidCertified} label="Pet First Aid certified" name="firstAidCertified" />
          <Toggle defaultChecked={sitter.vetKnowledge} label="Veterinary knowledge" name="vetKnowledge" />
          <Toggle defaultChecked={sitter.professionalTrainer} label="Professional trainer" name="professionalTrainer" />
        </div>
      </div>

      <Feedback state={state} />
      <div className="flex justify-end">
        <button className={BTN.primary} disabled={pending} type="submit">
          <span className="material-symbols-outlined text-lg">save</span>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function ServiceRowForm({
  service,
}: {
  service: { id: string; label: string; unitLabel: string; price: number; active: boolean; bookings: number };
}) {
  const [state, action, pending] = useActionState(updateService, undefined);
  const err = state?.fieldErrors?.price?.[0] ?? state?.error;
  return (
    <form action={action} className="flex flex-col gap-space-xs py-space-md border-b border-[#EFE7DE] last:border-0" noValidate>
      <input name="serviceId" type="hidden" value={service.id} />
      <div className="flex flex-wrap items-center gap-space-md">
        <div className="flex flex-col flex-1 min-w-[160px]">
          <span className="font-label-lg text-label-lg text-on-surface">{service.label}</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            per {service.unitLabel} · {service.bookings} booking{service.bookings === 1 ? "" : "s"}
          </span>
        </div>
        <label className="relative w-32">
          <span className="sr-only">Price for {service.label} (CAD)</span>
          <span className="absolute left-space-md top-1/2 -translate-y-1/2 text-on-surface-variant font-body-md">$</span>
          <input className={`${INPUT} pl-7 h-11`} defaultValue={service.price} inputMode="decimal" max={1000} min={5} name="price" step="0.01" type="number" />
        </label>
        <label className="inline-flex items-center gap-space-sm cursor-pointer">
          <input className="peer sr-only" defaultChecked={service.active} name="active" type="checkbox" value="1" />
          <span className="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
          <span className="font-label-md text-label-md text-on-surface-variant">Active</span>
        </label>
        <button className={`${BTN.small} bg-[#EBF3EF] text-primary border border-[#C8DDD4] hover:bg-[#DCECE4]`} disabled={pending} type="submit">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {err && <span className="font-body-sm text-body-sm text-error">{err}</span>}
      {state?.ok && state.message && <span className="font-body-sm text-body-sm text-primary">{state.message}</span>}
    </form>
  );
}

export function SpeciesForm({ sitterId, kinds, offersDogWalking }: { sitterId: string; kinds: string[]; offersDogWalking: boolean }) {
  const [state, action, pending] = useActionState(updateSitterSpecies, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
  return (
    <form className="flex flex-col gap-space-md px-space-lg pt-space-md" noValidate onSubmit={onSubmit}>
      <input name="sitterId" type="hidden" value={sitterId} />
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Shown on the profile, used by search filters and enforced at booking.{offersDogWalking && " Dogs are locked while Dog Walking is active."}
      </p>
      <PetKindPicker defaultValue={kinds} locked={offersDogWalking ? ["DOG"] : []} lockedHint="Dog Walking is active" />
      <Feedback state={state} />
      <div className="flex justify-end">
        <button className={`${BTN.small} bg-[#EBF3EF] text-primary border border-[#C8DDD4] hover:bg-[#DCECE4]`} disabled={pending} type="submit">
          {pending ? "Saving…" : "Save pets"}
        </button>
      </div>
    </form>
  );
}
