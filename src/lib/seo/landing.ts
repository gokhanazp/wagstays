import "server-only";
import type { Metadata } from "next";
import { cache } from "react";
import { db } from "@/lib/db";
import { distanceKm, formatMoney, formatRating } from "@/lib/format";
import { defaultHoodOf, getActiveCities } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import type { ServiceType } from "@/lib/constants";

/** Sitters whose home is within this distance of a neighbourhood are listed as "nearby" on its landing page. */
export const NEARBY_KM = 5;
const MAX_CARDS = 6;

/**
 * Well-known parks per neighbourhood (`<city>/<hood>` slug). Only used when present — cities without an entry simply
 * skip the "popular walking spots" sentence. Extend when a city goes live.
 */
const PARKS: Record<string, string[]> = {
  "toronto/the-beaches": ["Kew Gardens", "Woodbine Beach", "Ashbridges Bay Park"],
  "toronto/upper-beaches": ["Glen Stewart Ravine", "Williamson Park Ravine"],
  "toronto/leslieville": ["Jonathan Ashbridge Park", "Greenwood Park", "Leslie Grove Park"],
  "toronto/riverside": ["Riverdale Park East", "Jimmie Simpson Park"],
  "toronto/east-danforth": ["Monarch Park", "Dentonia Park", "East Lynn Park"],
  "toronto/leaside": ["Sunnybrook Park", "Serena Gundy Park", "Trace Manes Park"],
  "toronto/yorkville": ["Ramsden Park", "Village of Yorkville Park"],
  "toronto/the-annex": ["Christie Pits Park", "Jean Sibelius Square"],
  "toronto/kensington-market": ["Bellevue Square Park", "Grange Park"],
  "toronto/liberty-village": ["Liberty Village Park", "Stanley Park"],
  "toronto/roncesvalles": ["High Park", "Sorauren Park"],
  "toronto/high-park": ["High Park", "Grenadier Pond"],
};

const SERVICE_NOUN: Record<ServiceType, { label: string; unit: string }> = {
  DOG_WALKING: { label: "dog walks", unit: "walk" },
  BOARDING: { label: "overnight boarding", unit: "night" },
  DAY_CARE: { label: "doggy day care", unit: "day" },
  DROP_IN: { label: "drop-in visits", unit: "visit" },
};
const SERVICE_ORDER: ServiceType[] = ["DOG_WALKING", "BOARDING", "DROP_IN", "DAY_CARE"];

/** One query per request: the active city, its neighbourhoods and every bookable sitter in it. */
export const getLandingCity = cache(async (citySlug: string) => {
  const city = await db.city.findFirst({
    where: { slug: citySlug, isActive: true },
    include: { neighbourhoods: { orderBy: { name: "asc" } } },
  });
  if (!city) return null;
  const [sitters, favs] = await Promise.all([
    db.sitterProfile.findMany({
      where: { cityId: city.id, status: "ACTIVE", user: { suspended: false } },
      include: { neighbourhood: true, services: { where: { active: true } }, tags: { orderBy: { sortOrder: "asc" } } },
    }),
    favouriteIds(),
  ]);
  return { city, sitters, favs };
});

async function favouriteIds() {
  const user = await getCurrentUser();
  if (!user) return new Set<string>();
  const rows = await db.favorite.findMany({ where: { userId: user.id }, select: { sitterId: true } });
  return new Set(rows.map((r) => r.sitterId));
}

type CityData = NonNullable<Awaited<ReturnType<typeof getLandingCity>>>;
type Hood = CityData["city"]["neighbourhoods"][number];

export type PriceRange = { type: ServiceType; label: string; unit: string; min: number; max: number };

function score(s: { rating: number; reviewCount: number; isSuperSitter: boolean }, km: number) {
  return s.rating * 20 + Math.log10(1 + s.reviewCount) * 8 + (s.isSuperSitter ? 6 : 0) - km * 2;
}

/**
 * Everything a landing page renders, derived from live data: sitters based in the neighbourhood first, then the best
 * rated ones within NEARBY_KM. `service` narrows to sitters offering it (dog-walker pages).
 */
