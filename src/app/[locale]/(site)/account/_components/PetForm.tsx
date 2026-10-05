"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { startTransition, useActionState, useState } from "react";
import { savePet, type FormState } from "@/app/actions/account";
import { BTN, Card, CardHeader, Field, INPUT, LABEL, Toggle } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { PET_SIZES, PET_SIZE_LABELS } from "@/lib/constants";
import { PET_KINDS } from "@/lib/pets";
import { ImagePicker } from "./ImagePicker";

type Trait = { label: string; tone: "neutral" | "warning" };
export type PetFormValues = {
  id: string;
  name: string;
  species: string;
  speciesOther: string | null;
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
  { value: "DOG", icon: "sound_detection_dog_barking" },
  { value: "CAT", icon: "pets" },
  { value: "OTHER", icon: "cruelty_free" },
] as const;
const SEX_OPTIONS = [{ value: "" }, { value: "MALE", icon: "male" }, { value: "FEMALE", icon: "female" }] as const;
const SUGGESTIONS = [
  { key: "peopleFriendly", tone: "neutral" },
  { key: "goodWithDogs", tone: "neutral" },
  { key: "pullsOnLeash", tone: "neutral" },
  { key: "separationAnxiety", tone: "neutral" },
  { key: "chickenAllergy", tone: "warning" },
  { key: "needsMedication", tone: "warning" },
] as const;
/** Popular "other" pets offered as quick picks (the non-dog/cat kinds). */
const OTHER_KINDS = PET_KINDS.filter((k) => k !== "DOG" && k !== "CAT" && k !== "OTHER");

// Mobile: an even grid (3 across, or 2×2 for four options) instead of a ragged wrap; sm+: the wrapping row.
const CHOICE_GRID: Record<number, string> = { 2: "grid grid-cols-2", 3: "grid grid-cols-3", 4: "grid grid-cols-2" };

