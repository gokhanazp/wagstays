import "server-only";
import { z } from "zod";
import { APPLICATION_FILE_KINDS, APPLICATION_FILE_RULES, MAX_HOME_PHOTOS, type UploadedFile } from "./application-files";
import { STORAGE_BUCKETS, createSupabaseAdminClient } from "./supabase/admin";

const FileRef = z.object({
  kind: z.enum(APPLICATION_FILE_KINDS),
  path: z.string().regex(/^applications\/[0-9a-f-]{36}\/[a-z_]+-[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
});

const parseJson = (v: FormDataEntryValue | null) => {
  if (typeof v !== "string" || !v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

/**
 * Reads the uploaded-file references posted by the application form and confirms each object really exists in
 * the private bucket (size/type come from Storage, not the client). All files must share one draft folder.
 */
export async function verifyApplicationFiles(formData: FormData): Promise<{ files: UploadedFile[]; idOk: boolean; backgroundOk: boolean }> {
  const candidates: unknown[] = [parseJson(formData.get("idDocumentFile")), parseJson(formData.get("backgroundCheckFile"))];
  const photos = parseJson(formData.get("homePhotos"));
  if (Array.isArray(photos)) candidates.push(...photos.slice(0, MAX_HOME_PHOTOS));

  const refs = candidates.flatMap((c) => {
    const r = FileRef.safeParse(c);
    return r.success && r.data.path.split("/")[2].startsWith(r.data.kind.toLowerCase()) ? [r.data] : [];
  });
  if (!refs.length) return { files: [], idOk: false, backgroundOk: false };

  const folder = refs[0].path.split("/").slice(0, 2).join("/");
  const sameFolder = refs.filter((r) => r.path.startsWith(`${folder}/`));
  const { data: objects } = await createSupabaseAdminClient().storage.from(STORAGE_BUCKETS.documents).list(folder, { limit: 100 });
  const byName = new Map((objects ?? []).map((o) => [o.name, o]));

  const files = sameFolder.flatMap((r) => {
    const obj = byName.get(r.path.split("/")[2]);
    const size = Number(obj?.metadata?.size ?? 0);
    const type = String(obj?.metadata?.mimetype ?? r.contentType);
    const rule = APPLICATION_FILE_RULES[r.kind];
    if (!obj || !size || size > rule.maxBytes || !rule.types.includes(type)) return [];
    return [{ ...r, sizeBytes: size, contentType: type }];
  });
  // one ID and one police check at most
  const id = files.find((f) => f.kind === "ID_DOCUMENT");
  const bg = files.find((f) => f.kind === "BACKGROUND_CHECK");
  const home = files.filter((f) => f.kind === "HOME_PHOTO");
  return { files: [...(id ? [id] : []), ...(bg ? [bg] : []), ...home], idOk: !!id, backgroundOk: !!bg };
}

/** Short-lived signed URL for admins to view a private application file. */
export async function signedApplicationFileUrl(path: string, seconds = 300) {
  const { data } = await createSupabaseAdminClient().storage.from(STORAGE_BUCKETS.documents).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
