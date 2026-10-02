"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { savePet, type FormState } from "@/app/actions/account";
import { BTN, Card, CardHeader, Field, INPUT, LABEL, Toggle } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { PET_SIZES, PET_SIZE_LABELS } from "@/lib/constants";
import { ImagePicker } from "./ImagePicker";

type Trait = { label: string; tone: "neutral" | "warning" };
export type PetFormValues = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  ageYears: number | null;
  size: string | null;
  sex: string | null;
  neutered: boolean;
  rabiesVaccinated: boolean;
  microchip: string | null;
  photoUrl: string | null;
  traits: Trait[];
};

const SPECIES = [
  { value: "DOG", label: "Dog", icon: "sound_detection_dog_barking" },
  { value: "CAT", label: "Cat", icon: "pets" },
  { value: "OTHER", label: "Other", icon: "cruelty_free" },
];
const SEX_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "MALE", label: "Male", icon: "male" },
  { value: "FEMALE", label: "Female", icon: "female" },
];
const SUGGESTIONS: Trait[] = [
  { label: "People-Friendly", tone: "neutral" },
  { label: "Good with Dogs", tone: "neutral" },
  { label: "Pulls on Leash", tone: "neutral" },
  { label: "Separation Anxiety", tone: "neutral" },
  { label: "Chicken Allergy", tone: "warning" },
  { label: "Needs Medication", tone: "warning" },
];

function ChoiceGroup({ name, legend, options, defaultValue, error }: { name: string; legend: string; options: { value: string; label: string; hint?: string; icon?: string }[]; defaultValue?: string | null; error?: string[] }) {
  return (
    <fieldset className="flex flex-col gap-space-xs">
      <legend className={`${LABEL} mb-space-xs`}>{legend}</legend>
      <div className="flex flex-wrap gap-space-xs">
        {options.map((o) => (
          <label className="cursor-pointer" key={o.value}>
            <input className="peer sr-only" defaultChecked={defaultValue === o.value} name={name} type="radio" value={o.value} />
            <span className="flex items-center gap-1.5 min-h-11 px-space-md py-space-xs rounded-xl border-[1.5px] border-[#EFE7DE] bg-surface-container-lowest font-label-lg text-label-lg text-on-surface-variant transition-all hover:bg-surface-container-low peer-checked:border-primary-container peer-checked:bg-[#EBF3EF] peer-checked:text-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-container/25">
              {o.icon && <span className="material-symbols-outlined text-lg">{o.icon}</span>}
              <span className="flex flex-col leading-tight">
                {o.label}
                {o.hint && <span className="font-body-sm text-[12px] font-normal opacity-80">{o.hint}</span>}
              </span>
            </span>
          </label>
        ))}
      </div>
      {error?.[0] && (
        <span className="flex items-center gap-1 font-body-sm text-body-sm text-error">
          <span className="material-symbols-outlined text-base">error</span>
          {error[0]}
        </span>
      )}
    </fieldset>
  );
}

