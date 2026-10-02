"use server";

import { randomUUID } from "node:crypto";
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
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { error: "That file can't be uploaded." };
  const { draftId, kind, contentType, sizeBytes } = parsed.data;
  const rule = APPLICATION_FILE_RULES[kind];
  if (!rule.types.includes(contentType)) return { error: kind === "HOME_PHOTO" ? "Please use a JPG, PNG or WebP image." : "Please upload a PDF, JPG or PNG." };
  if (sizeBytes > rule.maxBytes) return { error: "That file is over 10 MB — please choose a smaller one." };

  const path = `${applicationFolder(draftId)}${kind.toLowerCase()}-${randomUUID()}.${EXT[contentType]}`;
  const { data, error } = await createSupabaseAdminClient().storage.from(STORAGE_BUCKETS.documents).createSignedUploadUrl(path);
  if (error || !data) return { error: "Upload is unavailable right now — please try again." };
  return { path: data.path, token: data.token };
}
