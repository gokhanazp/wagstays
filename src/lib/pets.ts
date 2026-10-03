// Shared pet display helpers (client + server safe).

export const SPECIES_LABELS: Record<string, string> = { DOG: "Dog", CAT: "Cat", OTHER: "Other pet" };

/** Popular "other" pets offered as quick picks in the pet form. */
export const OTHER_SPECIES_SUGGESTIONS = ["Rabbit", "Guinea Pig", "Hamster", "Bird", "Ferret", "Reptile", "Fish"];

/** "Dog", "Cat", or what the owner typed for other pets ("Rabbit"). */
export function petKindLabel(pet: { species: string; speciesOther?: string | null }) {
  if (pet.species === "OTHER") return pet.speciesOther?.trim() || SPECIES_LABELS.OTHER;
  return SPECIES_LABELS[pet.species] ?? pet.species;
}
