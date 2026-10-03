"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createBooking } from "@/app/actions/booking";
import { Select } from "@/components/forms/Select";
import { MobileStickyBar, STICKY_BAR_BTN } from "@/components/MobileStickyBar";
import { formatMoney, formatRating } from "@/lib/format";
import { priceBooking, type Fees } from "@/lib/pricing";
import { SERVICE_ICONS, plainTrait } from "../_lib";
import { EarnPointsNote } from "@/components/points/EarnPointsNote";

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  ageYears: number | null;
  sex: string | null;
  neutered: boolean;
  rabiesVaccinated: boolean;
  microchip: string | null;
  photoUrl: string | null;
  traits: { id: string; label: string; tone: string }[];
};

type Props = {
  sitter: {
    slug: string;
    displayName: string;
    firstName: string;
    avatarUrl: string;
    rating: number;
    isSuperSitter: boolean;
    completedBookings: number;
  };
  service: { id: string; type: string; unitPriceCents: number; line: string };
  pets: Pet[];
  initialPetId: string;
  schedule: {
    date: string;
    /** check-out / last day for stays */
    endDate: string | null;
    /** "HH:MM" start or drop-off time */
    slot: string;
    dateLabel: string;
    timeLabel: string;
    cancelLabel: string;
    recurring: boolean;
    /** occurrences in the weekly series (1 for a one-off booking) */
    weeks: number;
    seriesLabel: string | null;
    /** nights / days / visits in one booking */
    quantity: number;
    quantityLabel: string;
    meet: boolean;
    /** back to the profile widget to change the dates */
    changeHref: string;
    /** dates that aren't available (the server re-checks on submit) */
    conflicts: { date: string; error: string }[];
    occurrenceCount: number;
  };
  owner: { fullName: string; wagPointsCents: number };
  taxRateBps: number;
  fees: Fees;
  /** WagPoints earn rate (basis points) for the "You'll earn ~$X" hint. */
  earnRateBps?: number;
  /** Link to the add-pet form that returns to this checkout afterwards. */
  addPetHref: string;
};

const LEASH_OPTIONS = [
  "Y-front harness + 3 m long line (ready at home)",
  "Classic flat collar",
  "Retractable leash",
];
const REACTION_OPTIONS = [
  "Friendly but excitable (pulls to say hello)",
  "Calm and keeps to themselves",
  "Wary of cats / may bark",
  "Reactive to other dogs (keep a distance)",
];

type Brand = "Visa" | "Mastercard" | "Amex";
const BRANDS: Brand[] = ["Visa", "Mastercard", "Amex"];

function detectBrand(digits: string): Brand | null {
  if (/^4/.test(digits)) return "Visa";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "Mastercard";
  return null;
}

