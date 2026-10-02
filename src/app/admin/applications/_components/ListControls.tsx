import Link from "next/link";
import { BTN, INPUT } from "@/components/ui";

/** Pill tabs with counts (server-rendered links, so filters stay shareable). */
export function FilterTabs({ tabs }: { tabs: { href: string; label: string; count?: number; active: boolean }[] }) {
  return (
    <div className="flex gap-space-xs overflow-x-auto -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0 pb-1">
      {tabs.map((t) => (
        <Link
          key={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`inline-flex items-center gap-space-xs h-10 px-space-md rounded-full font-label-lg text-label-lg whitespace-nowrap transition-all ${
            t.active
              ? "bg-primary-container text-on-primary shadow-sm"
              : "bg-surface-container-lowest border border-[#EFE7DE] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
          }`}
          href={t.href}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`min-w-6 h-6 px-1.5 rounded-full inline-flex items-center justify-center font-label-sm text-label-sm ${
                t.active ? "bg-white/20 text-on-primary" : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {t.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/** GET search form. `hidden` carries the other active filters so searching keeps them. */
export function SearchForm({
  action,
  q,
  placeholder,
  hidden = {},
  children,
}: {
  action: string;
  q?: string;
  placeholder: string;
  hidden?: Record<string, string | undefined>;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-space-sm" method="get" role="search">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} name={k} type="hidden" value={v} /> : null))}
      <div className="relative flex-1 min-w-0 md:min-w-[260px]">
        <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-xl pointer-events-none">search</span>
        <input aria-label="Search" className={`${INPUT} pl-11`} defaultValue={q} name="q" placeholder={placeholder} type="search" />
      </div>
      {children}
      <button className={BTN.sage} type="submit">
        Search
      </button>
    </form>
  );
}

export function qs(base: string, params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || (k === "page" && Number(v) <= 1)) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}
