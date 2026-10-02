// Shared (client + server) rules for sitter-application uploads to the private "documents" bucket.

export const APPLICATION_FILE_KINDS = ["ID_DOCUMENT", "BACKGROUND_CHECK", "HOME_PHOTO"] as const;
export type ApplicationFileKind = (typeof APPLICATION_FILE_KINDS)[number];

export const APPLICATION_FILE_RULES: Record<ApplicationFileKind, { types: string[]; maxBytes: number; label: string }> = {
  ID_DOCUMENT: { types: ["application/pdf", "image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024, label: "Government ID" },
  BACKGROUND_CHECK: { types: ["application/pdf", "image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024, label: "Police check" },
  HOME_PHOTO: { types: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10 * 1024 * 1024, label: "Home photo" },
};

export const MAX_HOME_PHOTOS = 9;

/** Uploaded file reference posted with the application form (JSON in a hidden input). */
export type UploadedFile = { kind: ApplicationFileKind; path: string; fileName: string; contentType: string; sizeBytes: number };

export const applicationFolder = (draftId: string) => `applications/${draftId}/`;
