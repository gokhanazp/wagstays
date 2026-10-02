import type { AdminActionState } from "@/app/actions/admin-bookings";

/** Inline success / error banner for admin forms. */
export function FormNotice({ state }: { state: AdminActionState }) {
  if (!state?.message && !state?.error) return null;
  const ok = Boolean(state.ok);
  return (
    <p
      className={`flex items-start gap-space-xs p-space-sm rounded-xl font-body-sm text-body-sm ${ok ? "bg-[#EBF3EF] text-primary" : "bg-error-container text-on-error-container"}`}
      role={ok ? "status" : "alert"}
    >
      <span className="material-symbols-outlined text-base mt-0.5">{ok ? "check_circle" : "error"}</span>
      {ok ? state.message : state.error}
    </p>
  );
}