export function buildLanding(data: CityData, hood: Hood | null, service?: ServiceType) {
  const { city, sitters, favs } = data;
  const centre = hood ?? defaultHoodOf(city) ?? city;
  const offers = (s: (typeof sitters)[number]) => !service || s.services.some((x) => x.type === service);

  const pool = sitters
    .filter((s) => s.services.length > 0 && offers(s))
    .map((s) => {
      const price =
        (service && s.services.find((x) => x.type === service)) ||
        s.services.find((x) => x.type === "DOG_WALKING") ||
        [...s.services].sort((a, b) => a.priceCents - b.priceCents)[0];
      const km = distanceKm(centre, s);
      return { ...s, price, distanceKm: km, isFavorite: favs.has(s.id), local: hood ? s.neighbourhoodId === hood.id : true };
    });

  const local = pool.filter((s) => s.local);
  const nearby = hood ? pool.filter((s) => !s.local && s.distanceKm <= NEARBY_KM) : [];
  const serving = [...local, ...nearby];
  const ranked = [...serving].sort((a, b) => Number(b.local) - Number(a.local) || score(b, b.distanceKm) - score(a, a.distanceKm));
  // City pages rank everyone; neighbourhood pages fall back to the closest sitters if nobody is within NEARBY_KM.
  const cards = (ranked.length ? ranked : [...pool].sort((a, b) => a.distanceKm - b.distanceKm)).slice(0, MAX_CARDS);

  const rated = serving.filter((s) => s.reviewCount > 0);
  const reviewTotal = rated.reduce((n, s) => n + s.reviewCount, 0);
  const avgRating = reviewTotal ? rated.reduce((n, s) => n + s.rating * s.reviewCount, 0) / reviewTotal : null;

  const types = service ? [service] : SERVICE_ORDER;
  const prices: PriceRange[] = types.flatMap((type) => {
    const cents = serving.flatMap((s) => s.services.filter((x) => x.type === type).map((x) => x.priceCents));
    if (!cents.length) return [];
    return [{ type, ...SERVICE_NOUN[type], min: Math.min(...cents), max: Math.max(...cents) }];
  });

  const walkMins = serving.flatMap((s) => s.services.filter((x) => x.type === "DOG_WALKING" && x.durationMins).map((x) => x.durationMins!));

  const nearbyHoodNames = [...new Set(nearby.sort((a, b) => a.distanceKm - b.distanceKm).map((s) => s.neighbourhood.name))].slice(0, 3);
  const parks = hood
    ? [
        ...new Set([
          ...(PARKS[`${city.slug}/${hood.slug}`] ?? []),
          ...local.map((s) => s.locationNote?.replace(/^Near\s+/i, "") ?? "").filter((n) => /\b(Park|Beach|Ravine|Gardens)\b/.test(n)),
        ]),
      ].slice(0, 3)
    : [];

  // Sibling neighbourhoods, closest first, with how many sitters live there.
  const countByHood = new Map<string, number>();
  for (const s of pool) countByHood.set(s.neighbourhoodId, (countByHood.get(s.neighbourhoodId) ?? 0) + 1);
  const siblings = city.neighbourhoods
    .filter((n) => n.id !== hood?.id)
    .map((n) => ({ slug: n.slug, name: n.name, count: countByHood.get(n.id) ?? 0, km: distanceKm(centre, n) }))
    .sort((a, b) => (hood ? a.km - b.km : a.name.localeCompare(b.name)));

  return {
    city,
    hood,
    service,
    cards,
    localCount: local.length,
    nearbyCount: nearby.length,
    servingCount: serving.length,
    nearbyHoodNames,
    avgRating,
    reviewTotal,
    prices,
    walkMins: walkMins.length ? { min: Math.min(...walkMins), max: Math.max(...walkMins) } : null,
    idVerified: serving.filter((s) => s.idVerified).length,
    backgroundChecked: serving.filter((s) => s.backgroundChecked).length,
    firstAid: serving.filter((s) => s.firstAidCertified).length,
    parks,
    siblings,
  };
}

