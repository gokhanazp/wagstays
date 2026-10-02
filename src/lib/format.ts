const whole = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 });

/** "$32" for whole-dollar amounts, "$3.50" otherwise. Pass `{ exact: true }` to always show cents. */
export function formatMoney(cents: number, opts: { exact?: boolean } = {}) {
  const dollars = cents / 100;
  const s = opts.exact || cents % 100 !== 0 ? exact.format(dollars) : whole.format(dollars);
  return s.replace("CA$", "$");
}

export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function formatRating(r: number) {
  return r >= 5 ? "5.0" : r.toFixed(2).replace(/0$/, "");
}

export function timeAgo(date: Date, now = new Date()) {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  const m = Math.floor(days / 30);
  return `${m} month${m === 1 ? "" : "s"} ago`;
}

/** Haversine distance in km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
