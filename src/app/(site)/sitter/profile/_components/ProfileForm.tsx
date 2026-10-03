"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/sitter";
import { BTN, Card, CardHeader, Field, INPUT, TEXTAREA, Toggle } from "@/components/ui";
import { Select } from "@/components/forms/Select";
import { PET_SIZE_LABELS, PET_SIZES } from "@/lib/constants";
import { BIO_MAX, HOME_TYPES } from "@/lib/sitter";
import { PetKindPicker } from "@/components/PetKinds";
import { Feedback } from "../../_components/Feedback";
import { useFormAction } from "../../_components/useFormAction";

const HOME_TYPE_ICONS: Record<string, string> = { HOUSE_WITH_YARD: "yard", APARTMENT: "apartment", CONDO_BALCONY: "balcony" };

export type ProfileValues = {
  headline: string;
  bio: string;
  about: string;
  residentPetName: string;
  locationNote: string;
  serviceAreaNote: string;
  serviceRadiusKm: number;
  yearsExperience: number;
  homeType: string;
  homeTitle: string;
  homeNote: string;
  hasYard: boolean;
  smokeFree: boolean;
  hasChildren: boolean;
  hasOtherPets: boolean;
  otherPetsNote: string;
  acceptsSmall: boolean;
  acceptsMedium: boolean;
  acceptsLarge: boolean;
  acceptsGiant: boolean;
  kinds: string[];
  /** Sitter offers Dog Walking → DOG can't be unticked. */
  offersDogWalking: boolean;
};

const SIZE_FIELD = { SMALL: "acceptsSmall", MEDIUM: "acceptsMedium", LARGE: "acceptsLarge", GIANT: "acceptsGiant" } as const;

