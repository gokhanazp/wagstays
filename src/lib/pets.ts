// Shared pet display helpers (client + server safe). Optional `locale` params translate via messages/{en,fr}/booking.json.

import { bookingT } from "./booking-messages";

export const SPECIES_LABELS: Record<string, string> = { DOG: "Dog", CAT: "Cat", OTHER: "Other pet" };

/* ───────────────────────────── Pet kinds ─────────────────────────────
 * The kinds of animal a sitter can care for (SitterSpecies.kind, SitterApplication.acceptedKinds and the
 * search `pets=` param). A Pet stores DOG | CAT | OTHER (+ free-text speciesOther); petKindOf() maps it here.
 */
export const PET_KINDS = ["DOG", "CAT", "RABBIT", "GUINEA_PIG", "HAMSTER", "BIRD", "FERRET", "REPTILE", "FISH", "OTHER"] as const;
export type PetKind = (typeof PET_KINDS)[number];

export const PET_KIND_META: Record<PetKind, { label: string; plural: string; icon: string }> = {
  DOG: { label: "Dog", plural: "dogs", icon: "sound_detection_dog_barking" },
  CAT: { label: "Cat", plural: "cats", icon: "pets" },
  RABBIT: { label: "Rabbit", plural: "rabbits", icon: "cruelty_free" },
  GUINEA_PIG: { label: "Guinea Pig", plural: "guinea pigs", icon: "pest_control_rodent" },
  HAMSTER: { label: "Hamster", plural: "hamsters", icon: "pest_control_rodent" },
  BIRD: { label: "Bird", plural: "birds", icon: "raven" },
  FERRET: { label: "Ferret", plural: "ferrets", icon: "pets" },
  REPTILE: { label: "Reptile", plural: "reptiles", icon: "egg" },
  FISH: { label: "Fish", plural: "fish", icon: "set_meal" },
  OTHER: { label: "Other pets", plural: "other pets", icon: "pet_supplies" },
};

export const isPetKind = (v: unknown): v is PetKind => typeof v === "string" && (PET_KINDS as readonly string[]).includes(v);

/** Keeps known kinds only, de-duplicated, in canonical PET_KINDS order. */
export function normalizeKinds(values: Iterable<unknown>): PetKind[] {
  const set = new Set<unknown>(values);
  return PET_KINDS.filter((k) => set.has(k));
}

/** Popular "other" pets offered as quick picks in the pet form (labels of the non-dog/cat kinds). */
export const OTHER_SPECIES_SUGGESTIONS = PET_KINDS.filter((k) => k !== "DOG" && k !== "CAT" && k !== "OTHER").map((k) => PET_KIND_META[k].label);
/** OTHER_SPECIES_SUGGESTIONS in the UI language (fr: "Lapin", "Cochon d'Inde"…; kindFromText() understands both). */
export const otherSpeciesSuggestions = (locale = "en") =>
  PET_KINDS.filter((k) => k !== "DOG" && k !== "CAT" && k !== "OTHER").map((k) => petKindName(k, locale));

/** "Rabbit" / fr "Lapin" — PET_KIND_META[kind].label in the UI language. */
export function petKindName(kind: PetKind, locale = "en") {
  return bookingT(locale)(`pets.kind.${kind}`);
}

// Free-text → kind. Matched on whole words after lower-casing, removing accents and stripping punctuation;
// plurals are handled by also trying each typed word without a trailing "s" / "es" / "ies" (French plurals
// in "x" are listed). English and French names are both understood.
const SYNONYMS: [PetKind, string[]][] = [
  ["GUINEA_PIG", ["guinea pig", "guineapig", "cavy", "cavie", "cavies", "cochon d inde", "cochons d inde", "cobaye"]],
  ["RABBIT", ["rabbit", "bunny", "bunnies", "hare", "lop", "lapin", "lievre"]],
  ["HAMSTER", ["hamster", "gerbil", "mouse", "mice", "rat", "chinchilla", "degu", "gerbille", "souris"]],
  ["BIRD", ["bird", "parrot", "budgie", "budgerigar", "parakeet", "cockatiel", "cockatoo", "canary", "finch", "lovebird", "conure", "macaw", "dove", "pigeon", "chicken", "hen", "oiseau", "oiseaux", "perroquet", "perruche", "canari", "poule"]],
  ["FERRET", ["ferret", "furet"]],
  ["REPTILE", ["reptile", "lizard", "snake", "turtle", "tortoise", "gecko", "iguana", "chameleon", "python", "boa", "bearded dragon", "dragon", "skink", "frog", "amphibian", "axolotl", "lezard", "serpent", "tortue", "grenouille", "cameleon", "iguane"]],
  ["FISH", ["fish", "goldfish", "betta", "guppy", "koi", "aquarium", "tetra", "poisson"]],
  ["DOG", ["dog", "puppy", "puppies", "pup", "chien", "chiot"]],
  ["CAT", ["cat", "kitten", "kitty", "chat", "chaton"]],
];