function formatCard(digits: string, brand: Brand | null) {
  if (brand === "Amex") return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(" ");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

function expiryValid(v: string) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

function petDetails(p: Pet) {
  const parts: string[] = [];
  if (p.sex) parts.push(p.sex === "FEMALE" ? "Female" : "Male");
  if (p.neutered) parts.push(p.sex === "FEMALE" ? "Spayed" : "Neutered");
  if (p.rabiesVaccinated) parts.push("Rabies & core vaccines up to date");
  if (p.microchip) parts.push(`Microchip: ${p.microchip}`);
  return parts.join(" • ");
}

function defaultFeeding(p: Pet | undefined, hasAllergy: boolean) {
  const name = p?.name ?? "your pet";
  return hasAllergy
    ? `Please only give the lamb treats packed in ${name}'s bag — no more than 2 per walk.`
    : `Treats are packed in ${name}'s bag — no more than 2 per walk, please.`;
}

const inlineInput =
  "w-full bg-transparent rounded-md px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline";

export function CheckoutForm({ sitter, service, pets, initialPetId, schedule, owner, taxRateBps, fees, addPetHref, earnRateBps }: Props) {
  const [state, formAction, pending] = useActionState(createBooking.bind(null, sitter.slug), undefined);
  const [petId, setPetId] = useState(initialPetId);
  const [petMenuOpen, setPetMenuOpen] = useState(false);
  const petMenuRef = useRef<HTMLDivElement>(null);
  const canUsePoints = owner.wagPointsCents > 0;
  const [applyPoints, setApplyPoints] = useState(canUsePoints);
  const [cardDigits, setCardDigits] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const pet = pets.find((p) => p.id === petId);
  const warning = pet?.traits.find((t) => t.tone === "warning");
  const brand = detectBrand(cardDigits);
  const maxLen = brand === "Amex" ? 15 : 16;

  // One booking row per weekly occurrence, each with its own amounts; WagPoints apply to the first only.
  const price = useMemo(
    () =>
      priceBooking({
        unitPriceCents: service.unitPriceCents,
        quantity: schedule.quantity,
        taxRateBps,
        fees,
        applyWagPoints: applyPoints && canUsePoints,
        wagPointsBalanceCents: owner.wagPointsCents,
      }),
    [service.unitPriceCents, schedule.quantity, taxRateBps, fees, applyPoints, canUsePoints, owner.wagPointsCents],
  );
  const perVisit = useMemo(
    () => priceBooking({ unitPriceCents: service.unitPriceCents, quantity: schedule.quantity, taxRateBps, fees }),
    [service.unitPriceCents, schedule.quantity, taxRateBps, fees],
  );
  const series = schedule.weeks > 1;
  const totalCents = price.totalCents + perVisit.totalCents * (schedule.weeks - 1);
  const pointsOff = Math.min(fees.wagPointsDiscountCents, owner.wagPointsCents);
  const total = formatMoney(totalCents, { exact: true });
  const unavailable = schedule.conflicts.length > 0;
  const stay = service.type === "BOARDING" || service.type === "DAY_CARE";

  useEffect(() => {
    if (!petMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (!petMenuRef.current?.contains(e.target as Node)) setPetMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [petMenuOpen]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    let msg: string | null = null;
    if (!pet) msg = "Please add a pet to your profile before booking.";
    else if (!brand) msg = "Please enter a Visa, Mastercard or Amex card number.";
    else if (cardDigits.length !== maxLen || !luhn(cardDigits)) msg = "That card number doesn't look right — please check it.";
    else if (!expiryValid(expiry)) msg = "Please enter a valid expiry date (MM/YY).";
    else if (!new RegExp(`^\\d{${brand === "Amex" ? 4 : 3}}$`).test(cvc)) msg = `Please enter the ${brand === "Amex" ? 4 : 3}-digit security code.`;
    setClientError(msg);
    if (msg) e.preventDefault();
  }

  const error = clientError ?? state?.error;
  const unitWord = service.type === "DOG_WALKING" ? "walks" : "bookings";

  return (
    <form action={formAction} onSubmit={onSubmit} className="w-full max-w-[1240px] mx-auto px-margin-mobile md:px-margin py-space-lg md:py-space-xl">
      <input type="hidden" name="serviceId" value={service.id} />
      <input type="hidden" name="petId" value={petId} />
      <input type="hidden" name="date" value={schedule.date} />
      {schedule.endDate && <input type="hidden" name="endDate" value={schedule.endDate} />}
      <input type="hidden" name="slot" value={schedule.slot} />
      {schedule.recurring && <input type="hidden" name="recurring" value="1" />}
      {schedule.recurring && <input type="hidden" name="weeks" value={schedule.weeks} />}
      {schedule.meet && <input type="hidden" name="meet" value="1" />}
      {brand && <input type="hidden" name="cardBrand" value={brand} />}
      <input type="hidden" name="cardLast4" value={cardDigits.slice(-4)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg md:gap-space-xl items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-lg md:gap-space-xl min-w-0">
          {/* 1. Selected pet */}
          <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-xl">pets</span>
                </div>
                <h2 className="font-title-md text-title-md text-on-surface">Who&apos;s Getting the Care?</h2>
              </div>
              {pets.length > 0 && (
                <div className="relative" ref={petMenuRef}>
                  <button
                    aria-expanded={petMenuOpen}
                    aria-haspopup="listbox"
                    className="text-primary hover:text-on-primary-fixed-variant font-label-md text-label-md transition-colors flex items-center gap-1 whitespace-nowrap"
                    onClick={() => setPetMenuOpen((o) => !o)}
                    type="button"
                  >
                    <span>Change Pet</span>
                    <span className="material-symbols-outlined text-sm">swap_horiz</span>
                  </button>
                  {petMenuOpen && (
                    <ul
                      className="absolute right-0 top-full mt-2 z-20 min-w-[220px] bg-surface-container-lowest rounded-xl shadow-md p-space-xs flex flex-col gap-0.5"
                      role="listbox"
                    >
                      {pets.map((p) => (
                        <li key={p.id}>
                          <button
                            aria-selected={p.id === petId}
                            className={`w-full flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg text-left font-label-md text-label-md transition-colors ${
                              p.id === petId ? "bg-primary/10 text-primary" : "text-on-surface hover:bg-surface-container"
                            }`}
                            onClick={() => {
                              setPetId(p.id);
                              setPetMenuOpen(false);
                            }}
                            role="option"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-base">{p.species === "CAT" ? "pets" : "sound_detection_dog_barking"}</span>
                            <span className="flex-1">
                              {p.name}
                              {p.breed && <span className="block font-body-sm text-body-sm text-on-surface-variant">{p.breed}</span>}
                            </span>
                            {p.id === petId && <span className="material-symbols-outlined text-base">check</span>}
                          </button>
                        </li>
                      ))}
                      <li className="border-t border-surface-container-high mt-0.5 pt-0.5">
                        <Link
                          className="w-full flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg font-label-md text-label-md text-primary hover:bg-surface-container transition-colors"
                          href={addPetHref}
                        >
                          <span className="material-symbols-outlined text-base">add_circle</span>
                          Add a new pet
                        </Link>
                      </li>
                    </ul>
                  )}
                </div>
              )}
            </div>

            {pet ? (
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col sm:flex-row items-center gap-space-md">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 shadow-sm relative bg-primary-fixed flex items-center justify-center">
                  {pet.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={`${pet.name}, ${pet.breed ?? "pet"}`} className="w-full h-full object-cover" src={pet.photoUrl} />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-5xl">pets</span>
                  )}
                  {pet.microchip && (
                    <span className="absolute bottom-1 right-1 bg-surface-container-lowest/90 px-1.5 py-0.5 rounded-full font-label-sm text-label-sm text-primary flex items-center gap-0.5 shadow-sm">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      Chipped
                    </span>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-space-xs text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-space-xs">
                    <span className="font-headline-sm text-headline-sm text-on-surface">{pet.name}</span>
                    {pet.breed && (
                      <span className="bg-primary/10 text-primary px-space-sm py-0.5 rounded-full font-label-sm text-label-sm">{pet.breed}</span>
                    )}
                    {pet.ageYears != null && (
                      <span className="bg-surface-container text-on-surface-variant px-space-sm py-0.5 rounded-full font-label-sm text-label-sm">
                        {pet.ageYears} {pet.ageYears === 1 ? "yr" : "yrs"}
                      </span>
                    )}
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{petDetails(pet)}</p>
                  {pet.traits.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-space-xs pt-space-xs">
                      {pet.traits.map((t) => (
                        <span
                          className={`px-space-sm py-0.5 font-label-sm text-label-sm rounded-full flex items-center gap-1 ${
                            t.tone === "warning"
                              ? "bg-error-container text-on-error-container"
                              : t.tone === "primary"
                                ? "bg-primary/10 text-primary"
                                : "bg-surface-container-highest/80 text-on-surface-variant"
                          }`}
                          key={t.id}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                <span>You haven&apos;t added any pets yet. Add a pet to your profile to continue booking.</span>
                <Link
                  className="inline-flex items-center justify-center gap-1 h-9 px-space-md rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors whitespace-nowrap"
                  href={addPetHref}
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Add a new pet
                </Link>
              </div>
            )}

            {/* Contact & vet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
              <div className="bg-surface-container p-space-md rounded-xl flex flex-col gap-space-xs">
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-base text-secondary">emergency</span>
                  Emergency Contact Number
                </span>
                <div className="flex items-center gap-space-sm mt-1">
                  <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-sm">call</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      aria-label="Emergency contact phone"
                      className={`font-label-lg text-label-lg text-on-surface ${inlineInput}`}
                      defaultValue="+1 (416) 555-0163"
                      name="emergencyPhone"
                      placeholder="Phone number"
                      type="tel"
                    />
                    <input
                      aria-label="Emergency contact name"
                      className={`font-body-sm text-body-sm text-on-surface-variant ${inlineInput}`}
                      defaultValue="Daniel Young (secondary contact – brother)"
                      name="emergencyName"
                      placeholder="Contact name"
                      type="text"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-surface-container p-space-md rounded-xl flex flex-col gap-space-xs">
                <span className="font-label-sm text-label-sm uppercase font-bold text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-base text-primary">local_hospital</span>
                  Your Veterinary Clinic
                </span>
                <div className="flex items-center gap-space-sm mt-1">
                  <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-sm">health_and_safety</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      aria-label="Vet clinic"
                      className={`font-label-lg text-label-lg text-on-surface ${inlineInput}`}
                      defaultValue="Kew Paws Veterinary Clinic"
                      name="vetClinic"
                      placeholder="Clinic name"
                      type="text"
                    />
                    <input
                      aria-label="Vet name and phone"
                      className={`font-body-sm text-body-sm text-on-surface-variant ${inlineInput}`}
                      defaultValue="Dr. Kevin Walsh • (416) 555-0187"
                      name="vetPhone"
                      placeholder="Vet name & phone"
                      type="text"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Care instructions */}
          <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm pb-space-xs">
              <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-xl">checklist</span>
              </div>
              <div>
                <h2 className="font-title-md text-title-md text-on-surface">Care &amp; Walk Instructions</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Your sitter {sitter.firstName} will follow these guidelines before heading out with {pet?.name ?? "your pet"}.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1" htmlFor="leash">
                  <span className="material-symbols-outlined text-base text-primary">hiking</span>
                  Leash &amp; Gear Preference
                </label>
                <Select
                  className="w-full h-12 pl-space-md pr-10 rounded-xl bg-surface-container-lowest font-body-md text-body-md text-on-surface text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  defaultValue={LEASH_OPTIONS[0]}
                  id="leash"
                  name="leashPreference"
                  options={LEASH_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1" htmlFor="reaction">
                  <span className="material-symbols-outlined text-base text-primary">diversity_1</span>
                  Reaction to Other Animals
                </label>
                <Select
                  className="w-full h-12 pl-space-md pr-10 rounded-xl bg-surface-container-lowest font-body-md text-body-md text-on-surface text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  defaultValue={REACTION_OPTIONS[0]}
                  id="reaction"
                  name="otherAnimalsReaction"
                  options={REACTION_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-space-xs">
              <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1" htmlFor="feeding">
                <span className="material-symbols-outlined text-base text-primary">restaurant</span>
                Feeding &amp; Treat Rules
              </label>
              <div className="bg-surface-container-low p-space-md rounded-xl flex items-start gap-space-sm">
                <span className={`material-symbols-outlined text-xl mt-0.5 ${warning ? "text-secondary" : "text-primary"}`}>info</span>
                <div className="flex-1 text-on-surface-variant font-body-sm text-body-sm leading-relaxed">
                  {warning && <strong className="text-secondary font-semibold block">{plainTrait(warning.label)} — please take note! </strong>}
                  <textarea
                    className="w-full bg-transparent resize-none rounded-md px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed [field-sizing:content]"
                    defaultValue={defaultFeeding(pet, !!warning)}
                    id="feeding"
                    key={petId}
                    name="feedingRules"
                    rows={1}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs">
              <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1" htmlFor="care-notes">
                <span className="material-symbols-outlined text-base text-primary">edit_note</span>
                Special Notes &amp; Message to Your Sitter
              </label>
              <textarea
                className="w-full p-space-md rounded-xl bg-surface-container-lowest font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-outline"
                defaultValue="Please don't let him off-leash on the grass at Kew Gardens — always keep him on the long line. There's a water bowl in the backpack; he loves a drink when you rest around the 20-minute mark."
                id="care-notes"
                name="notes"
                placeholder="e.g. Never off-leash at the park. We'd love it if you wiped his paws with the damp cloth by the door when you get back…"
                rows={3}
              />
            </div>

            <div className="bg-surface-container p-space-md rounded-xl flex items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">explore</span>
                </div>
                <div>
                  <div className="font-label-lg text-label-lg text-on-surface">Live GPS Tracking &amp; Photo Updates</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">
                    Get a live map of the route plus at least 3 adorable photos or videos, sent by text and in the app.
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input aria-label="Live GPS tracking and photo updates" className="sr-only peer" defaultChecked name="gpsUpdates" type="checkbox" />
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </section>

          {/* 3. Payment */}
          <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-lg">
            <div className="flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">credit_card</span>
                </div>
                <h2 className="font-title-md text-title-md text-on-surface">Secure Payment Method</h2>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-space-sm py-1 rounded-full font-label-sm text-label-sm font-semibold">
                <span className="material-symbols-outlined text-sm">lock</span>
                256-Bit SSL &amp; 3D Secure
              </div>
            </div>

            <div className="bg-secondary-fixed/50 p-space-md rounded-xl flex flex-wrap items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-base">savings</span>
                </div>
                <div>
                  <span className="font-label-lg text-label-lg text-on-surface block">WagPoints Wallet</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Available balance:{" "}
                    <strong className="text-secondary font-bold">{formatMoney(owner.wagPointsCents, { exact: true })}</strong>
                  </span>
                </div>
              </div>
              <label
                className={`flex items-center gap-space-xs bg-surface-container-lowest px-space-md py-space-xs rounded-full shadow-sm transition-all ${
                  canUsePoints ? "cursor-pointer hover:bg-surface-container" : "opacity-60 cursor-not-allowed"
                }`}
              >
                <input
                  checked={applyPoints && canUsePoints}
                  className="accent-primary w-4 h-4 rounded"
                  disabled={!canUsePoints}
                  id="use-points"
                  name="applyWagPoints"
                  onChange={(e) => setApplyPoints(e.target.checked)}
                  type="checkbox"
                />
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Apply {formatMoney(canUsePoints ? pointsOff : fees.wagPointsDiscountCents, { exact: true })} off
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="card-holder">
                  Cardholder Name
                </label>
                <input
                  autoComplete="cc-name"
                  className="w-full h-12 px-space-md rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  defaultValue={owner.fullName}
                  id="card-holder"
                  name="cardholderName"
                  placeholder="Full name"
                  required
                  type="text"
                />
              </div>
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" htmlFor="card-number">
                  <span>Card Number</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-2">
                    {BRANDS.map((b) => (
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-bold transition-colors ${
                          brand === b ? "bg-primary text-on-primary" : "bg-surface-container"
                        }`}
                        key={b}
                      >
                        {b}
                      </span>
                    ))}
                  </span>
                </label>
                <div className="relative">
                  {/* No `name`: the full number never leaves the browser. */}
                  <input
                    autoComplete="cc-number"
                    className="w-full h-12 pl-space-md pr-12 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm tracking-wide placeholder:text-outline"
                    id="card-number"
                    inputMode="numeric"
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setCardDigits(digits.slice(0, detectBrand(digits) === "Amex" ? 15 : 16));
                    }}
                    placeholder="1234 5678 9012 3456"
                    type="text"
                    value={formatCard(cardDigits, brand)}
                  />
                  <span className="material-symbols-outlined absolute right-3.5 top-3 text-primary">credit_card</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-semibold" htmlFor="card-expiry">
                    Expiry Date
                  </label>
                  <input
                    autoComplete="cc-exp"
                    className="w-full h-12 px-space-md rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-center placeholder:text-outline"
                    id="card-expiry"
                    inputMode="numeric"
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                    }}
                    placeholder="MM/YY"
                    type="text"
                    value={expiry}
                  />
                </div>
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between" htmlFor="card-cvv">
                    <span>CVV / CVC</span>
                    <span
                      className="material-symbols-outlined text-sm text-on-surface-variant cursor-help"
                      title="The 3-digit security code on the back of your card (4 digits on the front for Amex)"
                    >
                      help_outline
                    </span>
                  </label>
                  <input
                    autoComplete="cc-csc"
                    className="w-full h-12 px-space-md rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-center placeholder:text-outline"
                    id="card-cvv"
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder={brand === "Amex" ? "4 digits" : "3 digits"}
                    type="password"
                    value={cvc}
                  />
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low p-space-md rounded-xl flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-primary text-xl mt-0.5">event_available</span>
              <div>
                <div className="font-label-md text-label-md text-primary font-bold">Flexible Cancellation Policy</div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Cancel in one tap for a 100% refund, no fees, up to 24 hours before your <strong>{schedule.cancelLabel}</strong> start time.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: summary */}
        <div className="lg:col-span-4 lg:sticky top-24 flex flex-col gap-space-md min-w-0 scroll-mt-24" id="booking-summary">
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-md flex flex-col gap-space-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface pb-space-xs">Booking Summary</h2>
            <div className="bg-surface-container-low p-space-md rounded-xl flex items-center gap-space-md">
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 ring-2 ring-primary relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={sitter.displayName} className="w-full h-full object-cover" src={sitter.avatarUrl} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <Link className="hover:text-primary transition-colors truncate" href={`/sitters/${sitter.slug}`}>
                    <h3 className="font-title-md text-title-md text-on-surface font-bold truncate">{sitter.displayName}</h3>
                  </Link>
                  <span className="material-symbols-outlined text-primary text-base" title="Verified sitter">
                    verified
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                  <span className="flex items-center text-tertiary-container font-bold">★ {formatRating(sitter.rating)}</span>
                  {sitter.isSuperSitter && (
                    <>
                      <span>•</span>
                      <span className="bg-secondary/10 text-secondary px-1.5 py-0.5 rounded font-semibold text-xs">Super Sitter</span>
                    </>
                  )}
                </div>
                <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  {sitter.completedBookings}+ {unitWord} completed
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-space-sm py-space-xs font-body-sm text-body-sm">
              <div className="flex items-start gap-space-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">{SERVICE_ICONS[service.type] ?? "pets"}</span>
                <div>
                  <span className="font-semibold text-on-surface block">Service</span>
                  <span>{service.line}</span>
                </div>
              </div>
              <div className="flex items-start gap-space-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">calendar_month</span>
                <div>
                  <span className="font-semibold text-on-surface block">Date &amp; Time</span>
                  <span>{schedule.dateLabel}</span>
                  <span className="block text-primary font-medium">{schedule.timeLabel}</span>
                  {schedule.seriesLabel && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">repeat</span>
                      {schedule.seriesLabel}
                    </span>
                  )}
                  {schedule.meet && <span className="block">Free Meet &amp; Greet requested</span>}
                  <Link className="inline-flex items-center gap-0.5 text-primary font-semibold hover:underline mt-0.5" href={schedule.changeHref}>
                    <span className="material-symbols-outlined text-sm">edit_calendar</span>
                    Change dates
                  </Link>
                </div>
              </div>
              {unavailable && (
                <div className="flex items-start gap-space-xs p-space-sm rounded-xl bg-error-container/70 text-on-error-container" role="alert">
                  <span className="material-symbols-outlined text-lg">event_busy</span>
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="font-semibold">
                      {schedule.occurrenceCount > 1
                        ? `${schedule.conflicts.length} of ${schedule.occurrenceCount} weekly dates aren't available`
                        : "This time isn't available"}
                    </span>
                    {schedule.conflicts.slice(0, 6).map((c) => (
                      <span key={c.date}>{schedule.occurrenceCount > 1 ? `${c.date}: ${c.error}` : c.error}</span>
                    ))}
                    {schedule.conflicts.length > 6 && <span>and {schedule.conflicts.length - 6} more</span>}
                  </div>
                </div>
              )}
              <div className="flex items-start gap-space-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-lg mt-0.5">location_on</span>
                <div className="flex-1 min-w-0">
                  <label className="font-semibold text-on-surface block" htmlFor="meeting-address">
                    Meeting &amp; Drop-off Address
                  </label>
                  <textarea
                    className="w-full bg-transparent resize-none rounded-md px-1 -mx-1 focus:outline-none focus:ring-2 focus:ring-primary"
                    defaultValue="1820 Queen St E, Unit 4, The Beaches, Toronto, ON M4L 1G9"
                    id="meeting-address"
                    name="meetingAddress"
                    required
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-surface-container-high my-space-xs" />

            <div className="flex flex-col gap-space-xs">
              {series && (
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                  Per {stay ? "booking" : "visit"} · {schedule.weeks} weekly occurrences
                </span>
              )}
              <div className="flex justify-between items-center gap-space-sm font-body-md text-body-md text-on-surface-variant">
                <span>{stay ? `${schedule.quantityLabel} × ${formatMoney(service.unitPriceCents, { exact: true })}` : `1x ${service.line}`}</span>
                <span className="font-semibold text-on-surface">{formatMoney(price.subtotalCents, { exact: true })}</span>
              </div>
              <div className="flex justify-between items-center gap-space-sm font-body-md text-body-md text-on-surface-variant">
                <span className="flex items-center gap-1">
                  WagShield Vet Protection
                  <span
                    className="material-symbols-outlined text-xs text-primary"
                    title={`Emergency vet care coverage up to ${formatMoney(fees.vetCoverageCents)}`}
                  >
                    help_outline
                  </span>
                </span>
                <span className="font-semibold text-on-surface">{formatMoney(price.protectionFeeCents, { exact: true })}</span>
              </div>
              <div className="flex justify-between items-center gap-space-sm font-body-md text-body-md text-on-surface-variant">
                <span>Platform Service Fee</span>
                <span className="font-semibold text-on-surface">{formatMoney(price.serviceFeeCents, { exact: true })}</span>
              </div>
              {price.discountCents > 0 && (
                <div className="flex justify-between items-center gap-space-sm font-body-md text-body-md text-secondary font-medium">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">local_offer</span>
                    WagPoints Discount{series ? " (first visit)" : ""}
                  </span>
                  <span>-{formatMoney(price.discountCents, { exact: true })}</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-space-sm font-body-md text-body-md text-on-surface-variant">
                <span>HST ({taxRateBps / 100}%)</span>
                <span className="font-semibold text-on-surface">{formatMoney(price.taxCents, { exact: true })}</span>
              </div>
              {series && (
                <>
                  <div className="flex justify-between items-center gap-space-sm font-body-md text-body-md text-on-surface border-t border-surface-container-high pt-space-xs">
                    <span>First {stay ? "booking" : "visit"}</span>
                    <span className="font-semibold">{formatMoney(price.totalCents, { exact: true })}</span>
                  </div>
                  <div className="flex justify-between items-center gap-space-sm font-body-md text-body-md text-on-surface">
                    <span>
                      {schedule.weeks - 1} more × {formatMoney(perVisit.totalCents, { exact: true })}
                    </span>
                    <span className="font-semibold">{formatMoney(perVisit.totalCents * (schedule.weeks - 1), { exact: true })}</span>
                  </div>
                </>
              )}
            </div>

            <div className="bg-surface-container p-space-md rounded-xl flex justify-between items-baseline gap-space-sm mt-space-xs">
              <div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold block">Total Due</span>
                <span className="font-label-sm text-label-sm text-primary font-medium">
                  {series ? `${schedule.weeks} weekly ${stay ? "bookings" : "visits"} · incl. HST` : "Incl. HST & WagShield"}
                </span>
              </div>
              <div className="font-headline-lg text-headline-lg text-primary font-extrabold tracking-tight">{total}</div>
            </div>
            <EarnPointsNote className="justify-center -mt-space-xs" earnRateBps={earnRateBps} subtotalCents={price.subtotalCents} />

            <button
              className="w-full py-4 px-space-lg rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg font-bold shadow-md hover:bg-secondary-container hover:text-on-secondary-container hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-space-sm group disabled:opacity-70 disabled:pointer-events-none"
              disabled={pending || !pet || unavailable}
              id="pay-button"
              type="submit"
            >
              <span className="material-symbols-outlined text-xl transition-transform group-hover:scale-110">
                {pending ? "progress_activity" : "shield_lock"}
              </span>
              <span>{pending ? "Processing…" : `Confirm & Pay (${total}) 🐾`}</span>
            </button>
            {error && (
              <div className="font-body-sm text-body-sm text-error text-center flex flex-col items-center gap-0.5" role="alert">
                <p className="flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </p>
                {!clientError && state?.conflicts?.map((c) => <span key={c}>{c}</span>)}
              </div>
            )}
            <p className="font-label-sm text-label-sm text-center text-on-surface-variant/80">
              By clicking &lsquo;Confirm &amp; Pay&rsquo;, you agree to our{" "}
              <Link className="underline hover:text-primary" href="#">
                Terms of Service
              </Link>
              .
            </p>

            <div className="flex flex-col gap-space-xs pt-space-xs">
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-primary text-base">verified_user</span>
                <span>100% Money-Back Guarantee</span>
              </div>
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-primary text-base">local_hospital</span>
                <span>Up to {formatMoney(fees.vetCoverageCents)} Emergency Vet Coverage</span>
              </div>
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-primary text-base">support_agent</span>
                <span>24/7 Pet Parent Support Line</span>
              </div>
            </div>
          </div>
          <div className="bg-primary/5 p-space-md rounded-2xl flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-xl">favorite</span>
            </div>
            <div className="font-body-sm text-body-sm text-on-surface-variant">
              Every booking helps us donate shelter and food to a rescue pet in need.
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: the summary and pay button sit below a long form — keep the total and a way there in reach. */}
      <MobileStickyBar targetId="booking-summary">
        <div className="flex flex-col min-w-0">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">Total due</span>
          <span className="font-headline-sm text-headline-sm text-primary leading-tight">{total}</span>
        </div>
        <button
          className={STICKY_BAR_BTN}
          onClick={() => document.getElementById("booking-summary")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">shield_lock</span>
          Review &amp; Pay
        </button>
      </MobileStickyBar>
    </form>
  );
}
