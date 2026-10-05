import type { SitterActionState } from "@/app/actions/sitter";

/** Inline success / error line under a form. */
export function Feedback({ state, className = "" }: { state: SitterActionState; className?: string }) {
  if (!state?.ok && !state?.error) return null;
  const ok = !state.error;
  return (
    <p
      aria-live="polite"
      className={`flex items-center gap-1 font-body-sm text-body-sm ${ok ? "text-primary" : "text-error"} ${className}`}
      role={ok ? "status" : "alert"}
    >
      <span className="material-symbols-outlined text-base">{ok ? "check_circle" : "error"}</span>
      {state.error ?? state.ok}
    </p>
  );
}
