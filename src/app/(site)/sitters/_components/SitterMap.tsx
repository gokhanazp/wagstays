"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { formatDistance, formatMoney, formatRating } from "@/lib/format";
import { PetKindIcons } from "@/components/PetKinds";
import type { MapPin } from "./map-types";
import { UNIT_SHORT } from "./search-url";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-surface-container animate-pulse" />,
});

export function SitterMap({
  pins,
  focusIds,
  centre,
  liveLabel,
  heightClass = "h-[580px]",
}: {
  pins: MapPin[];
  focusIds: string[];
  centre: { lat: number; lng: number };
  liveLabel: string;
  heightClass?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(focusIds[0] ?? pins[0]?.id);
  const [recenter, setRecenter] = useState(0);
  // Re-select the first visible card whenever the result page changes (filters / sort / page).
  const [prevFirst, setPrevFirst] = useState(focusIds[0]);
  if (prevFirst !== focusIds[0]) {
    setPrevFirst(focusIds[0]);
    setSelectedId(focusIds[0] ?? pins[0]?.id);
  }
  const selected = pins.find((p) => p.id === selectedId);

  return (
    <div className={`relative w-full ${heightClass} rounded-3xl overflow-hidden shadow-sm bg-surface-container isolate`}>
      <LeafletMap centre={centre} focusIds={focusIds} onSelect={setSelectedId} pins={pins} recenter={recenter} selectedId={selectedId} />
      {/* Map Overlay Controls */}
      <div className="absolute z-[1000] top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-surface-container-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 text-on-surface font-label-sm text-label-sm">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>{liveLabel}</span>
        </div>
        <button
          aria-label="Recentre map"
          className="pointer-events-auto w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-md flex items-center justify-center text-on-surface hover:text-primary transition-colors"
          onClick={() => setRecenter((n) => n + 1)}
          type="button"
        >
          <span className="material-symbols-outlined text-lg">my_location</span>
        </button>
      </div>
      {/* Floating Map Sitter Preview Mini-Card */}
      {selected && (
        <Link
          className="absolute z-[1000] bottom-7 inset-x-4 max-w-[420px] p-space-sm bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-xl flex items-center gap-space-sm group"
          href={`/sitters/${selected.slug}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- small fixed thumbnail */}
          <img alt={selected.displayName} className="w-14 h-14 rounded-xl object-cover shrink-0" src={selected.avatarUrl} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">{selected.displayName}</span>
              <span className="font-label-sm text-label-sm text-primary font-extrabold shrink-0">
                {formatMoney(selected.priceCents)}/{UNIT_SHORT[selected.unit] ?? "visit"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5 min-w-0">
              <span className="material-symbols-outlined text-xs text-secondary">star</span>
              <span className="font-bold">{formatRating(selected.rating)}</span>
              <span className="truncate">
                • {selected.locationNote ?? "Nearby"} ({formatDistance(selected.distanceKm)})
              </span>
            </div>
            <PetKindIcons className="mt-0.5" kinds={selected.kinds} />
          </div>
          <span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </span>
        </Link>
      )}
    </div>
  );
}
