// Shared (client + server) rules for two-way reviews.

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
