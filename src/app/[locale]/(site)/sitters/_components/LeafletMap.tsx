"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useLocale } from "next-intl";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { formatMoney } from "@/lib/format";
import type { MapPin } from "./map-types";

const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY;
/**
 * CARTO Voyager tiles. CARTO now watermarks keyless raster requests ("API KEY REQUIRED"), so the key is read
 * from NEXT_PUBLIC_CARTO_API_KEY; without it we fall back to the standard OpenStreetMap tiles (dev-friendly).
 */
const TILES = CARTO_KEY
  ? {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${encodeURIComponent(CARTO_KEY)}`,
      subdomains: "abcd",
      attribution: `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    }
  : { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", subdomains: "abc", attribution: OSM_ATTR };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function pinIcon(pin: MapPin, active: boolean, locale: string) {
  const price = esc(formatMoney(pin.priceCents, { locale }));
  const html = active
    ? `<div class="ws-pin -translate-x-1/2 -translate-y-full w-max">
         <div class="px-3 py-1.5 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold shadow-lg flex items-center gap-1 transition-all hover:scale-110">
           <span class="material-symbols-outlined text-sm">pets</span><span>${price}</span>
         </div>
         <div class="w-3 h-3 bg-primary rotate-45 mx-auto -mt-1.5 shadow-sm"></div>
       </div>`
    : `<div class="ws-pin -translate-x-1/2 -translate-y-1/2 w-max">
         <div class="px-3 py-1 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm font-bold shadow-md flex items-center gap-1 hover:bg-primary hover:text-on-primary transition-all">
           <span>${price}</span>
         </div>
       </div>`;
  return L.divIcon({ html, className: "", iconSize: [0, 0], iconAnchor: [0, 0] });
}

function FitAndResize({ points, recenter, centre }: { points: [number, number][]; recenter: number; centre: [number, number] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (points.length === 0) map.setView(centre, 13);
    else if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit only when the set of points changes
  }, [key, map]);

  useEffect(() => {
    if (recenter > 0) map.flyTo(centre, 14, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- triggered by the counter only
  }, [recenter]);

  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);

  return null;
}

export default function LeafletMap({
  pins,
  focusIds,
  selectedId,
  onSelect,
  centre,
  recenter,
}: {
  pins: MapPin[];
  focusIds: string[];
  selectedId?: string;
  onSelect: (id: string) => void;
  centre: { lat: number; lng: number };
  recenter: number;
}) {
  const locale = useLocale();
  const icons = useMemo(() => new Map(pins.map((p) => [p.id, { on: pinIcon(p, true, locale), off: pinIcon(p, false, locale) }])), [pins, locale]);
  const focus = pins.filter((p) => focusIds.includes(p.id));
  const points = (focus.length ? focus : pins).map((p) => [p.lat, p.lng] as [number, number]);
  const c: [number, number] = [centre.lat, centre.lng];

  return (
    <MapContainer
      attributionControl
      center={c}
      className="w-full h-full bg-surface-container z-0"
      scrollWheelZoom={false}
      zoom={13}
      zoomControl={false}
    >
      <TileLayer {...TILES} />
      {pins.map((p) => (
        <Marker
          eventHandlers={{ click: () => onSelect(p.id) }}
          icon={p.id === selectedId ? icons.get(p.id)!.on : icons.get(p.id)!.off}
          key={p.id}
          keyboard
          position={[p.lat, p.lng]}
          title={`${p.displayName} · ${formatMoney(p.priceCents, { locale })}`}
          zIndexOffset={p.id === selectedId ? 1000 : 0}
        />
      ))}
      <FitAndResize centre={c} points={points} recenter={recenter} />
    </MapContainer>
  );
}
