"use client";

export function ScrollToPicker({ targetId, label }: { targetId: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" })}
      className="px-space-xl py-3 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all shadow-[0_6px_16px_rgba(162,62,36,0.3)] flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-lg">calendar_month</span>
      <span>{label}</span>
    </button>
  );
}
