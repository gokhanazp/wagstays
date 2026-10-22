/**
 * localStorage draft for the sitter application form. Only plain form values are stored — never uploaded files,
 * their storage paths, the account email of a signed-in user, or the legal declarations.
 * Every storage access is wrapped: storage can be missing, blocked (private mode) or full.
 */

const PREFIX = "wagstays:apply-draft:v1:";

export const draftKey = (userId: string | null) => `${PREFIX}${userId ? `user:${userId}` : "anon"}`;

export type DraftData = {
  firstName: string;
  lastName: string;
  /** only for signed-out applicants; a signed-in user's email always comes from the account */
  email?: string;
  phone: string;
  neighbourhood: string;
  services: Record<string, { on: boolean; price: string }>;
  experience: string;
  kinds: string[];
  sizes: Record<string, boolean>;
  certs: Record<string, boolean>;
  homeType: string;
  criteria: Record<string, boolean>;
  bio: string;
};

type Stored = { savedAt: number; data: DraftData };

export function loadDraft(key: string): Stored | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (typeof parsed?.savedAt !== "number" || !parsed.data || typeof parsed.data !== "object") return null;
    return parsed as Stored;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, data: DraftData) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data } satisfies Stored));
  } catch {
    // storage unavailable or full — autosave is best effort
  }
}

export function removeDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Drops every application draft in this browser (after a successful submit). */
export function clearAllDrafts() {
  try {
    const ls = window.localStorage;
    const keys: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => ls.removeItem(k));
  } catch {
    // ignore
  }
}

// Type guards for restoring untrusted JSON
export const str = (v: unknown): v is string => typeof v === "string";
export const bool = (v: unknown): v is boolean => typeof v === "boolean";
