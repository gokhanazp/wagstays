"use client";

import { useState } from "react";
import { addSkill, addTag, removeSkill, removeTag } from "@/app/actions/sitter";
import { BTN, INPUT } from "@/components/ui";
import { MAX_SKILLS, MAX_TAGS, TAG_ICONS } from "@/lib/sitter";
import { Feedback } from "../../_components/Feedback";
import { useFormAction } from "../../_components/useFormAction";
import { MiniAction } from "./MiniAction";

const REMOVE_BTN = "w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors";

const SKILL_EMOJI = ["🐾", "🐶", "🐱", "💊", "🎾", "🏃", "🦴", "🌿", "🏡", "🐇", "❤️", "🎓"];

export function SkillsManager({ skills }: { skills: { id: string; label: string; emoji: string | null }[] }) {
  const { form, state, pending, onSubmit } = useFormAction(addSkill, { resetOnSuccess: true });
  const [emoji, setEmoji] = useState("🐾");
  const full = skills.length >= MAX_SKILLS;
  return (
    <div className="flex flex-col gap-space-md">
      <ul className="flex flex-wrap gap-space-xs">
        {skills.map((s) => (
          <li className="inline-flex items-center gap-1 h-9 pl-space-md pr-1 rounded-full bg-surface-container-high font-label-md text-label-md text-on-surface" key={s.id}>
            {s.emoji && <span>{s.emoji}</span>}
            {s.label}
            <MiniAction action={removeSkill} className={REMOVE_BTN} fields={{ skillId: s.id }} label={`Remove ${s.label}`}>
              <span className="material-symbols-outlined text-base">close</span>
            </MiniAction>
          </li>
        ))}
        {skills.length === 0 && <li className="font-body-sm text-body-sm text-on-surface-variant">No skills yet.</li>}
      </ul>
      <form className="flex flex-col gap-space-sm" onSubmit={onSubmit} ref={form}>
        <input name="emoji" type="hidden" value={emoji} />
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Emoji">
          {SKILL_EMOJI.map((e) => (
            <button
              aria-checked={emoji === e}
              className={`w-9 h-9 rounded-full text-lg transition-colors ${emoji === e ? "bg-primary-fixed ring-2 ring-primary-container" : "hover:bg-surface-container-low"}`}
              key={e}
              onClick={() => setEmoji(e)}
              role="radio"
              type="button"
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-space-xs">
          <input aria-label="Skill" className={`${INPUT} h-10`} disabled={full} maxLength={40} name="label" placeholder="e.g. Large Breed Experience" required />
          <button className={`${BTN.small} bg-primary text-on-primary hover:bg-primary-container shrink-0`} disabled={pending || full} type="submit">
            <span className="material-symbols-outlined text-base">add</span>Add
          </button>
        </div>
        <Feedback state={state} />
      </form>
    </div>
  );
}

export function TagsManager({ tags }: { tags: { id: string; label: string; icon: string }[] }) {
  const { form, state, pending, onSubmit } = useFormAction(addTag, { resetOnSuccess: true });
  const [icon, setIcon] = useState(TAG_ICONS[0].icon);
  const full = tags.length >= MAX_TAGS;
  return (
    <div className="flex flex-col gap-space-md">
      <ul className="flex flex-wrap gap-space-xs">
        {tags.map((t) => (
          <li className="inline-flex items-center gap-1 h-9 pl-space-sm pr-1 rounded-full bg-surface-container-low border border-[#EFE7DE] font-label-md text-label-md text-on-surface-variant" key={t.id}>
            <span className="material-symbols-outlined text-base text-primary">{t.icon || "label"}</span>
            {t.label}
            <MiniAction action={removeTag} className={REMOVE_BTN} fields={{ tagId: t.id }} label={`Remove ${t.label}`}>
              <span className="material-symbols-outlined text-base">close</span>
            </MiniAction>
          </li>
        ))}
        {tags.length === 0 && <li className="font-body-sm text-body-sm text-on-surface-variant">No tags yet.</li>}
      </ul>
      <form className="flex flex-col gap-space-sm" onSubmit={onSubmit} ref={form}>
        <input name="icon" type="hidden" value={icon} />
        <div aria-label="Icon" className="flex flex-wrap gap-1" role="radiogroup">
          {TAG_ICONS.map((t) => (
            <button
              aria-checked={icon === t.icon}
              aria-label={t.label}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${icon === t.icon ? "bg-primary-fixed text-primary ring-2 ring-primary-container" : "text-on-surface-variant hover:bg-surface-container-low"}`}
              disabled={full}
              key={t.icon}
              onClick={() => setIcon(t.icon)}
              role="radio"
              title={t.label}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">{t.icon}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-space-xs">
          <input aria-label="Tag" className={`${INPUT} h-10`} disabled={full} maxLength={28} name="label" placeholder="e.g. Live GPS Tracking" required />
          <button className={`${BTN.small} bg-primary text-on-primary hover:bg-primary-container shrink-0`} disabled={pending || full} type="submit">
            <span className="material-symbols-outlined text-base">add</span>Add
          </button>
        </div>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          {tags.length}/{MAX_TAGS} tags — these appear on your search card.
        </span>
        <Feedback state={state} />
      </form>
    </div>
  );
}