export function ProfileForm({ values: v }: { values: ProfileValues }) {
  const { state, pending, onSubmit } = useFormAction(updateProfile);
  const [bio, setBio] = useState(v.bio);
  const [otherPets, setOtherPets] = useState(v.hasOtherPets);
  const [kinds, setKinds] = useState<string[]>(v.kinds);
  const err = (k: string) => state?.fieldErrors?.[k];

  return (
    <form className="flex flex-col gap-space-lg" noValidate onSubmit={onSubmit}>
      <Card className="pb-space-lg" >
        <div id="about" className="scroll-mt-28" />
        <CardHeader icon="person" title="About you" />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
          <Field error={err("headline")} hint="Shown under your name, e.g. “Certified Positive Dog Trainer”." label="Headline">
            <input className={INPUT} defaultValue={v.headline} maxLength={80} name="headline" required />
          </Field>
          <Field error={err("bio")} hint={`${bio.length}/${BIO_MAX} — the short blurb on your search card.`} label="Short bio">
            <textarea className={`${TEXTAREA} min-h-[96px]`} maxLength={BIO_MAX} name="bio" onChange={(e) => setBio(e.target.value)} required value={bio} />
          </Field>
          <Field error={err("about")} hint="Your full profile story. Leave a blank line between paragraphs." label="About me">
            <textarea className={`${TEXTAREA} min-h-[220px]`} defaultValue={v.about} maxLength={4000} name="about" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Field error={err("yearsExperience")} label="Years of experience">
              <input className={INPUT} defaultValue={v.yearsExperience} inputMode="numeric" max={60} min={0} name="yearsExperience" type="number" />
            </Field>
            <Field error={err("residentPetName")} hint="Your own pet's name, if you have one." label="Resident pet">
              <input className={INPUT} defaultValue={v.residentPetName} maxLength={40} name="residentPetName" placeholder="e.g. Luna" />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="pb-space-lg">
        <CardHeader icon="map" title="Where you work" />
        <div className="px-space-lg pt-space-md grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <Field error={err("locationNote")} hint="A landmark owners know, e.g. “Near High Park”." label="Location note">
            <input className={INPUT} defaultValue={v.locationNote} maxLength={80} name="locationNote" />
          </Field>
          <Field error={err("serviceRadiusKm")} hint="How far you'll travel for walks and drop-ins." label="Service radius (km)">
            <input className={INPUT} defaultValue={v.serviceRadiusKm} inputMode="decimal" max={25} min={0.5} name="serviceRadiusKm" step={0.5} type="number" />
          </Field>
          <div className="md:col-span-2">
            <Field error={err("serviceAreaNote")} label="Service area">
              <input className={INPUT} defaultValue={v.serviceAreaNote} maxLength={200} name="serviceAreaNote" placeholder="e.g. The Beaches, Leslieville and Riverside" />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="pb-space-lg">
        <CardHeader icon="cottage" title="Your home" />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <Field error={err("homeType")} label="Home type">
              <Select
                aria-label="Home type"
                defaultValue={v.homeType}
                name="homeType"
                options={HOME_TYPES.map((h) => ({ value: h.value, label: h.label, icon: HOME_TYPE_ICONS[h.value] }))}
              />
            </Field>
            <Field error={err("homeTitle")} label="Home title">
              <input className={INPUT} defaultValue={v.homeTitle} maxLength={60} name="homeTitle" placeholder="e.g. Ground-Floor Home with Yard" />
            </Field>
          </div>
          <Field error={err("homeNote")} label="Home details">
            <input className={INPUT} defaultValue={v.homeNote} maxLength={200} name="homeNote" placeholder="e.g. Private, fully fenced 45 m² lawn" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
            <Toggle defaultChecked={v.hasYard} label="Fenced yard" name="hasYard" />
            <Toggle defaultChecked={v.smokeFree} label="Smoke-free home" name="smokeFree" />
            <Toggle defaultChecked={v.hasChildren} label="Children at home" name="hasChildren" />
            <label className="flex items-center justify-between gap-space-md p-space-md rounded-xl bg-surface-container-low cursor-pointer">
              <span className="font-label-lg text-label-lg text-on-surface">Other pets at home</span>
              <input checked={otherPets} className="peer sr-only" name="hasOtherPets" onChange={(e) => setOtherPets(e.target.checked)} type="checkbox" value="1" />
              <span className="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
            </label>
          </div>
          {otherPets && (
            <Field error={err("otherPetsNote")} label="About your pets">
              <input className={INPUT} defaultValue={v.otherPetsNote} maxLength={200} name="otherPetsNote" placeholder="e.g. Spayed, gentle female Golden Retriever" />
            </Field>
          )}
        </div>
      </Card>

      <Card className="pb-space-lg">
        <div className="scroll-mt-28" id="pets" />
        <CardHeader icon="pets" title="Pets I care for" />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-sm">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Shown on your profile and used in search — owners can only book you for these pets.
            {v.offersDogWalking && " Dogs stay on while you offer Dog Walking."}
          </p>
          <PetKindPicker
            locked={v.offersDogWalking ? ["DOG"] : []}
            lockedHint="You offer Dog Walking — turn it off in Services to remove dogs."
            onChange={setKinds}
            value={kinds}
          />
          {err("kinds") && <Feedback state={{ error: err("kinds")![0] }} />}
        </div>
      </Card>

      <Card className={`pb-space-lg ${kinds.includes("DOG") ? "" : "hidden"}`}>
        <CardHeader icon="straighten" title="Dog sizes you accept" />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
            {PET_SIZES.map((s) => (
              <label className="cursor-pointer" key={s}>
                <input className="peer sr-only" defaultChecked={v[SIZE_FIELD[s]]} name={SIZE_FIELD[s]} type="checkbox" value="1" />
                <span className="flex flex-col items-center gap-0.5 p-space-md rounded-2xl border-[1.5px] border-[#EFE7DE] bg-surface-container-lowest peer-checked:border-primary-container peer-checked:bg-[#EBF3EF] peer-focus-visible:ring-[3px] peer-focus-visible:ring-primary-container/20 transition-all">
                  <span className="font-label-lg text-label-lg text-on-surface">{PET_SIZE_LABELS[s].label}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{PET_SIZE_LABELS[s].range}</span>
                </span>
              </label>
            ))}
          </div>
          {err("acceptsSmall") && <Feedback state={{ error: err("acceptsSmall")![0] }} />}
        </div>
      </Card>

      <div className="sticky bottom-space-md z-10 flex flex-col sm:flex-row sm:items-center gap-space-sm p-space-md rounded-2xl bg-surface-container-lowest/95 backdrop-blur border border-[#EFE7DE] shadow-[0_4px_16px_-2px_rgba(83,72,62,0.12)]">
        <button className={BTN.primary} disabled={pending} type="submit">
          <span className="material-symbols-outlined text-lg">save</span>
          {pending ? "Saving…" : "Save profile"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
