/** Inline success / error banner for forms driven by useActionState. */
export function FormStatus({ state }: { state?: { ok?: boolean; message?: string; error?: string } }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="flex items-center gap-space-xs p-space-sm px-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm" role="alert">
        <span className="material-symbols-outlined text-base">error</span>
        {state.error}
      </p>
    );
  if (state.ok && state.message)
    return (
      <p className="flex items-center gap-space-xs p-space-sm px-space-md rounded-xl bg-[#EBF3EF] text-primary font-body-sm text-body-sm" role="status">
        <span className="material-symbols-outlined text-base">check_circle</span>
        {state.message}
      </p>
    );
  return null;
}
