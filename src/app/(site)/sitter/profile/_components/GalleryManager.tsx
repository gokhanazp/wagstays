"use client";
/* eslint-disable @next/next/no-img-element -- gallery thumbnails */

import { useActionState } from "react";
import { addPhoto, deletePhoto, movePhoto, updatePhotoCaption } from "@/app/actions/sitter";
import { BTN, INPUT } from "@/components/ui";
import { MAX_PHOTOS } from "@/lib/sitter";
import { Feedback } from "../../_components/Feedback";
import { useFormAction } from "../../_components/useFormAction";
import { MiniAction } from "./MiniAction";

type Photo = { id: string; url: string; caption: string | null };

const ICON_BTN = "w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors";

function CaptionForm({ photo }: { photo: Photo }) {
  const [state, action, pending] = useActionState(updatePhotoCaption, undefined);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input name="photoId" type="hidden" value={photo.id} />
      <div className="flex gap-space-xs">
        <input aria-label="Caption" className={`${INPUT} h-10`} defaultValue={photo.caption ?? ""} maxLength={80} name="caption" placeholder="Add a caption" />
        <button className={`${BTN.small} bg-surface-container-high text-on-surface hover:bg-surface-container-highest shrink-0`} disabled={pending} type="submit">
          {pending ? "…" : "Save"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

function AddPhotoForm({ disabled }: { disabled: boolean }) {
  const { form, state, pending, onSubmit } = useFormAction(addPhoto, { resetOnSuccess: true });
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-space-sm p-space-md rounded-2xl border-[1.5px] border-dashed border-outline-variant" ref={form}>
      <span className="font-label-lg text-label-lg text-on-surface">Add a photo</span>
      <div className="flex flex-col sm:flex-row gap-space-sm">
        <input accept="image/jpeg,image/png,image/webp" aria-label="Photo file" className="font-body-sm text-body-sm text-on-surface-variant file:mr-space-sm file:h-9 file:px-space-md file:rounded-full file:border-0 file:bg-[#EBF3EF] file:text-primary-container file:font-semibold min-w-0" disabled={disabled} name="file" required type="file" />
        <input aria-label="Caption" className={`${INPUT} h-10 sm:flex-1`} disabled={disabled} maxLength={80} name="caption" placeholder="Caption (optional)" />
        <button className={`${BTN.small} bg-primary text-on-primary hover:bg-primary-container shrink-0`} disabled={pending || disabled} type="submit">
          <span className="material-symbols-outlined text-base">add_photo_alternate</span>
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      <span className="font-body-sm text-body-sm text-on-surface-variant">
        {disabled ? `You've reached ${MAX_PHOTOS} photos — remove one to add another.` : "JPG, PNG or WebP up to 5 MB. Bright, natural-light photos of your home and walks work best."}
      </span>
      <Feedback state={state} />
    </form>
  );
}

export function GalleryManager({ photos }: { photos: Photo[] }) {
  return (
    <div className="flex flex-col gap-space-md">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-md">
          {photos.map((p, i) => (
            <li className="flex flex-col gap-space-sm p-space-sm rounded-2xl bg-surface-container-low" key={p.id}>
              <div className="relative">
                <img alt={p.caption ?? `Gallery photo ${i + 1}`} className="w-full aspect-[4/3] object-cover rounded-xl bg-surface-container-high" src={p.url} />
                <span className="absolute top-2 left-2 h-6 min-w-6 px-2 rounded-full bg-white/90 font-label-sm text-label-sm flex items-center justify-center">{i + 1}</span>
              </div>
              <CaptionForm photo={p} />
              <div className="flex items-center justify-between">
                <div className="flex">
                  {i > 0 ? (
                    <MiniAction action={movePhoto} className={ICON_BTN} fields={{ photoId: p.id, direction: "up" }} label="Move earlier">
                      <span className="material-symbols-outlined text-xl">arrow_upward</span>
                    </MiniAction>
                  ) : (
                    <span className={`${ICON_BTN} opacity-30`}><span className="material-symbols-outlined text-xl">arrow_upward</span></span>
                  )}
                  {i < photos.length - 1 ? (
                    <MiniAction action={movePhoto} className={ICON_BTN} fields={{ photoId: p.id, direction: "down" }} label="Move later">
                      <span className="material-symbols-outlined text-xl">arrow_downward</span>
                    </MiniAction>
                  ) : (
                    <span className={`${ICON_BTN} opacity-30`}><span className="material-symbols-outlined text-xl">arrow_downward</span></span>
                  )}
                </div>
                <MiniAction
                  action={deletePhoto}
                  className={`${ICON_BTN} hover:text-error hover:bg-error-container`}
                  confirm="Remove this photo from your gallery?"
                  fields={{ photoId: p.id }}
                  label="Delete photo"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                </MiniAction>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body-sm text-body-sm text-on-surface-variant">No photos yet — add at least 3 so owners can picture your home and walks.</p>
      )}
      <AddPhotoForm disabled={photos.length >= MAX_PHOTOS} />
    </div>
  );
}