/** A word plus its likely singular forms ("bunnies" → bunny, "tortoises" → tortoise, "fishes" → fish). */
function forms(w: string) {
  const out = [w];
  if (w.length > 4 && w.endsWith("ies")) out.push(`${w.slice(0, -3)}y`);
  if (w.length > 3 && w.endsWith("es")) out.push(w.slice(0, -2));
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) out.push(w.slice(0, -1));
  return out;
}

/** Maps what an owner typed for an "other" pet ("Bunnies", " guinea pig ", "Leopard gecko") to a PetKind. */
export function kindFromText(text: string | null | undefined): PetKind {
  const words = (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(forms);
  if (!words.length) return "OTHER";
  const has = (name: string) => {
    const parts = name.split(" ");
    return words.some((_, i) => parts.every((part, j) => words[i + j]?.includes(part)));
  };
  for (const [kind, names] of SYNONYMS) if (names.some(has)) return kind;
  return "OTHER";
}

/** The PetKind of a pet: DOG / CAT directly, OTHER via its free-text species. */
export function petKindOf(pet: { species: string; speciesOther?: string | null }): PetKind {
  if (pet.species === "DOG") return "DOG";
  if (pet.species === "CAT") return "CAT";
  return kindFromText(pet.speciesOther);
}

/** "Dog", "Cat", or what the owner typed for other pets ("Rabbit"). fr: "Chien", "Chat", "Autre animal". */
export function petKindLabel(pet: { species: string; speciesOther?: string | null }, locale = "en") {
  const t = bookingT(locale);
  if (pet.species === "OTHER") return pet.speciesOther?.trim() || t("pets.otherPet");
  return pet.species === "DOG" || pet.species === "CAT" ? t(`pets.kind.${pet.species}`) : pet.species;
}

/** Plural noun for "Sarah doesn't care for rabbits" (fr: "lapins"). */
export function petKindPlural(kind: PetKind, locale = "en") {
  return bookingT(locale)(`pets.plural.${kind}`);
}

type SitterAcceptance = {
  firstName: string;
  kinds: readonly string[];
  acceptsSmall: boolean;
  acceptsMedium: boolean;
  acceptsLarge: boolean;
  acceptsGiant: boolean;
};

const SIZES = ["SMALL", "MEDIUM", "LARGE", "GIANT"] as const;

/**
 * Why `sitter` can't take `pet` ("Sarah doesn't care for rabbits"), or null when they can.
 * Pass `serviceType` to also apply "dog walking is for dogs". Used by the booking widget, checkout and the
 * booking server action (which is the authority).
 */
export function petBlockReason(
  sitter: SitterAcceptance,
  pet: { name?: string; species: string; speciesOther?: string | null; size?: string | null },
  serviceType?: string,
  locale = "en",
): string | null {
  const t = bookingT(locale);
  const kind = petKindOf(pet);
  if (!sitter.kinds.includes(kind)) return t("pets.notKind", { name: sitter.firstName, kinds: petKindPlural(kind, locale) });
  if (kind === "DOG" && pet.size) {
    const ok = { SMALL: sitter.acceptsSmall, MEDIUM: sitter.acceptsMedium, LARGE: sitter.acceptsLarge, GIANT: sitter.acceptsGiant }[pet.size];
    const size = SIZES.find((s) => s === pet.size);
    if (ok === false && size) return t("pets.size", { name: sitter.firstName, size: t(`pets.sizes.${size}`) });
  }
  if (serviceType === "DOG_WALKING" && kind !== "DOG") return t("pets.dogsOnly");
  return null;
}

/** "Maple", "Maple & Biscuit", "Maple, Biscuit & Rex" (fr: "Maple, Biscuit et Rex") */
export function petNames(names: readonly (string | null | undefined)[], locale = "en") {
  const n = names.filter((x): x is string => !!x);
  if (n.length <= 1) return n[0] ?? "";
  return bookingT(locale)("pets.and", { first: n.slice(0, -1).join(", "), last: n[n.length - 1] });
}

/**
 * The pets of a booking, primary first: the BookingPet rows when present, otherwise the single `pet`
 * (bookings made before multi-pet support).
 */
export function bookingPets<P extends { id: string }>(b: { pet: P; pets?: { pet: P }[] | null }): P[] {
  const rows = (b.pets ?? []).map((r) => r.pet);
  if (!rows.length) return [b.pet];
  return [...rows.filter((p) => p.id === b.pet.id), ...rows.filter((p) => p.id !== b.pet.id)];
}
