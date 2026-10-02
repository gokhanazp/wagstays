"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Popover } from "./Popover";
import { SELECT_FIELD } from "./styles";

export type SelectOption = {
  value: string;
  label: string;
  /** secondary line under the label */
  hint?: string;
  /** Material Symbols icon name */
  icon?: string;
  /** options with the same group are listed under a group heading */
  group?: string;
  disabled?: boolean;
};

export { SELECT_FIELD };

/**
 * Design-system dropdown replacing native <select>. Works controlled (`value` + `onChange`) or
 * uncontrolled (`defaultValue`), and posts its value with forms through a hidden input (`name`).
 *
 * Variants:
 * - "field" (default): renders a trigger button styled like an input (override with `className`).
 * - "overlay": an invisible trigger stretched over the nearest `relative` parent — for tiles that
 *   draw their own label (search bar tiles). The panel anchors to that parent.
 */
export function Select({
  options,
  value,
  defaultValue,
  onChange,
  name,
  placeholder = "Select…",
  className = SELECT_FIELD,
  variant = "field",
  disabled,
  id,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  renderValue,
  panelMinWidth = 220,
  align = "start",
}: {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  className?: string;
  variant?: "field" | "overlay";
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  renderValue?: (option: SelectOption | undefined) => React.ReactNode;
  panelMinWidth?: number;
  align?: "start" | "end";
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const selected = options.find((o) => o.value === current);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const trigger = useRef<HTMLButtonElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const listId = useId();
  const anchorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    anchorRef.current = variant === "overlay" ? (trigger.current?.parentElement ?? trigger.current) : trigger.current;
  }, [variant]);

  const enabled = useMemo(() => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0), [options]);

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    const idx = options.findIndex((o) => o.value === current);
    setActive(idx >= 0 ? idx : (enabled[0] ?? -1));
  };

  const close = () => setOpen(false);

  const choose = (opt: SelectOption) => {
    if (opt.disabled) return;
    if (value === undefined) setInner(opt.value);
    onChange?.(opt.value);
    setOpen(false);
    trigger.current?.focus();
    // let form-level listeners (completeness trackers, dirty checks) know something changed
    requestAnimationFrame(() => {
      hidden.current?.dispatchEvent(new Event("input", { bubbles: true }));
      hidden.current?.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  // keep the active option visible
  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const move = (dir: 1 | -1) => {
    const pos = enabled.indexOf(active);
    const next = enabled[Math.min(Math.max(pos + dir, 0), enabled.length - 1)] ?? enabled[0];
    setActive(next);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(enabled[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(enabled[enabled.length - 1]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at > 700 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
      t.at = now;
      const hit = enabled.find((i) => options[i].label.toLowerCase().startsWith(t.text));
      if (hit !== undefined) setActive(hit);
    }
  };

  // group heading shown above the first option of each group
  const headings = useMemo(() => options.map((o, i) => (o.group && o.group !== options[i - 1]?.group ? o.group : null)), [options]);

  const display = renderValue ? renderValue(selected) : selected ? selected.label : <span className="text-outline">{placeholder}</span>;

  return (
    <>
      {name && <input name={name} ref={hidden} type="hidden" value={current} />}
      <button
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        className={
          variant === "overlay"
            ? "absolute inset-0 w-full h-full cursor-pointer rounded-[inherit] focus:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-container/25"
            : `relative ${className}`
        }
        disabled={disabled}
        id={id}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        ref={trigger}
        role="combobox"
        type="button"
      >
        {variant === "field" && (
          <>
            <span className="block truncate">{display}</span>
            <span
              aria-hidden="true"
              className={`material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            >
              expand_more
            </span>
          </>
        )}
        {variant === "overlay" && <span className="sr-only">{selected?.label ?? placeholder}</span>}
      </button>
      <Popover align={align} anchor={anchorRef} matchWidth minWidth={panelMinWidth} onClose={close} open={open}>
        <ul
          aria-label={ariaLabel}
          className="max-h-[320px] overflow-y-auto overscroll-contain p-space-xs flex flex-col gap-0.5"
          id={listId}
          ref={list}
          role="listbox"
        >
          {options.map((o, i) => {
            const heading = headings[i];
            const isSelected = o.value === current;
            return (
              <li key={`${o.group ?? ""}-${o.value}`} role="presentation">
                {heading && (
                  <div className="px-space-sm pt-space-sm pb-1 font-label-sm text-label-sm uppercase tracking-wider text-outline" role="presentation">
                    {heading}
                  </div>
                )}
                <div
                  aria-disabled={o.disabled || undefined}
                  aria-selected={isSelected}
                  className={`flex items-center gap-space-sm px-space-sm py-2.5 rounded-xl cursor-pointer select-none transition-colors ${
                    o.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : isSelected
                        ? "bg-[#EBF3EF] text-primary"
                        : i === active
                          ? "bg-surface-container-low text-on-surface"
                          : "text-on-surface hover:bg-surface-container-low"
                  }`}
                  data-index={i}
                  id={`${listId}-${i}`}
                  onClick={() => choose(o)}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  role="option"
                >
                  {o.icon && (
                    <span aria-hidden="true" className={`material-symbols-outlined text-xl shrink-0 ${isSelected ? "text-primary" : "text-on-surface-variant"}`}>{o.icon}</span>
                  )}
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className={`truncate ${isSelected ? "font-label-lg text-label-lg" : "font-body-md text-body-md"}`}>{o.label}</span>
                    {o.hint && <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{o.hint}</span>}
                  </span>
                  {isSelected && (
                    <span aria-hidden="true" className="material-symbols-outlined text-lg text-primary shrink-0">
                      check
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}
