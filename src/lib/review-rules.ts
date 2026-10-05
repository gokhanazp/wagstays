// Shared (client + server) rules for two-way reviews.
import { createTranslator } from "next-intl";
import en from "../../messages/en/sitter.json";
import fr from "../../messages/fr/sitter.json";

/** Sitter reply to a public review. */
export const REPLY_MAX = 600;
/** A sitter can edit their reply for this long after first posting it. */
export const REPLY_EDIT_WINDOW_MS = 7 * 86_400_000;

/** Quick tags a sitter can add to their private rating of a pet parent. */
export const OWNER_REVIEW_TAGS = [
  "Clear instructions",
  "On time",
  "Pet as described",
  "Great communication",
  "Welcoming home",
  "Would sit again",
] as const;
export const OWNER_NOTE_MAX = 500;

const OWNER_TAG_KEYS: Record<(typeof OWNER_REVIEW_TAGS)[number], keyof typeof en.lib.ownerTags> = {
  "Clear instructions": "clearInstructions",
  "On time": "onTime",
  "Pet as described": "petAsDescribed",
  "Great communication": "greatCommunication",
  "Welcoming home": "welcomingHome",
  "Would sit again": "wouldSitAgain",
};

/** Localized label of a stored owner-review tag (tags are stored in English); unknown text is returned as is. */
export function ownerTagLabel(tag: string, locale = "en") {
  const key = OWNER_TAG_KEYS[tag as (typeof OWNER_REVIEW_TAGS)[number]];
  if (!key) return tag;
  return createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { sitter: locale === "fr" ? fr : en }, namespace: "sitter.lib.ownerTags" })(key);
}

export function canEditReply(repliedAt: Date | null, now = Date.now()) {
  return !!repliedAt && now - repliedAt.getTime() <= REPLY_EDIT_WINDOW_MS;
}

/** Tags are stored as the first line of the private note: "Clear instructions · On time". */
export function composeOwnerNote(tags: string[], note: string | null) {
  const line = tags.join(" · ");
  return [line, note ?? ""].filter((s) => s.trim()).join("\n") || null;
}

export function splitOwnerNote(body: string | null): { tags: string[]; note: string } {
  if (!body) return { tags: [], note: "" };
  const [first, ...rest] = body.split("\n");
  const parts = first.split(" · ");
  if (parts.length && parts.every((p) => (OWNER_REVIEW_TAGS as readonly string[]).includes(p))) {
    return { tags: parts, note: rest.join("\n") };
  }
  return { tags: [], note: body };
}