export type Landing = ReturnType<typeof buildLanding>;

// ---------- Copy ----------

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function priceText(p: PriceRange) {
  return p.min === p.max ? `${formatMoney(p.min)} per ${p.unit}` : `${formatMoney(p.min)}–${formatMoney(p.max)} per ${p.unit}`;
}

export function landingNoun(l: Pick<Landing, "service">) {
  return l.service === "DOG_WALKING" ? { one: "dog walker", many: "dog walkers", title: "Dog Walkers" } : { one: "pet sitter", many: "pet sitters", title: "Pet Sitters" };
}

export function landingPlace(l: Pick<Landing, "city" | "hood">) {
  return l.hood ? `${l.hood.name}, ${l.city.name}` : `${l.city.name}, ${l.city.provinceCode}`;
}

export function landingTitle(l: Landing) {
  return `Trusted ${landingNoun(l).title} in ${landingPlace(l)}`;
}

/** Short unique intro paragraph built from the neighbourhood's own numbers. */
export function landingIntro(l: Landing): string[] {
  const noun = landingNoun(l);
  const where = l.hood?.name ?? l.city.name;
  const out: string[] = [];

  if (!l.hood) {
    out.push(
      `WagStays connects ${l.city.name} pet parents with ${plural(l.servingCount, `verified ${noun.one}`, `verified ${noun.many}`)} across ${plural(
        l.city.neighbourhoods.length,
        "neighbourhood",
      )}, from ${listJoin(l.city.neighbourhoods.slice(0, 3).map((n) => n.name))} and beyond.`,
    );
  } else if (l.localCount > 0) {
    const more = l.nearbyCount
      ? ` and ${l.nearbyCount} more within ${NEARBY_KM} km${l.nearbyHoodNames.length ? ` in ${listJoin(l.nearbyHoodNames)}` : ""}`
      : "";
    out.push(`Looking for a ${noun.one} in ${where}? WagStays has ${plural(l.localCount, `verified ${noun.one}`, `verified ${noun.many}`)} based right in ${where}${more}.`);
  } else if (l.nearbyCount > 0) {
    out.push(
      `No ${noun.many} are based in ${where} just yet, but ${plural(l.nearbyCount, `verified ${noun.one}`, `verified ${noun.many}`)} within ${NEARBY_KM} km${
        l.nearbyHoodNames.length ? ` (${listJoin(l.nearbyHoodNames)})` : ""
      } can help.`,
    );
  } else {
    out.push(`We're still growing our ${noun.one} community in ${where}. Here are the closest WagStays sitters in ${l.city.name}.`);
  }

  const facts: string[] = [];
  if (l.avgRating !== null) facts.push(`rated ${formatRating(l.avgRating)} out of 5 on average across ${l.reviewTotal.toLocaleString("en-CA")} reviews`);
  if (l.prices.length) {
    facts.push(
      `with ${listJoin(l.prices.slice(0, 2).map((p) => `${p.label} from ${formatMoney(p.min)} per ${p.unit}`))} (before tax)`,
    );
  }
  if (facts.length) out.push(`They're ${facts.join(", ")}.`);
  if (l.parks.length) out.push(`Favourite local walking spots include ${listJoin(l.parks)}.`);
  return [out.join(" ")];
}

export function landingDescription(l: Landing) {
  const noun = landingNoun(l);
  const n = l.servingCount || l.cards.length;
  const parts = [`Compare ${plural(n, `trusted ${noun.one}`, `trusted ${noun.many}`)} ${l.hood ? "in and around" : "in"} ${landingPlace(l)}.`];
  if (l.avgRating !== null) parts.push(`Rated ${formatRating(l.avgRating)}/5 from ${l.reviewTotal.toLocaleString("en-CA")} reviews.`);
  if (l.prices[0]) parts.push(`${l.prices[0].label[0].toUpperCase()}${l.prices[0].label.slice(1)} from ${formatMoney(l.prices[0].min)}.`);
  parts.push("Verified sitters and vet care coverage on every booking.");
  return parts.join(" ");
}

