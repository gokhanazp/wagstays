import { safeActiveCities } from "@/lib/seo/landing";

/** Every active city × neighbourhood. Returns [] when the database isn't reachable (e.g. CI builds). */
export async function hoodParams() {
  const cities = await safeActiveCities();
  return cities.flatMap((c) => c.neighbourhoods.map((n) => ({ city: c.slug, hood: n.slug })));
}

export async function cityParams() {
  const cities = await safeActiveCities();
  return cities.map((c) => ({ city: c.slug }));
}
