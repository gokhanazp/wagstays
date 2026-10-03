import "server-only";
import { cache } from "react";
import { db } from "./db";
import { distanceKm } from "./format";
import { PET_SIZES, SERVICE_SLUGS, serviceFromSlug, type PetSize, type ServiceType } from "./constants";
import { getCurrentUser } from "./session";
import { freeSittersForRange } from "./availability";
import { formatDayRange, isIsoDay, todayIn } from "./availability-core";

export const DEFAULT_CITY_SLUG = "toronto";

/** All cities switched on from /admin/cities, with neighbourhoods. Default city first. */
export const getActiveCities = cache(async () => {
  const cities = await db.city.findMany({
    where: { isActive: true },
    include: { neighbourhoods: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  return cities.sort((a, b) => Number(b.slug === DEFAULT_CITY_SLUG) - Number(a.slug === DEFAULT_CITY_SLUG));
});

/** Neighbourhood used as the distance origin when the visitor hasn't picked one. */
export function defaultHoodOf<T extends { slug: string }>(city: { slug: string; neighbourhoods: T[] }): T | undefined {
  return (city.slug === DEFAULT_CITY_SLUG ? city.neighbourhoods.find((n) => n.slug === "the-beaches") : undefined) ?? city.neighbourhoods[0];
}

/** An active city by slug, falling back to the default (or first) active city. */
export const getActiveCity = cache(async (slug: string = DEFAULT_CITY_SLUG) => {
  const city = await db.city.findFirst({
    where: { slug, isActive: true },
    include: { neighbourhoods: { orderBy: { name: "asc" } } },
  });
  if (city) return city;
  return db.city.findFirstOrThrow({ where: { isActive: true }, include: { neighbourhoods: { orderBy: { name: "asc" } } } });
});

const sitterCardInclude = {
  neighbourhood: true,
  services: { where: { active: true } },
  tags: { orderBy: { sortOrder: "asc" as const } },
};

async function favoriteIds() {
  const user = await getCurrentUser();
  if (!user) return new Set<string>();
  const favs = await db.favorite.findMany({ where: { userId: user.id }, select: { sitterId: true } });
  return new Set(favs.map((f) => f.sitterId));
}

export async function getFeaturedSitters(citySlug?: string) {
  const city = await getActiveCity(citySlug);
  const [sitters, favs] = await Promise.all([
    db.sitterProfile.findMany({
      where: { cityId: city.id, featured: true, status: "ACTIVE", user: { suspended: false } },
      include: sitterCardInclude,
      orderBy: { createdAt: "asc" },
    }),
    favoriteIds(),
  ]);
  const centre = defaultHoodOf(city) ?? city;
  return sitters.map((s) => ({ ...s, distanceKm: distanceKm(centre, s), isFavorite: favs.has(s.id) }));
}

export async function getHomeTestimonials() {
  return db.review.findMany({ where: { featuredOnHome: true, hidden: false }, orderBy: { createdAt: "desc" }, take: 3 });
}

export async function getPlatformStats() {
  const [sitters, reviews] = await Promise.all([
    db.sitterProfile.aggregate({ _sum: { completedBookings: true, reviewCount: true }, _count: true, where: { status: "ACTIVE", user: { suspended: false } } }),
    db.review.aggregate({ _avg: { rating: true } }),
  ]);
  return {
    activeSitters: sitters._count,
    completedBookings: sitters._sum.completedBookings ?? 0,
    avgRating: reviews._avg.rating ?? 5,
  };
}

// ---------- Search ----------

export type SearchFilters = {
  city?: string;
  service?: ServiceType;
  hood?: string;
  minPrice?: number; // dollars
  maxPrice?: number; // dollars
  sizes: PetSize[];
  yard: boolean;
  smokeFree: boolean;
  noPets: boolean;
  noKids: boolean;
  superSitter: boolean;
  vet: boolean;
  trainer: boolean;
  idVerified: boolean;
  sort: "recommended" | "price-asc" | "price-desc" | "rating" | "distance";
  page: number;
  view: "list" | "map";
  /** availability filter: only sitters free from → to (YYYY-MM-DD; `to` = check-out for boarding) */
  from?: string;
  to?: string;
};

export const SEARCH_PAGE_SIZE = 4;
export const PRICE_RANGE = { min: 15, max: 110 }; // CAD per hour/visit/night

type RawParams = Record<string, string | string[] | undefined>;

export function parseSearchParams(sp: RawParams): SearchFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const flag = (k: string) => one(k) === "1" || one(k) === "true";
  const num = (k: string) => {
    const n = Number(one(k));
    return Number.isFinite(n) && one(k) !== undefined && one(k) !== "" ? n : undefined;
  };
  const sizes = (one("sizes") ?? "")
    .split(",")
    .map((s) => s.toUpperCase())
    .filter((s): s is PetSize => (PET_SIZES as readonly string[]).includes(s));
  const sort = one("sort");
  return {
    city: one("city") || undefined,
    service: serviceFromSlug(one("service")),
    hood: one("hood") || undefined,
    minPrice: num("minPrice"),
    maxPrice: num("maxPrice"),
    sizes,
    yard: flag("yard"),
    smokeFree: flag("smokeFree"),
    noPets: flag("noPets"),
    noKids: flag("noKids"),
    superSitter: flag("superSitter"),
    vet: flag("vet"),
    trainer: flag("trainer"),
    idVerified: flag("idVerified"),
    sort: (["price-asc", "price-desc", "rating", "distance"].includes(sort ?? "") ? sort : "recommended") as SearchFilters["sort"],
    page: Math.max(1, Math.floor(num("page") ?? 1)),
    view: one("view") === "map" ? "map" : "list",
    from: isIsoDay(one("from")) ? one("from") : undefined,
    to: isIsoDay(one("to")) ? one("to") : undefined,
  };
}

/** Serialises filters back to a query string (used for links / pagination). */
export function toSearchQuery(f: Partial<SearchFilters>) {
  const q = new URLSearchParams();
  if (f.city) q.set("city", f.city);
  if (f.service) q.set("service", SERVICE_SLUGS[f.service]);
  if (f.hood) q.set("hood", f.hood);
  if (f.minPrice !== undefined) q.set("minPrice", String(f.minPrice));
  if (f.maxPrice !== undefined) q.set("maxPrice", String(f.maxPrice));
  if (f.sizes?.length) q.set("sizes", f.sizes.join(",").toLowerCase());
  for (const k of ["yard", "smokeFree", "noPets", "noKids", "superSitter", "vet", "trainer", "idVerified"] as const) {
    if (f[k]) q.set(k, "1");
  }
  if (f.sort && f.sort !== "recommended") q.set("sort", f.sort);
  if (f.page && f.page > 1) q.set("page", String(f.page));
  if (f.view === "map") q.set("view", "map");
  if (f.from) q.set("from", f.from);
  if (f.to) q.set("to", f.to);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function searchSitters(f: SearchFilters) {
  const city = await getActiveCity(f.city);
  const centreHood = city.neighbourhoods.find((n) => n.slug === f.hood) ?? defaultHoodOf(city) ?? city.neighbourhoods[0];
  const [all, favs] = await Promise.all([
    db.sitterProfile.findMany({ where: { cityId: city.id, status: "ACTIVE", user: { suspended: false } }, include: sitterCardInclude }),
    favoriteIds(),
  ]);

  // Price shown on cards: the selected service, otherwise dog walking, otherwise the cheapest service.
  const withPrice = all.map((s) => {
    const svc =
      (f.service && s.services.find((x) => x.type === f.service)) ||
      s.services.find((x) => x.type === "DOG_WALKING") ||
      [...s.services].sort((a, b) => a.priceCents - b.priceCents)[0];
    return { ...s, price: svc, distanceKm: distanceKm(centreHood, s), isFavorite: favs.has(s.id) };
  });

  // Facet counts ignore the service filter itself so users can see alternatives.
  const serviceCounts = Object.fromEntries(
    (["DOG_WALKING", "BOARDING", "DAY_CARE", "DROP_IN"] as const).map((t) => [t, all.filter((s) => s.services.some((x) => x.type === t)).length]),
  ) as Record<ServiceType, number>;
  const medicalCount = all.filter((s) => s.vetKnowledge).length;

  const sizeOk = (s: (typeof withPrice)[number]) =>
    f.sizes.every((z) => ({ SMALL: s.acceptsSmall, MEDIUM: s.acceptsMedium, LARGE: s.acceptsLarge, GIANT: s.acceptsGiant })[z]);

  // availableLabel: "Available Oct 18–22" when a date range is searched
  let results: ((typeof withPrice)[number] & { availableLabel?: string })[] = withPrice.filter(
    (s) =>
      s.price &&
      (!f.service || s.services.some((x) => x.type === f.service)) &&
      (f.minPrice === undefined || s.price.priceCents >= f.minPrice * 100) &&
      (f.maxPrice === undefined || f.maxPrice >= PRICE_RANGE.max || s.price.priceCents <= f.maxPrice * 100) &&
      sizeOk(s) &&
      (!f.yard || s.hasYard) &&
      (!f.smokeFree || s.smokeFree) &&
      (!f.noPets || !s.hasOtherPets) &&
      (!f.noKids || !s.hasChildren) &&
      (!f.superSitter || s.isSuperSitter) &&
      (!f.vet || s.vetKnowledge) &&
      (!f.trainer || s.professionalTrainer) &&
      (!f.idVerified || s.idVerified),
  );

  // Dates: only sitters free for the whole range (for the chosen service, or any service they offer).
  // Past or reversed ranges are ignored so old shared links still show results.
  const from = f.from ?? (f.to ? f.to : undefined);
  if (from && from >= todayIn(city.timeZone, Date.now())) {
    const to = f.to && f.to >= from ? f.to : undefined;
    const free = await freeSittersForRange(
      results.map((s) => s.id),
      from,
      to,
      f.service,
    );
    const label = `Available ${formatDayRange(from, to)}`;
    results = results.filter((s) => free.has(s.id)).map((s) => ({ ...s, availableLabel: label }));
  }

  const score = (s: (typeof results)[number]) =>
    s.rating * 20 + Math.log10(1 + s.reviewCount) * 8 + (s.isSuperSitter ? 6 : 0) - s.distanceKm * 2;
  const sorters: Record<SearchFilters["sort"], (a: (typeof results)[number], b: (typeof results)[number]) => number> = {
    recommended: (a, b) => score(b) - score(a),
    "price-asc": (a, b) => a.price!.priceCents - b.price!.priceCents,
    "price-desc": (a, b) => b.price!.priceCents - a.price!.priceCents,
    rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    distance: (a, b) => a.distanceKm - b.distanceKm,
  };
  results = results.sort(sorters[f.sort]);

  const total = results.length;
  const pageCount = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  return {
    city,
    centreHood,
    total,
    page,
    pageCount,
    pageSize: SEARCH_PAGE_SIZE,
    sitters: results.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE),
    /** every match, for map pins */
    allMatches: results.map((s) => ({ id: s.id, slug: s.slug, displayName: s.displayName, lat: s.lat, lng: s.lng, priceCents: s.price!.priceCents, unit: s.price!.unit, rating: s.rating, avatarUrl: s.mapPhotoUrl ?? s.avatarUrl, locationNote: s.locationNote, distanceKm: s.distanceKm })),
    serviceCounts,
    medicalCount,
  };
}

export type SearchResult = Awaited<ReturnType<typeof searchSitters>>;
export type SitterCard = SearchResult["sitters"][number];

// ---------- Profile ----------

export const getSitterBySlug = cache(async (slug: string) => {
  const sitter = await db.sitterProfile.findUnique({
    where: { slug },
    include: {
      city: true,
      neighbourhood: true,
      services: { where: { active: true } },
      photos: { orderBy: { sortOrder: "asc" } },
      tags: { orderBy: { sortOrder: "asc" } },
      skills: { orderBy: { sortOrder: "asc" } },
      reviews: { where: { hidden: false }, orderBy: { createdAt: "desc" } },
      _count: { select: { photos: true } },
    },
  });
  // Hidden when the account is suspended or the city hasn't been opened yet.
  if (!sitter || !sitter.city.isActive) return null;
  if (await db.user.count({ where: { id: sitter.userId, suspended: true } })) return null;
  const favs = await favoriteIds();
  const hoods = await db.neighbourhood.findMany({ where: { cityId: sitter.cityId }, select: { slug: true, lat: true, lng: true } });
  const centre = defaultHoodOf({ slug: sitter.city.slug, neighbourhoods: hoods });
  return { ...sitter, isFavorite: favs.has(sitter.id), distanceKm: centre ? distanceKm(centre, sitter) : undefined };
});

export type SitterDetail = NonNullable<Awaited<ReturnType<typeof getSitterBySlug>>>;

export async function getOwnerPets(userId: string) {
  return db.pet.findMany({ where: { ownerId: userId, archivedAt: null }, include: { traits: true }, orderBy: { createdAt: "asc" } });
}

/** Favourited sitters in the same shape as search cards. */
export async function getFavoriteSitters(userId: string) {
  const city = await getActiveCity();
  const centre = defaultHoodOf(city) ?? city;
  const favs = await db.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { sitter: { include: sitterCardInclude } },
  });
  return favs.map(({ sitter: s }) => ({
    ...s,
    price: s.services.find((x) => x.type === "DOG_WALKING") ?? [...s.services].sort((a, b) => a.priceCents - b.priceCents)[0],
    distanceKm: distanceKm(centre, s),
    isFavorite: true,
  })) satisfies SitterCard[];
}
