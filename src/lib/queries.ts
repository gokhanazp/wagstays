import "server-only";
import { cache } from "react";
import { db } from "./db";
import { distanceKm } from "./format";
import { PET_SIZES, SERVICE_SLUGS, serviceFromSlug, type PetSize, type ServiceType } from "./constants";
import { getCurrentUser } from "./session";

/** The launch city. Later the admin panel toggles City.isActive and the user picks a city. */
export const getActiveCity = cache(async (slug = "toronto") => {
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

export async function getFeaturedSitters() {
  const city = await getActiveCity();
  const [sitters, favs] = await Promise.all([
    db.sitterProfile.findMany({
      where: { cityId: city.id, featured: true, status: "ACTIVE" },
      include: sitterCardInclude,
      orderBy: { createdAt: "asc" },
    }),
    favoriteIds(),
  ]);
  const centre = city.neighbourhoods.find((n) => n.slug === "the-beaches") ?? city;
  return sitters.map((s) => ({ ...s, distanceKm: distanceKm(centre, s), isFavorite: favs.has(s.id) }));
}

export async function getHomeTestimonials() {
  return db.review.findMany({ where: { featuredOnHome: true }, orderBy: { createdAt: "desc" }, take: 3 });
}

export async function getPlatformStats() {
  const [sitters, reviews] = await Promise.all([
    db.sitterProfile.aggregate({ _sum: { completedBookings: true, reviewCount: true }, _count: true, where: { status: "ACTIVE" } }),
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
  };
}

/** Serialises filters back to a query string (used for links / pagination). */
export function toSearchQuery(f: Partial<SearchFilters>) {
  const q = new URLSearchParams();
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
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function searchSitters(f: SearchFilters) {
  const city = await getActiveCity();
  const centreHood = city.neighbourhoods.find((n) => n.slug === (f.hood ?? "the-beaches")) ?? city.neighbourhoods[0];
  const [all, favs] = await Promise.all([
    db.sitterProfile.findMany({ where: { cityId: city.id, status: "ACTIVE" }, include: sitterCardInclude }),
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

  let results = withPrice.filter(
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
    allMatches: results.map((s) => ({ id: s.id, slug: s.slug, displayName: s.displayName, lat: s.lat, lng: s.lng, priceCents: s.price!.priceCents, rating: s.rating, avatarUrl: s.mapPhotoUrl ?? s.avatarUrl, locationNote: s.locationNote, distanceKm: s.distanceKm })),
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
      reviews: { orderBy: { createdAt: "desc" } },
      _count: { select: { photos: true } },
    },
  });
  if (!sitter) return null;
  const favs = await favoriteIds();
  const centre = sitter.city.lat ? (await getActiveCity()).neighbourhoods.find((n) => n.slug === "the-beaches") : undefined;
  return { ...sitter, isFavorite: favs.has(sitter.id), distanceKm: centre ? distanceKm(centre, sitter) : undefined };
});

export type SitterDetail = NonNullable<Awaited<ReturnType<typeof getSitterBySlug>>>;

export async function getOwnerPets(userId: string) {
  return db.pet.findMany({ where: { ownerId: userId }, include: { traits: true }, orderBy: { createdAt: "asc" } });
}
