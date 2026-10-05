import "server-only";
import type { Metadata } from "next";
import { createTranslator } from "next-intl";
import { cache } from "react";
import { intlLocale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { distanceKm, formatMoney, formatRating } from "@/lib/format";
import { defaultHoodOf, getActiveCities } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import type { ServiceType } from "@/lib/constants";
import { localeAlternates } from "@/lib/seo/site";
import en from "../../../messages/en/landing.json";
import fr from "../../../messages/fr/landing.json";

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
      include: { neighbourhood: true, services: { where: { active: true } }, tags: { orderBy: { sortOrder: "asc" } }, species: { select: { kind: true } } },
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
// User-facing copy comes from messages/{en,fr}/landing.json; every function takes an optional `locale` (English default).

const tr = (locale = "en") =>
  createTranslator({ locale: locale === "fr" ? "fr" : "en", messages: { landing: locale === "fr" ? fr : en }, namespace: "landing" });
type Tr = ReturnType<typeof tr>;

function listJoin(t: Tr, items: string[]) {
  if (items.length <= 1) return items.join("");
  return t("copy.listJoin", { rest: items.slice(0, -1).join(", "), last: items[items.length - 1] });
}

const serviceLabel = (t: Tr, p: Pick<PriceRange, "type">) => t(`services.${p.type}.label`);
const serviceUnit = (t: Tr, p: Pick<PriceRange, "type">) => t(`services.${p.type}.unit`);

export function priceText(p: PriceRange, locale = "en") {
  const t = tr(locale);
  const unit = serviceUnit(t, p);
  return p.min === p.max
    ? t("copy.priceOne", { price: formatMoney(p.min, { locale }), unit })
    : t("copy.priceRange", { min: formatMoney(p.min, { locale }), max: formatMoney(p.max, { locale }), unit });
}

/** Translated label and unit of a price row ("dog walks" / "walk"). */
export function priceLabel(p: Pick<PriceRange, "type">, locale = "en") {
  const t = tr(locale);
  return { label: serviceLabel(t, p), unit: serviceUnit(t, p) };
}

export function landingNoun(l: Pick<Landing, "service">, locale = "en") {
  const t = tr(locale);
  const k = l.service === "DOG_WALKING" ? "walker" : "sitter";
  return { one: t(`noun.${k}.one`), many: t(`noun.${k}.many`), title: t(`noun.${k}.title`), manyCap: t(`noun.${k}.manyCap`) };
}

export function landingPlace(l: Pick<Landing, "city" | "hood">) {
  return l.hood ? `${l.hood.name}, ${l.city.name}` : `${l.city.name}, ${l.city.provinceCode}`;
}

export function landingTitle(l: Landing, locale = "en") {
  return tr(locale)("copy.title", { nounTitle: landingNoun(l, locale).title, place: landingPlace(l) });
}

/** Short unique intro paragraph built from the neighbourhood's own numbers. */
export function landingIntro(l: Landing, locale = "en"): string[] {
  const t = tr(locale);
  const { one, many } = landingNoun(l, locale);
  const where = l.hood?.name ?? l.city.name;
  const out: string[] = [];

  if (!l.hood) {
    out.push(
      t("copy.introCity", {
        city: l.city.name,
        count: l.servingCount,
        one,
        many,
        hoods: l.city.neighbourhoods.length,
        list: listJoin(t, l.city.neighbourhoods.slice(0, 3).map((n) => n.name)),
      }),
    );
  } else if (l.localCount > 0) {
    const names = listJoin(t, l.nearbyHoodNames);
    out.push(
      // nearby sitters always have a neighbourhood, so `names` is set whenever nearbyCount is
      l.nearbyCount && names
        ? t("copy.introLocalNearby", { one, many, where, count: l.localCount, nearby: l.nearbyCount, km: NEARBY_KM, names })
        : t("copy.introLocal", { one, many, where, count: l.localCount }),
    );
  } else if (l.nearbyCount > 0) {
    out.push(t("copy.introNearby", { one, many, where, count: l.nearbyCount, km: NEARBY_KM, names: listJoin(t, l.nearbyHoodNames) }));
  } else {
    out.push(t("copy.introGrowing", { one, where, city: l.city.name }));
  }

  const rating = l.avgRating !== null ? formatRating(l.avgRating, locale) : null;
  const reviews = l.reviewTotal.toLocaleString(intlLocale(locale));
  const prices = l.prices.length
    ? listJoin(
        t,
        l.prices.slice(0, 2).map((p) => t("copy.factsPrice", { label: serviceLabel(t, p), price: formatMoney(p.min, { locale }), unit: serviceUnit(t, p) })),
      )
    : null;
  if (rating && prices) out.push(t("copy.factsBoth", { rating, reviews, prices }));
  else if (rating) out.push(t("copy.factsRating", { rating, reviews }));
  else if (prices) out.push(t("copy.factsPrices", { prices }));
  if (l.parks.length) out.push(t("copy.parks", { parks: listJoin(t, l.parks) }));
  return [out.join(" ")];
}

export function landingDescription(l: Landing, locale = "en") {
  const t = tr(locale);
  const { one, many } = landingNoun(l, locale);
  const n = l.servingCount || l.cards.length;
  const place = landingPlace(l);
  const parts = [l.hood ? t("copy.descHood", { count: n, one, many, place }) : t("copy.descCity", { count: n, one, many, place })];
  if (l.avgRating !== null) parts.push(t("copy.descRating", { rating: formatRating(l.avgRating, locale), reviews: l.reviewTotal.toLocaleString(intlLocale(locale)) }));
  if (l.prices[0]) {
    const label = serviceLabel(t, l.prices[0]);
    parts.push(t("copy.descFrom", { label: `${label[0].toUpperCase()}${label.slice(1)}`, price: formatMoney(l.prices[0].min, { locale }) }));
  }
  parts.push(t("copy.descTrust"));
  return parts.join(" ");
}

/** Canonical path of a landing page (optionally for a sibling neighbourhood). */
export function landingPath(l: Pick<Landing, "city" | "hood" | "service">, hoodSlug = l.hood?.slug) {
  const base = l.service === "DOG_WALKING" ? "/dog-walkers" : "/pet-sitters";
  return hoodSlug ? `${base}/${l.city.slug}/${hoodSlug}` : `${base}/${l.city.slug}`;
}

export function landingMetadata(l: Landing | null, locale = "en"): Metadata {
  if (!l) return { title: tr(locale)("copy.notFound") };
  const title = landingTitle(l, locale);
  const description = landingDescription(l, locale);
  const alternates = localeAlternates(landingPath(l), locale);
  const url = alternates.canonical;
  const images = [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    alternates,
    openGraph: { type: "website", siteName: "WagStays", locale: locale === "fr" ? "fr_CA" : "en_CA", title, description, url, images },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image.png"] },
  };
}

export type Faq = { q: string; a: string };

export function landingFaqs(l: Landing, vetCoverageCents: number, locale = "en"): Faq[] {
  const t = tr(locale);
  const { one, many, manyCap } = landingNoun(l, locale);
  const where = l.hood?.name ?? l.city.name;
  const faqs: Faq[] = [];
  if (l.prices.length) {
    faqs.push({
      q: t("faq.costQ", { one, where }),
      a: t("faq.costA", {
        manyCap,
        where,
        list: listJoin(
          t,
          l.prices.map((p) => (l.prices.length > 1 ? t("faq.costItem", { price: priceText(p, locale), label: serviceLabel(t, p) }) : priceText(p, locale))),
        ),
      }),
    });
  }
  if (l.service === "DOG_WALKING" && l.walkMins) {
    const { min, max } = l.walkMins;
    faqs.push({
      q: t("faq.walkQ", { where }),
      a: t("faq.walkA", { where, duration: min === max ? t("faq.walkMinutes", { min }) : t("faq.walkMinutesRange", { min, max }) }),
    });
  }
  const shown = l.servingCount || l.cards.length;
  faqs.push({
    q: t("faq.verifiedQ", { many, where }),
    a: t("faq.verifiedA", { shown, one, many, where, id: l.idVerified, bg: l.backgroundChecked }),
  });
  faqs.push({
    q: t("faq.coveredQ"),
    a: t("faq.coveredA", { amount: formatMoney(vetCoverageCents, { locale }) }),
  });
  faqs.push({
    q: t("faq.meetQ", { one }),
    a: t("faq.meetA"),
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