function ChoiceGroup({ name, legend, options, defaultValue, error, onChange }: { name: string; legend: string; options: { value: string; label: string; hint?: string; icon?: string }[]; defaultValue?: string | null; error?: string[]; onChange?: (value: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-space-xs" onChange={(e) => {
        const input = e.target as unknown as HTMLInputElement;
        if (input.name === name) onChange?.(input.value);
      }}>
      <legend className={`${LABEL} mb-space-xs`}>{legend}</legend>
      <div className={`${CHOICE_GRID[options.length] ?? "flex flex-wrap"} sm:flex sm:flex-wrap gap-space-xs`}>
        {options.map((o) => (
          <label className="cursor-pointer" key={o.value}>
            <input className="peer sr-only" defaultChecked={defaultValue === o.value} name={name} type="radio" value={o.value} />
            <span className="h-full flex items-center gap-1.5 min-h-11 px-space-md py-space-xs rounded-xl border-[1.5px] border-[#EFE7DE] bg-surface-container-lowest font-label-lg text-label-lg text-on-surface-variant transition-all hover:bg-surface-container-low peer-checked:border-primary-container peer-checked:bg-[#EBF3EF] peer-checked:text-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-container/25">
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
  const t = useTranslations("account.petForm");
  const tc = useTranslations("common");
  const otherSuggestions = OTHER_KINDS.map((k) => tc(`enums.petKind.${k}`));
  const suggestions: Trait[] = SUGGESTIONS.map((s) => ({ label: t(`suggestions.${s.key}`), tone: s.tone }));
  const [traits, setTraits] = useState<Trait[]>(pet?.traits ?? []);
  const [draft, setDraft] = useState("");
  const [draftWarning, setDraftWarning] = useState(false);
  const fe = state?.fieldErrors ?? {};
  const [species, setSpecies] = useState(pet?.species ?? "DOG");
  const [otherKind, setOtherKind] = useState(pet?.speciesOther ?? "");
  // hide the server's "what kind of pet?" error once the field has been edited again
  const [kindErrorFor, setKindErrorFor] = useState<typeof state>(undefined);
  const editKind = (v: string) => {
    setOtherKind(v);
    setKindErrorFor(state);
  };

  function addTrait(trait: Trait) {
    const label = trait.label.trim().slice(0, 40);
    if (!label || traits.length >= 12 || traits.some((x) => x.label.toLowerCase() === label.toLowerCase())) return;
    setTraits((ts) => [...ts, { label, tone: trait.tone }]);
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
        <CardHeader icon="pets" title={t("basics")} />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-lg">
          <ImagePicker error={fe.photo?.[0]} fallbackIcon="pets" initialUrl={pet?.photoUrl ?? null} label={t("photo")} name="photo" removeName="removePhoto" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Field error={fe.name} label={t("name")}>
              <input autoComplete="off" className={INPUT} defaultValue={pet?.name} maxLength={40} name="name" placeholder={t("namePlaceholder")} required />
            </Field>
            <Field error={fe.breed} label={t("breed")}>
              <input autoComplete="off" className={INPUT} defaultValue={pet?.breed ?? ""} maxLength={60} name="breed" placeholder={t("breedPlaceholder")} />
            </Field>
          </div>
          <ChoiceGroup
            defaultValue={pet?.species ?? "DOG"}
            error={fe.species}
            legend={t("speciesLegend")}
            name="species"
            onChange={setSpecies}
            options={SPECIES.map((o) => ({ ...o, label: t(`species.${o.value}`) }))}
          />
          {species === "OTHER" && (
            <Field error={kindErrorFor === state ? undefined : fe.speciesOther} hint={t("otherKindHint")} label={t("otherKindLabel")}>
              <input
                autoComplete="off"
                autoFocus={!pet}
                className={INPUT}
                maxLength={40}
                name="speciesOther"
                onChange={(e) => editKind(e.target.value)}
                placeholder={t("otherKindPlaceholder")}
                required
                value={otherKind}
              />
              <span className="flex flex-wrap gap-space-xs pt-space-xs">
                {otherSuggestions.map((k) => (
                  <button
                    className={`h-9 px-space-md rounded-full font-label-md text-label-md border transition-all ${
                      otherKind === k
                        ? "bg-[#EBF3EF] text-primary border-primary-container"
                        : "bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-container"
                    }`}
                    key={k}
                    onClick={() => editKind(k)}
                    type="button"
                  >
                    {k}
                  </button>
                ))}
              </span>
            </Field>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Field error={fe.ageYears} hint={t("ageHint")} label={t("age")}>
              <input className={INPUT} defaultValue={pet?.ageYears ?? ""} inputMode="decimal" max={40} min={0} name="ageYears" placeholder={t("agePlaceholder")} step={0.1} type="number" />
            </Field>
            <Field error={fe.sex} label={t("sexLabel")}>
              <Select
                aria-label={t("sexLabel")}
                defaultValue={pet?.sex ?? ""}
                name="sex"
                options={SEX_OPTIONS.map((o) => ({ ...o, label: t(`sex.${o.value || "none"}`) }))}
              />
            </Field>
          </div>
          <ChoiceGroup
            defaultValue={pet?.size}
            error={fe.size}
            legend={t("size")}
            name="size"
            options={PET_SIZES.map((s) => ({ value: s, label: tc(`enums.petSize.${s}`), hint: PET_SIZE_LABELS[s].range }))}
          />
        </div>
      </Card>

      <Card className="pb-space-lg">
        <CardHeader icon="health_and_safety" title={t("health")} />
        <div className="px-space-lg pt-space-md grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <Toggle defaultChecked={pet?.neutered} description={t("neuteredDescription")} label={t("neuteredLabel")} name="neutered" />
          <Toggle defaultChecked={pet?.rabiesVaccinated} description={t("rabiesDescription")} label={t("rabiesLabel")} name="rabiesVaccinated" />
          <div className="md:col-span-2">
            <Field error={fe.microchip} hint={t("microchipHint")} label={t("microchip")}>
              <input autoComplete="off" className={INPUT} defaultValue={pet?.microchip ?? ""} maxLength={20} name="microchip" placeholder={t("microchipPlaceholder")} />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="pb-space-lg">
        <CardHeader icon="sell" title={t("personality")} />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t.rich("traitsIntro", { b: (c) => <strong className="text-on-error-container">{c}</strong> })}
          </p>
          {traits.length > 0 ? (
            <ul aria-label={t("traits")} className="flex flex-wrap gap-space-xs">
              {traits.map((trait, i) => (
                <li
                  className={`inline-flex items-center gap-1 h-8 pl-space-sm pr-1 rounded-full font-label-md text-label-md ${
                    trait.tone === "warning" ? "bg-error-container text-on-error-container" : "bg-surface-container-high text-on-surface-variant"
                  }`}
                  key={`${trait.label}-${i}`}
                >
                  {trait.tone === "warning" && <span className="material-symbols-outlined text-sm">warning</span>}
                  {trait.label}
                  <button
                    aria-label={t("removeTrait", { label: trait.label })}
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
            <p className="font-body-sm text-body-sm text-outline">{t("noTraits")}</p>
          )}
          <div className="flex flex-col sm:flex-row gap-space-sm sm:items-center">
            <input
              aria-label={t("newTrait")}
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
              placeholder={t("traitPlaceholder")}
              value={draft}
            />
            <label className="inline-flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant cursor-pointer whitespace-nowrap">
              <input checked={draftWarning} className="w-4 h-4 accent-[#BA1A1A]" onChange={(e) => setDraftWarning(e.target.checked)} type="checkbox" />
              {t("allergy")}
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
              {t("addTrait")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant">{t("suggestionsLabel")}</span>
            {suggestions.filter((s) => !traits.some((x) => x.label.toLowerCase() === s.label.toLowerCase())).map((s) => (
              <button
                className={`inline-flex items-center gap-1 h-9 sm:h-7 px-space-sm rounded-full border border-dashed font-label-sm text-label-sm transition-colors ${
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
            {t("fixFields")}
          </p>
        )}
        {state?.ok && (
          <p className="flex items-center gap-1 font-label-lg text-label-lg text-primary sm:mr-auto" role="status">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            {state.message}
          </p>
        )}
        <Link className={BTN.ghost} href={cancelHref}>
          {tc("actions.cancel")}
        </Link>
        <button className={BTN.primary} disabled={pending} type="submit">
          <span className={`material-symbols-outlined text-xl ${pending ? "animate-spin" : ""}`}>{pending ? "autorenew" : "save"}</span>
          {pending ? tc("actions.saving") : pet ? tc("actions.saveChanges") : next ? t("saveContinue") : t("addPet")}
        </button>
      </div>
    </form>
  );
}