/** Canonical path of a landing page (optionally for a sibling neighbourhood). */
export function landingPath(l: Pick<Landing, "city" | "hood" | "service">, hoodSlug = l.hood?.slug) {
  const base = l.service === "DOG_WALKING" ? "/dog-walkers" : "/pet-sitters";
  return hoodSlug ? `${base}/${l.city.slug}/${hoodSlug}` : `${base}/${l.city.slug}`;
}

export function landingMetadata(l: Landing | null): Metadata {
  if (!l) return { title: "Page not found" };
  const title = landingTitle(l);
  const description = landingDescription(l);
  const url = landingPath(l);
  const images = [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: "WagStays", locale: "en_CA", title, description, url, images },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image.png"] },
  };
}

export type Faq = { q: string; a: string };

export function landingFaqs(l: Landing, vetCoverageCents: number): Faq[] {
  const noun = landingNoun(l);
  const where = l.hood?.name ?? l.city.name;
  const faqs: Faq[] = [];
  if (l.prices.length) {
    faqs.push({
      q: `How much does a ${noun.one} cost in ${where}?`,
      a: `${noun.many[0].toUpperCase()}${noun.many.slice(1)} serving ${where} on WagStays charge ${listJoin(
        l.prices.map((p) => (l.prices.length > 1 ? `${priceText(p)} for ${p.label}` : priceText(p))),
      )}. Prices are set by each sitter and shown before HST.`,
    });
  }
  if (l.service === "DOG_WALKING" && l.walkMins) {
    faqs.push({
      q: `How long is a dog walk in ${where}?`,
      a: `Walks booked through WagStays in ${where} last ${
        l.walkMins.min === l.walkMins.max ? `${l.walkMins.min} minutes` : `${l.walkMins.min} to ${l.walkMins.max} minutes`
      }, depending on the walker. You can book one-off walks or a weekly recurring schedule.`,
    });
  }
  const shown = l.servingCount || l.cards.length;
  faqs.push({
    q: `Are WagStays ${noun.many} in ${where} verified?`,
    a: `Every sitter is reviewed by the WagStays team before their profile goes live. Of the ${plural(shown, noun.one, noun.many)} serving ${where}, ${l.idVerified} ${
      l.idVerified === 1 ? "has" : "have"
    } a verified government ID and ${l.backgroundChecked} ${l.backgroundChecked === 1 ? "has" : "have"} a clear police vulnerable sector check — look for the badges on each profile.`,
  });
  faqs.push({
    q: "Is my pet covered if something goes wrong?",
    a: `Yes. Every booking includes WagShield protection with up to ${formatMoney(vetCoverageCents)} in emergency vet care coverage.`,
  });
  faqs.push({
    q: `Can I meet a ${noun.one} before booking?`,
    a: "Yes. You can request a free Meet & Greet when you send a booking request, and you can message any sitter before you book.",
  });
  return faqs;
}

/** Active cities with their neighbourhoods — for generateStaticParams, the sitemap and the footer. Never throws. */
export async function safeActiveCities() {
  try {
    return await getActiveCities();
  } catch (e) {
    console.warn("[seo] could not load active cities (no database?)", (e as Error).message);
    return [];
  }
}

/** Neighbourhoods with the most bookable sitters, for the footer's "Popular neighbourhoods". */
export async function popularNeighbourhoods(limit = 8) {
  try {
    const cities = await getActiveCities();
    const city = cities[0];
    if (!city) return [];
    const counts = await db.sitterProfile.groupBy({
      by: ["neighbourhoodId"],
      where: { cityId: city.id, status: "ACTIVE", user: { suspended: false } },
      _count: true,
    });
    const byId = new Map(counts.map((c) => [c.neighbourhoodId, c._count]));
    return city.neighbourhoods
      .map((n) => ({ href: `/pet-sitters/${city.slug}/${n.slug}`, name: n.name, count: byId.get(n.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((n) => ({ ...n, cityHref: `/pet-sitters/${city.slug}`, cityName: city.name }));
  } catch {
    return [];
  }
}
