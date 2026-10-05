"use client";
/* eslint-disable @next/next/no-img-element -- preview of an uploaded file */

import { useActionState, useRef, useState } from "react";
import { uploadProfileImage } from "@/app/actions/sitter";
import { BTN } from "@/components/ui";
import { Feedback } from "../../_components/Feedback";

export function ImageUpload({ kind, current, title, hint }: { kind: "avatar" | "card"; current: string | null; title: string; hint: string }) {
  const [state, action, pending] = useActionState(uploadProfileImage, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const src = (state?.error ? null : preview) ?? current;
  return (
    <form action={action} className="flex items-center gap-space-md">
      <input name="kind" type="hidden" value={kind} />
      <div className={`shrink-0 overflow-hidden bg-surface-container-high ${kind === "avatar" ? "w-20 h-20 rounded-full" : "w-20 h-28 rounded-2xl"}`}>
        {src ? <img alt={title} className="w-full h-full object-cover" src={src} /> : <span className="material-symbols-outlined text-3xl text-outline m-auto">image</span>}
      </div>
      <div className="flex flex-col gap-space-xs min-w-0">
        <span className="font-label-lg text-label-lg text-on-surface">{title}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">{hint}</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          name="file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
            if (f) e.target.form?.requestSubmit();
          }}
          ref={input}
          type="file"
        />
        <div className="flex flex-wrap items-center gap-space-sm">
          <button className={`${BTN.small} bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] hover:bg-[#DCECE4]`} disabled={pending} onClick={() => input.current?.click()} type="button">
            <span className="material-symbols-outlined text-base">upload</span>
            {pending ? "Uploading…" : "Upload new"}
          </button>
        </div>
        <Feedback state={state} />
      </div>
    </form>
  );
}
