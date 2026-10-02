import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Local-dev storage: files are written to public/uploads and served statically.
// Swap the body of saveUpload() for Supabase Storage later; keep the signature.
const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function saveUpload(file: File, folder: "pets" | "sitters" | "avatars"): Promise<{ url: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "Please choose a file." };
  if (file.size > MAX_BYTES) return { error: "Images must be 5 MB or smaller." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "Please upload a JPG, PNG or WebP image." };
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${folder}/${name}` };
}
