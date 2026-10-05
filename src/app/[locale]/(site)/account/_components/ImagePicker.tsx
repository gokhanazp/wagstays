"use client";

import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;
// Server Actions accept ~1 MB request bodies by default, so larger photos are downscaled in the browser first.
const SHRINK_ABOVE = 900 * 1024;
const MAX_EDGE = 1600;

async function shrink(file: File): Promise<File> {
  if (file.size <= SHRINK_ABOVE) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  for (const q of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= SHRINK_ABOVE) return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  }
  return file;
}

/** File input with live preview, client-side type/size checks and an optional "remove" flag. */
export function ImagePicker({
  name,
  removeName,
  initialUrl,
  label,
  shape = "rounded",
  fallbackIcon,
  error,
}: {
  name: string;
  removeName: string;
  initialUrl: string | null;
  label: string;
  shape?: "rounded" | "circle";
  fallbackIcon: string;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    setLocalError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setLocalError("Please upload a JPG, PNG or WebP image.");
      input.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("Images must be 5 MB or smaller.");
      input.value = "";
      return;
    }
    setBusy(true);
    try {
      const small = await shrink(file);
      if (small !== file) {
        const dt = new DataTransfer();
        dt.items.add(small);
        input.files = dt.files;
      }
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(small);
      setPreview(objectUrl.current);
      setRemoved(false);
    } catch {
      setLocalError("We couldn't read that image — please try another.");
      input.value = "";
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    setRemoved(true);
    setLocalError(null);
  }

  const msg = localError ?? error;
  const radius = shape === "circle" ? "rounded-full" : "rounded-2xl";

  return (
    <div className="flex flex-col gap-space-xs">
      <span className="font-label-lg text-label-lg text-on-surface">{label}</span>
      <div className="flex items-center gap-space-md">
        <div className={`w-24 h-24 ${radius} overflow-hidden bg-primary-fixed flex items-center justify-center shrink-0 border border-[#EFE7DE]`}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Preview" className="w-full h-full object-cover" src={preview} />
          ) : (
            <span className="material-symbols-outlined text-primary text-4xl">{fallbackIcon}</span>
          )}
        </div>
        <div className="flex flex-col gap-space-xs">
          <div className="flex flex-wrap gap-space-xs">
            <label className="inline-flex items-center justify-center gap-1 h-9 px-space-md rounded-full font-label-md text-label-md bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] hover:bg-[#DCECE4] cursor-pointer transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
              <span className={`material-symbols-outlined text-base ${busy ? "animate-spin" : ""}`}>{busy ? "autorenew" : "upload"}</span>
              {preview ? "Change photo" : "Upload photo"}
              <input accept="image/jpeg,image/png,image/webp" className="sr-only" name={name} onChange={onChange} ref={inputRef} type="file" />
            </label>
            {preview && (
              <button className="inline-flex items-center justify-center gap-1 h-9 px-space-md rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-low transition-all" onClick={remove} type="button">
                <span className="material-symbols-outlined text-base">delete</span>
                Remove
              </button>
            )}
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">JPG, PNG or WebP, up to 5 MB.</span>
        </div>
      </div>
      {removed && <input name={removeName} type="hidden" value="1" />}
      {msg && (
        <span className="flex items-center gap-1 font-body-sm text-body-sm text-error" role="alert">
          <span className="material-symbols-outlined text-base">error</span>
          {msg}
        </span>
      )}
    </div>
  );
}
