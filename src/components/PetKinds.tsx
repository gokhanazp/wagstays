"use client";

import { useState } from "react";
import { PET_KINDS, PET_KIND_META, type PetKind } from "@/lib/pets";

/**
 * Multi-select chips for PET_KINDS. Renders one checkbox per kind named `name` (FormData.getAll(name)).
 * `locked` kinds can't be unticked (e.g. DOG while Dog Walking is offered) and show `lockedHint`.
 */
export function PetKindPicker({
  name = "kinds",
  defaultValue,
  value,
  onChange,
  locked = [],
  lockedHint,
}: {
  name?: string;
  defaultValue?: readonly string[];
  value?: readonly string[];
  onChange?: (kinds: PetKind[]) => void;
  locked?: readonly string[];
  lockedHint?: string;
}) {
  const [inner, setInner] = useState<string[]>(() => [...(defaultValue ?? [])]);
  const selected = value ?? inner;
  const toggle = (k: PetKind, on: boolean) => {
    const next = PET_KINDS.filter((x) => (x === k ? on : selected.includes(x)));
    setInner(next);
    onChange?.(next);
  };
  const on = "has-[:checked]:bg-[#EBF3EF] has-[:checked]:text-primary has-[:checked]:border-primary-container";
  return (
    <div className="flex flex-wrap gap-space-xs">
      {PET_KINDS.map((k) => {
        const isLocked = locked.includes(k) && selected.includes(k);
        return (
          <label
            className={`inline-flex items-center gap-1.5 h-10 pl-space-sm pr-space-md rounded-full border-[1.5px] border-[#EFE7DE] bg-surface-container-lowest text-on-surface-variant font-label-md text-label-md cursor-pointer select-none transition-all hover:bg-surface-container-low has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary-container/30 ${on} ${
              isLocked ? "cursor-not-allowed" : ""
            }`}
            key={k}
            title={isLocked ? lockedHint : undefined}
          >
            <input
              checked={selected.includes(k)}
              className="sr-only"
              name={name}
              onChange={(e) => {
                if (isLocked && !e.target.checked) return;
                toggle(k, e.target.checked);
              }}
              type="checkbox"
              value={k}
            />
            <span aria-hidden className="material-symbols-outlined text-lg">
              {selected.includes(k) ? (isLocked ? "lock" : "check") : PET_KIND_META[k].icon}
            </span>
            {PET_KIND_META[k].label}
          </label>
        );
      })}
    </div>
  );
}

/** Read-only chips ("Pets I care for") with icons. */
export function PetKindChips({ kinds, size = "md" }: { kinds: readonly string[]; size?: "sm" | "md" }) {
  const list = PET_KINDS.filter((k) => kinds.includes(k));
  if (!list.length) return null;
  return (
    <ul className="flex flex-wrap gap-space-xs">
      {list.map((k) => (
        <li
          className={`inline-flex items-center gap-1.5 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md ${
            size === "sm" ? "h-8 px-space-sm" : "h-10 pl-space-sm pr-space-md"
          }`}
          key={k}
        >
          <span aria-hidden className="material-symbols-outlined text-lg text-primary">
            {PET_KIND_META[k].icon}
          </span>
          {PET_KIND_META[k].label}
        </li>
      ))}
    </ul>
  );
}

/** Subtle icon row for search cards / map preview. */
export function PetKindIcons({ kinds, className = "" }: { kinds: readonly string[]; className?: string }) {
  const list = PET_KINDS.filter((k) => kinds.includes(k));
  if (!list.length) return null;
  const label = `Cares for ${list.map((k) => PET_KIND_META[k].plural).join(", ")}`;
  return (
    <span aria-label={label} className={`inline-flex items-center gap-0.5 text-on-surface-variant ${className}`} role="img" title={label}>
      {list.slice(0, 5).map((k) => (
        <span aria-hidden className="material-symbols-outlined text-[16px] leading-none" key={k}>
          {PET_KIND_META[k].icon}
        </span>
      ))}
      {list.length > 5 && <span className="font-label-sm text-label-sm">+{list.length - 5}</span>}
    </span>
  );
}
