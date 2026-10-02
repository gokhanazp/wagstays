import "server-only";
import { randomUUID } from "node:crypto";
import { STORAGE_BUCKETS, createSupabaseAdminClient } from "./supabase/admin";

// Photos go to the public "media" bucket in Supabase Storage (uploaded server-side with the service role).
const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function saveUpload(file: File, folder: "pets" | "sitters" | "avatars"): Promise<{ url: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "Please choose a file." };
  if (file.size > MAX_BYTES) return { error: "Images must be 5 MB or smaller." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "Please upload a JPG, PNG or WebP image." };

  const storage = createSupabaseAdminClient().storage.from(STORAGE_BUCKETS.media);
  const objectPath = `${folder}/${randomUUID()}.${ext}`;
  const { error } = await storage.upload(objectPath, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { error: "Upload failed — please try again." };
  return { url: storage.getPublicUrl(objectPath).data.publicUrl };
}

/** Removes a previously uploaded media object (ignores seed images under /images). */
export async function deleteUpload(url: string | null | undefined) {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKETS.media}/`;
  const i = url?.indexOf(marker) ?? -1;
  if (!url || i < 0) return;
  await createSupabaseAdminClient().storage.from(STORAGE_BUCKETS.media).remove([url.slice(i + marker.length)]);
}
