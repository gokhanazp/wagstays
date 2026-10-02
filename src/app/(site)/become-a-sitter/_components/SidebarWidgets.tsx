"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import { ESTIMATOR_NET_PER_SERVICE, ESTIMATOR_WEEKS_PER_MONTH } from "@/lib/sitter-application";

export function EarningsEstimator() {
  const [days, setDays] = useState(4);
  const [walks, setWalks] = useState(3);
  const weekly = ESTIMATOR_NET_PER_SERVICE * walks * days;
  const monthly = weekly * ESTIMATOR_WEEKS_PER_MONTH;
  const money = (dollars: number) => formatMoney(Math.round(dollars) * 100);

  return (
    <>
      <div className="bg-surface-container-low p-space-md rounded-2xl flex flex-col items-center text-center">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
          Your Estimated Monthly Income
        </span>
        <div className="flex items-baseline gap-1 my-1">
          <span aria-live="polite" className="font-display-lg text-display-lg text-secondary tracking-tight">
            {money(monthly)}
          </span>
          <span className="font-title-md text-title-md text-on-surface-variant">/ mo</span>
        </div>
        <p className="font-body-sm text-body-sm text-primary font-semibold flex items-center gap-1">
          <span className="material-symbols-outlined text-base">trending_up</span>≈ {money(weekly)} per week
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center font-label-md text-label-md">
          <label className="text-on-surface-variant" htmlFor="daysSlider">
            Days per week?
          </label>
          <span className="font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded-lg">
            {days} {days === 1 ? "Day" : "Days"}
          </span>
        </div>
        <input
          className="w-full accent-secondary cursor-pointer h-2 bg-surface-container rounded-lg"
          id="daysSlider"
          max={7}
          min={1}
          onChange={(e) => setDays(Number(e.target.value))}
          type="range"
          value={days}
        />
        <div className="flex justify-between text-label-sm font-label-sm text-outline-variant">
          <span>1 day</span>
          <span>Weekends</span>
          <span>Full-time (7 days)</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 pt-2">
        <div className="flex justify-between items-center font-label-md text-label-md">
          <label className="text-on-surface-variant" htmlFor="walksSlider">
            Walks / visits per day?
          </label>
          <span className="font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded-lg">
            {walks} {walks === 1 ? "Pet" : "Pets"}
          </span>
        </div>
        <input
          className="w-full accent-secondary cursor-pointer h-2 bg-surface-container rounded-lg"
          id="walksSlider"
          max={6}
          min={1}
          onChange={(e) => setWalks(Number(e.target.value))}
          type="range"
          value={walks}
        />
        <div className="flex justify-between text-label-sm font-label-sm text-outline-variant">
          <span>1 pet</span>
          <span>3 pets</span>
          <span>6 pets (max)</span>
        </div>
      </div>
    </>
  );
}

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div className="rounded-2xl bg-surface-container-low p-space-sm" key={item.q}>
            <button
              aria-controls={`faq-${i}`}
              aria-expanded={isOpen}
              className="w-full font-label-lg text-label-lg text-on-surface flex items-center justify-between gap-2 text-left cursor-pointer"
              onClick={() => setOpen(isOpen ? null : i)}
              type="button"
            >
              <span>{item.q}</span>
              <span className={`material-symbols-outlined text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}>
                expand_more
              </span>
            </button>
            <p
              className={`font-body-sm text-body-sm text-on-surface-variant mt-2 pl-1 leading-relaxed ${isOpen ? "" : "hidden"}`}
              id={`faq-${i}`}
            >
              {item.a}
            </p>
          </div>
        );
      })}
    </>
  );
}
