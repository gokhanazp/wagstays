import Link from "next/link";

// Shared building blocks for dashboard-style pages (admin, account, sitter).
// They follow the Warm Paw design system: white cards on vanilla, pill buttons, Material Symbols.

export type Tone = "neutral" | "primary" | "warning" | "danger" | "success";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  primary: "bg-primary-fixed text-on-primary-fixed-variant",
  success: "bg-[#EBF3EF] text-primary",
  warning: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  danger: "bg-error-container text-on-error-container",
};

export function StatusChip({ tone = "neutral", icon, children }: { tone?: Tone; icon?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 h-7 px-3 rounded-full font-label-md text-label-md whitespace-nowrap ${TONES[tone]}`}>
      {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-space-md">
      <div className="flex flex-col gap-1">
        {eyebrow && <span className="font-label-md text-label-md uppercase tracking-wide text-primary">{eyebrow}</span>}
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md text-on-surface">{title}</h1>
        {description && <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-space-sm">{actions}</div>}
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-surface-container-lowest rounded-2xl border border-[#EFE7DE] shadow-[0_4px_16px_-2px_rgba(83,72,62,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ icon, title, action }: { icon?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-space-md px-space-lg pt-space-lg">
      <div className="flex items-center gap-space-sm">
        {icon && (
          <span className="w-9 h-9 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </span>
        )}
        <h2 className="font-title-md text-title-md text-on-surface">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ icon, label, value, hint, tone = "primary" }: { icon: string; label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "primary" | "secondary" | "tertiary" }) {
  const iconTone = {
    primary: "bg-primary-fixed text-primary",
    secondary: "bg-secondary-fixed text-secondary",
    tertiary: "bg-tertiary-fixed text-tertiary",
  }[tone];
  return (
    <Card className="p-space-lg flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <span className="font-label-lg text-label-lg text-on-surface-variant">{label}</span>
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconTone}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
      </div>
      <div className="font-headline-md text-headline-md text-on-surface">{value}</div>
      {hint && <div className="font-body-sm text-body-sm text-on-surface-variant">{hint}</div>}
    </Card>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center gap-space-sm py-space-xl px-space-lg">
      <span className="w-14 h-14 rounded-2xl bg-surface-container-low text-secondary flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </span>
      <h3 className="font-title-md text-title-md text-on-surface">{title}</h3>
      {text && <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">{text}</p>}
      {action}
    </div>
  );
}

/** Horizontal-scrolling table wrapper so wide tables never cause page overflow on mobile. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">{children}</table>
    </div>
  );
}
export const TH = "px-space-lg py-space-sm font-label-md text-label-md uppercase tracking-wide text-on-surface-variant bg-surface-container-low first:rounded-l-xl last:rounded-r-xl";
export const TD = "px-space-lg py-space-md font-body-md text-body-md text-on-surface border-b border-[#EFE7DE] align-middle";

export const BTN = {
  primary:
    "inline-flex items-center justify-center gap-space-xs h-11 px-space-lg rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg transition-all duration-[250ms] [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(243,123,92,0.35)] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none",
  sage: "inline-flex items-center justify-center gap-space-xs h-11 px-space-lg rounded-full bg-primary text-on-primary font-label-lg text-label-lg hover:bg-primary-container transition-all disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-space-xs h-11 px-space-lg rounded-full bg-[#EBF3EF] text-primary-container border border-[#C8DDD4] font-label-lg text-label-lg hover:bg-[#DCECE4] transition-all disabled:opacity-60",
  ghost: "inline-flex items-center justify-center gap-space-xs h-11 px-space-md rounded-full text-on-surface font-label-lg text-label-lg hover:bg-surface-container-low transition-all disabled:opacity-60",
  danger: "inline-flex items-center justify-center gap-space-xs h-11 px-space-lg rounded-full bg-error-container text-on-error-container font-label-lg text-label-lg hover:brightness-95 transition-all disabled:opacity-60",
  small: "inline-flex items-center justify-center gap-1 h-9 px-space-md rounded-full font-label-md text-label-md transition-all disabled:opacity-60",
} as const;

export const INPUT =
  "w-full h-12 px-space-md rounded-xl bg-surface-container-lowest border-[1.5px] border-[#EFE7DE] font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/15 transition-all";
export const TEXTAREA = INPUT.replace("h-12", "min-h-[120px] py-space-sm");
/** @deprecated native <select> styling — use <Select> from components/forms; kept for SELECT_FIELD parity. */
export { SELECT_FIELD as SELECT } from "./forms/styles";
export const LABEL = "font-label-lg text-label-lg text-on-surface";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string[] | string; children: React.ReactNode }) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <label className="flex flex-col gap-space-xs">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && !msg && <span className="font-body-sm text-body-sm text-on-surface-variant">{hint}</span>}
      {msg && (
        <span className="flex items-center gap-1 font-body-sm text-body-sm text-error">
          <span className="material-symbols-outlined text-base">error</span>
          {msg}
        </span>
      )}
    </label>
  );
}

export function Toggle({ name, defaultChecked, label, description }: { name: string; defaultChecked?: boolean; label: string; description?: string }) {
  return (
    <label className="flex items-center justify-between gap-space-md p-space-md rounded-xl bg-surface-container-low cursor-pointer">
      <span className="flex flex-col">
        <span className="font-label-lg text-label-lg text-on-surface">{label}</span>
        {description && <span className="font-body-sm text-body-sm text-on-surface-variant">{description}</span>}
      </span>
      <input className="peer sr-only" defaultChecked={defaultChecked} name={name} type="checkbox" value="1" />
      <span className="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
    </label>
  );
}

export function Pager({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (p: number) => string }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-space-xs px-space-lg py-space-md">
      <Link aria-disabled={page <= 1} className={`${BTN.small} ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-surface-container-low"}`} href={hrefFor(page - 1)}>
        <span className="material-symbols-outlined text-base">chevron_left</span>Prev
      </Link>
      <span className="font-label-md text-label-md text-on-surface-variant px-space-sm">
        Page {page} of {pageCount}
      </span>
      <Link aria-disabled={page >= pageCount} className={`${BTN.small} ${page >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-surface-container-low"}`} href={hrefFor(page + 1)}>
        Next<span className="material-symbols-outlined text-base">chevron_right</span>
      </Link>
    </div>
  );
}

export function formatDateTime(d: Date, tz = "America/Toronto") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(d);
}
export function formatDate(d: Date, tz = "America/Toronto") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, dateStyle: "medium" }).format(d);
}
