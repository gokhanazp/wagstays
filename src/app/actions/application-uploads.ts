"use server";

import { randomUUID } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { APPLICATION_FILE_KINDS, APPLICATION_FILE_RULES, applicationFolder } from "@/lib/application-files";
import { STORAGE_BUCKETS, createSupabaseAdminClient } from "@/lib/supabase/admin";

const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const Schema = z.object({
  draftId: z.uuid(),
  kind: z.enum(APPLICATION_FILE_KINDS),
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
});

/**
 * Returns a one-time signed upload URL for the private documents bucket so the browser uploads straight to
 * Supabase Storage (no server body limits). The object lives under applications/<draftId>/ and is only linked
 * to an application when the form is submitted (see submitApplication).
 */
export async function createApplicationUploadUrl(input: z.input<typeof Schema>): Promise<{ path: string; token: string } | { error: string }> {
  const t = await getTranslations("apply.uploads");
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { error: t("invalid") };
  const { draftId, kind, contentType, sizeBytes } = parsed.data;
  const rule = APPLICATION_FILE_RULES[kind];
  if (!rule.types.includes(contentType)) return { error: kind === "HOME_PHOTO" ? t("imageType") : t("documentType") };
  if (sizeBytes > rule.maxBytes) return { error: t("tooLarge") };

  const path = `${applicationFolder(draftId)}${kind.toLowerCase()}-${randomUUID()}.${EXT[contentType]}`;
  const { data, error } = await createSupabaseAdminClient().storage.from(STORAGE_BUCKETS.documents).createSignedUploadUrl(path);
  if (error || !data) return { error: t("unavailable") };
  return { path: data.path, token: data.token };
}
