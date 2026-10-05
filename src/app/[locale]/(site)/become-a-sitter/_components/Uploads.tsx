"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createApplicationUploadUrl } from "@/app/actions/application-uploads";
import { APPLICATION_FILE_RULES, MAX_HOME_PHOTOS, type ApplicationFileKind, type UploadedFile } from "@/lib/application-files";
import { STORAGE_BUCKETS } from "@/lib/supabase/buckets";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_BYTES = 10 * 1024 * 1024;

/** Uploads a file straight to the private documents bucket through a server-issued signed URL. */
async function uploadApplicationFile(draftId: string, kind: ApplicationFileKind, file: File, failedMsg: string): Promise<UploadedFile> {
  const signed = await createApplicationUploadUrl({ draftId, kind, contentType: file.type, sizeBytes: file.size });
  if ("error" in signed) throw new Error(signed.error);
  const { error } = await getSupabaseBrowserClient()
    .storage.from(STORAGE_BUCKETS.documents)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw new Error(failedMsg);
  return { kind, path: signed.path, fileName: file.name, contentType: file.type, sizeBytes: file.size };
}

/**
 * Document picker. The file is uploaded to Supabase Storage as soon as it's chosen; the form posts the file name
 * (`name`, used for validation/display) and the stored object reference as JSON (`fileField`).
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
  draftId,
  kind,
  fileField,
}: {
  draftId: string;
  kind: ApplicationFileKind;
  fileField: string;
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
  const t = useTranslations("apply.uploads");
  const ref = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
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
            {uploading ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                {t("uploading")}
              </p>
            ) : value ? (
              <p className="font-body-sm text-body-sm text-primary font-semibold truncate flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">description</span>
                <span className="truncate">{value}</span>
              </p>
            ) : (
              <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
            )}
          </div>
        </div>
        <input name={name} type="hidden" value={uploaded ? value : ""} />
        <input name={fileField} type="hidden" value={uploaded ? JSON.stringify(uploaded) : ""} />
        <input
          accept={APPLICATION_FILE_RULES[kind].types.join(",")}
          aria-label={title}
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > MAX_BYTES) {
              setLocalError(t("tooLarge"));
              return;
            }
            setLocalError("");
            setUploading(true);
            try {
              const up = await uploadApplicationFile(draftId, kind, file, t("failed"));
              setUploaded(up);
              onFile(file.name);
            } catch (err) {
              setLocalError((err as Error).message);
            } finally {
              setUploading(false);
            }
          }}
          ref={ref}
          tabIndex={-1}
          type="file"
        />
        <button
          className="px-space-md py-2 rounded-full bg-surface-container-highest text-primary font-label-md text-label-md hover:bg-primary-fixed transition-colors flex items-center justify-center gap-1 self-start sm:self-auto shrink-0 disabled:opacity-60"
          disabled={uploading}
          onClick={() => ref.current?.click()}
          type="button"
        >
          <span className="material-symbols-outlined text-base">{value ? "sync" : buttonIcon}</span>
          {value ? t("replace") : buttonLabel}
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

type Photo = { id: string; url: string; name: string; uploaded?: UploadedFile; failed?: boolean };

const SLOT_HINTS = ["living", "yard", "sleep"] as const;

/** Home photos — previewed instantly, uploaded to the private documents bucket, posted as JSON (`homePhotos`). */
export function HomePhotos({ draftId }: { draftId: string }) {
  const t = useTranslations("apply.form.photos");
  const tu = useTranslations("apply.uploads");
  const ref = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function add(files: FileList | null) {
    if (!files) return;
    const ok = [...files].filter((f) => f.type.startsWith("image/") && f.size <= MAX_BYTES);
    setError(ok.length < files.length ? t("skipped") : "");
    const next = ok.map((f) => {
      const url = URL.createObjectURL(f);
      urls.current.push(url);
      return { id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2)}`, url, name: f.name };
    });
    const accepted = next.slice(0, Math.max(0, MAX_HOME_PHOTOS - photos.length));
    setPhotos((p) => [...p, ...accepted]);
    accepted.forEach((photo, i) => {
      const file = ok[i];
      uploadApplicationFile(draftId, "HOME_PHOTO", file, tu("failed"))
        .then((up) => setPhotos((p) => p.map((x) => (x.id === photo.id ? { ...x, uploaded: up } : x))))
        .catch(() => setPhotos((p) => p.map((x) => (x.id === photo.id ? { ...x, failed: true } : x))));
    });
  }

  function remove(id: string) {
    setPhotos((p) => {
      const photo = p.find((x) => x.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return p.filter((x) => x.id !== id);
    });
  }

  const emptySlots = photos.length >= MAX_HOME_PHOTOS ? 0 : Math.max(1, 3 - photos.length);
  const uploadedPhotos = photos.flatMap((p) => (p.uploaded ? [p.uploaded] : []));
  const open = () => ref.current?.click();

  return (
    <div className="flex flex-col gap-space-sm pt-space-xs">
      <div className="flex items-center justify-between gap-space-sm">
        <div>
          <span className="font-title-md text-title-md text-on-surface">{t("title")}</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {t("hint")}
          </p>
        </div>
        <span className="font-label-md text-label-md text-primary font-bold whitespace-nowrap">
          {t("added", { count: Math.min(photos.length, 3) })}
        </span>
      </div>
      <input name="homePhotos" type="hidden" value={JSON.stringify(uploadedPhotos)} />
      <input
        accept="image/png,image/jpeg,image/webp"
        aria-label={t("addAria")}
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
                  <span className={`material-symbols-outlined text-sm ${p.failed ? "text-error-container" : "text-primary-fixed"} ${!p.uploaded && !p.failed ? "animate-spin" : ""}`}>
                    {p.failed ? "error" : p.uploaded ? "check_circle" : "progress_activity"}
                  </span>
                  <span className="truncate">{p.name}</span>
                </span>
                <button
                  aria-label={t("removeAria")}
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
              {i === 0 ? t("addPhotos") : t(`slotHints.${SLOT_HINTS[(photos.length + i) % SLOT_HINTS.length]}`)}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">{t("formats")}</span>
          </button>
        ))}
      </div>
      {error && <p className="font-label-sm text-label-sm text-error">{error}</p>}
    </div>
  );
}