export function PetForm({ pet, next, cancelHref }: { pet?: PetFormValues; next?: string | null; cancelHref: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePet.bind(null, pet?.id ?? null), undefined);
  const [traits, setTraits] = useState<Trait[]>(pet?.traits ?? []);
  const [draft, setDraft] = useState("");
  const [draftWarning, setDraftWarning] = useState(false);
  const fe = state?.fieldErrors ?? {};

  function addTrait(t: Trait) {
    const label = t.label.trim().slice(0, 40);
    if (!label || traits.length >= 12 || traits.some((x) => x.label.toLowerCase() === label.toLowerCase())) return;
    setTraits((ts) => [...ts, { label, tone: t.tone }]);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Dispatch manually so the browser keeps field values when the server returns validation errors.
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  }

  return (
    <form className="flex flex-col gap-space-lg" noValidate onSubmit={onSubmit}>
      {next && <input name="next" type="hidden" value={next} />}
      <input name="traits" type="hidden" value={JSON.stringify(traits)} />

      <Card className="pb-space-lg">
        <CardHeader icon="pets" title="The Basics" />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-lg">
          <ImagePicker error={fe.photo?.[0]} fallbackIcon="pets" initialUrl={pet?.photoUrl ?? null} label="Photo" name="photo" removeName="removePhoto" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Field error={fe.name} label="Name">
              <input autoComplete="off" className={INPUT} defaultValue={pet?.name} maxLength={40} name="name" placeholder="e.g. Maple" required />
            </Field>
            <Field error={fe.breed} label="Breed">
              <input autoComplete="off" className={INPUT} defaultValue={pet?.breed ?? ""} maxLength={60} name="breed" placeholder="e.g. Golden Retriever" />
            </Field>
          </div>
          <ChoiceGroup defaultValue={pet?.species ?? "DOG"} error={fe.species} legend="Species" name="species" options={SPECIES} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Field error={fe.ageYears} hint="In years — decimals are fine (e.g. 0.5 for six months)." label="Age">
              <input className={INPUT} defaultValue={pet?.ageYears ?? ""} inputMode="decimal" max={40} min={0} name="ageYears" placeholder="e.g. 2.5" step={0.1} type="number" />
            </Field>
            <Field error={fe.sex} label="Sex">
              <Select aria-label="Sex" defaultValue={pet?.sex ?? ""} name="sex" options={SEX_OPTIONS} />
            </Field>
          </div>
          <ChoiceGroup
            defaultValue={pet?.size}
            error={fe.size}
            legend="Size"
            name="size"
            options={PET_SIZES.map((s) => ({ value: s, label: PET_SIZE_LABELS[s].label, hint: PET_SIZE_LABELS[s].range }))}
          />
        </div>
      </Card>

      <Card className="pb-space-lg">
        <CardHeader icon="health_and_safety" title="Health & ID" />
        <div className="px-space-lg pt-space-md grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <Toggle defaultChecked={pet?.neutered} description="Helps sitters plan group play." label="Spayed / neutered" name="neutered" />
          <Toggle defaultChecked={pet?.rabiesVaccinated} description="Required for most boarding stays." label="Rabies vaccinated" name="rabiesVaccinated" />
          <div className="md:col-span-2">
            <Field error={fe.microchip} hint="Optional — 9 to 15 letters or digits." label="Microchip number">
              <input autoComplete="off" className={INPUT} defaultValue={pet?.microchip ?? ""} maxLength={20} name="microchip" placeholder="e.g. 981098103982" />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="pb-space-lg">
        <CardHeader icon="sell" title="Personality & Care Notes" />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Add short traits sitters should know. Mark allergies and medical needs as <strong className="text-on-error-container">important</strong> so they stand out.
          </p>
          {traits.length > 0 ? (
            <ul aria-label="Traits" className="flex flex-wrap gap-space-xs">
              {traits.map((t, i) => (
                <li
                  className={`inline-flex items-center gap-1 h-8 pl-space-sm pr-1 rounded-full font-label-md text-label-md ${
                    t.tone === "warning" ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                  key={`${t.label}-${i}`}
                >
                  {t.tone === "warning" && <span className="material-symbols-outlined text-sm">warning</span>}
                  {t.label}
                  <button
                    aria-label={`Remove ${t.label}`}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                    onClick={() => setTraits((ts) => ts.filter((_, j) => j !== i))}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body-sm text-body-sm text-outline">No traits yet.</p>
          )}
          <div className="flex flex-col sm:flex-row gap-space-sm sm:items-center">
            <input
              aria-label="New trait"
              className={`${INPUT} sm:flex-1`}
              maxLength={40}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTrait({ label: draft, tone: draftWarning ? "warning" : "neutral" });
                  setDraft("");
                }
              }}
              placeholder="e.g. Tennis Ball Fanatic"
              value={draft}
            />
            <label className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant cursor-pointer whitespace-nowrap">
              <input checked={draftWarning} className="w-4 h-4 accent-[#BA1A1A]" onChange={(e) => setDraftWarning(e.target.checked)} type="checkbox" />
              Allergy / medical
            </label>
            <button
              className={`${BTN.small} bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] hover:bg-[#DCECE4]`}
              disabled={!draft.trim() || traits.length >= 12}
              onClick={() => {
                addTrait({ label: draft, tone: draftWarning ? "warning" : "neutral" });
                setDraft("");
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Add trait
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Suggestions:</span>
            {SUGGESTIONS.filter((s) => !traits.some((t) => t.label.toLowerCase() === s.label.toLowerCase())).map((s) => (
              <button
                className={`inline-flex items-center gap-1 h-7 px-space-sm rounded-full border border-dashed font-label-sm text-label-sm transition-colors ${
                  s.tone === "warning" ? "border-error/40 text-error hover:bg-error-container/50" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                }`}
                key={s.label}
                onClick={() => addTrait(s)}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                {s.label}
              </button>
            ))}
          </div>
          {fe.traits?.[0] && (
            <span className="flex items-center gap-1 font-body-sm text-body-sm text-error">
              <span className="material-symbols-outlined text-base">error</span>
              {fe.traits[0]}
            </span>
          )}
        </div>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-space-sm">
        {state?.error && (
          <p className="flex items-center gap-1 font-body-sm text-body-sm text-error sm:mr-auto" role="alert">
            <span className="material-symbols-outlined text-base">error</span>
            {state.error}
          </p>
        )}
        {state?.fieldErrors && !state.error && (
          <p className="flex items-center gap-1 font-body-sm text-body-sm text-error sm:mr-auto" role="alert">
            <span className="material-symbols-outlined text-base">error</span>
            Please fix the highlighted fields.
          </p>
        )}
        {state?.ok && (
          <p className="flex items-center gap-1 font-label-lg text-label-lg text-primary sm:mr-auto" role="status">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            {state.message}
          </p>
        )}
        <Link className={BTN.ghost} href={cancelHref}>
          Cancel
        </Link>
        <button className={BTN.primary} disabled={pending} type="submit">
          <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : "save"}</span>
          {pending ? "Saving…" : pet ? "Save changes" : next ? "Save & continue booking" : "Add pet"}
        </button>
      </div>
    </form>
  );
}
