/** Shown for safety reports: urgent tickets jump the queue, but emergencies should call. */
export function SafetyBanner({ phone }: { phone: string }) {
  return (
    <div className="flex items-start gap-space-sm p-space-md rounded-xl bg-error-container text-on-error-container" role="note">
      <span className="material-symbols-outlined text-2xl shrink-0">emergency</span>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="font-label-lg text-label-lg">Is a pet or person in danger right now?</p>
        <p className="font-body-sm text-body-sm">
          Call our 24/7 safety line at{" "}
          <a className="font-bold underline whitespace-nowrap" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
            {phone}
          </a>
          . For a medical emergency, contact the nearest emergency vet or call 911. Safety reports sent here are marked urgent and handled first.
        </p>
      </div>
    </div>
  );
}
