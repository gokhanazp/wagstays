// Plain module so client components can reference bucket names without importing server-only code.
export const STORAGE_BUCKETS = {
  /** pet, sitter and avatar photos — public read */
  media: "media",
  /** ID / police-check documents and applicants' home photos — private, served through signed URLs */
  documents: "documents",
} as const;
