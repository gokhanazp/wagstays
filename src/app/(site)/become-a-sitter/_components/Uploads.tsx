"use client";

import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Document picker. Only the selected file's NAME is submitted (hidden input) — the file itself is not uploaded
 * yet; it will go to Supabase Storage later. The <input type="file"> has no name so its bytes never hit the action.
 */
export function FileUploadRow({
  name,
  title,
  description,
  icon,
  iconBox,
  buttonIcon,
  buttonLabel,
  value,
  onFile,
  error,
}: {
  name: string;
  title: string;
  description: string;
  icon: string;
  iconBox: string;
  buttonIcon: string;
  buttonLabel: string;
  value: string;
  onFile: (fileName: string) => void;
  error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState("");
  const msg = localError || error;

  return (
    <div>
      <div
        className={`p-space-md rounded-2xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm ${
          msg ? "ring-2 ring-error" : ""
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${value ? "bg-primary text-on-primary" : iconBox}`}>
            <span className="material-symbols-outlined">{value ? "check" : icon}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-title-md text-title-md text-on-surface">{title}</h3>
            {value ? (
              <p className="font-body-sm text-body-sm text-primary font-semibold truncate flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">description</span>
                <span className="truncate">{value}</span>
              </p>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
            )}
          </div>
        </div>
        <input name={name} type="hidden" value={value} />
        <input
          accept="image/png,image/jpeg,application/pdf"
          aria-label={title}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > MAX_BYTES) {
              setLocalError("That file is over 10 MB — please choose a smaller one.");
              return;
            }
            setLocalError("");
            onFile(file.name);
          }}
          ref={ref}
          tabIndex={-1}
          type="file"
        />
        <button
          className="px-space-md py-2 rounded-full bg-surface-container-highest text-primary font-label-md text-label-md hover:bg-primary-fixed transition-colors flex items-center justify-center gap-1 self-start sm:self-auto shrink-0"
          onClick={() => ref.current?.click()}
          type="button"
        >
          <span className="material-symbols-outlined text-base">{value ? "sync" : buttonIcon}</span>
          {value ? "Replace" : buttonLabel}
        </button>
      </div>
      {msg && (
        <p className="font-label-sm text-label-sm text-error flex items-center gap-1 mt-1" data-field-error role="alert">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
          {msg}
        </p>
      )}
    </div>
  );
}

type Photo = { id: string; url: string; name: string };

const SLOT_HINTS = ["Living room & bed", "Yard or outdoor space", "Where pets sleep"];

/** Home photos — previewed client-side only (object URLs), not uploaded or stored yet. */
export function HomePhotos() {
  const ref = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function add(files: FileList | null) {
    if (!files) return;
    const ok = [...files].filter((f) => f.type.startsWith("image/") && f.size <= MAX_BYTES);
    setError(ok.length < files.length ? "Some files were skipped — use PNG or JPG images up to 10 MB." : "");
    const next = ok.map((f) => {
      const url = URL.createObjectURL(f);
      urls.current.push(url);
      return { id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2)}`, url, name: f.name };
    });
    setPhotos((p) => [...p, ...next].slice(0, 9));
  }

  function remove(id: string) {
    setPhotos((p) => {
      const photo = p.find((x) => x.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return p.filter((x) => x.id !== id);
    });
  }

  const emptySlots = Math.max(1, 3 - photos.length);
  const open = () => ref.current?.click();

  return (
    <div className="flex flex-col gap-space-sm pt-space-xs">
      <div className="flex items-center justify-between gap-space-sm">
        <div>
          <span className="font-title-md text-title-md text-on-surface">Photos of Your Home & Resting Areas</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Add at least 3 clear photos — it boosts your approval rate by 65%.
          </p>
        </div>
        <span className="font-label-md text-label-md text-primary font-bold whitespace-nowrap">
          {Math.min(photos.length, 3)}/3 Added
        </span>
      </div>
      <input
        accept="image/png,image/jpeg,image/webp"
        aria-label="Add home photos"
        className="sr-only"
        multiple
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
        ref={ref}
        tabIndex={-1}
        type="file"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md pt-2">
        {photos.map((p) => (
          <div className="relative group rounded-2xl overflow-hidden shadow-sm aspect-video sm:aspect-square" key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview */}
            <img
              alt={p.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              src={p.url}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
              <div className="flex items-center justify-between gap-2 w-full min-w-0">
                <span className="font-label-sm text-label-sm text-white flex items-center gap-1 min-w-0">
                  <span className="material-symbols-outlined text-sm text-primary-fixed">check_circle</span>
                  <span className="truncate">{p.name}</span>
                </span>
                <button
                  aria-label="Remove photo"
                  className="w-7 h-7 rounded-full bg-surface/80 text-error flex items-center justify-center hover:bg-surface shrink-0"
                  onClick={() => remove(p.id)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <button
            className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-low hover:bg-surface-container flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all aspect-video sm:aspect-square"
            key={i}
            onClick={open}
            type="button"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary mb-2 shadow-xs">
              <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
            </div>
            <span className="font-label-lg text-label-lg text-on-surface">
              {i === 0 ? "Add Photos" : SLOT_HINTS[(photos.length + i) % SLOT_HINTS.length]}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">PNG, JPG (Max 10 MB)</span>
          </button>
        ))}
      </div>
      {error && <p className="font-label-sm text-label-sm text-error">{error}</p>}
    </div>
  );
}
