import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo/site";

// Regenerated at most once an hour (ISR). Without a database (CI builds) only the static pages are listed.
export const revalidate = 3600;

const STATIC: { path: string; changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/sitters", changeFrequency: "daily", priority: 0.9 },
  { path: "/become-a-sitter", changeFrequency: "monthly", priority: 0.7 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.6 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/pipeda", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC.map((s) => ({ url: absoluteUrl(s.path), changeFrequency: s.changeFrequency, priority: s.priority }));

  try {
    const cities = await db.city.findMany({
      where: { isActive: true },
      select: { slug: true, neighbourhoods: { select: { id: true, slug: true }, orderBy: { name: "asc" } } },
    });
    const sitters = await db.sitterProfile.findMany({
      where: { status: "ACTIVE", city: { isActive: true }, user: { suspended: false } },
      select: {
        slug: true,
        createdAt: true,
        neighbourhoodId: true,
        services: { where: { active: true }, select: { type: true } },
        reviews: { where: { hidden: false }, select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        application: { select: { reviewedAt: true } },
      },
      orderBy: { slug: "asc" },
    });

    // A profile changes when it's approved and whenever a new (visible) review lands.
    const lastMod = (s: (typeof sitters)[number]) =>
      new Date(Math.max(s.createdAt.getTime(), s.reviews[0]?.createdAt.getTime() ?? 0, s.application?.reviewedAt?.getTime() ?? 0));
    const newest = (list: typeof sitters) => (list.length ? new Date(Math.max(...list.map((s) => lastMod(s).getTime()))) : undefined);

    for (const c of cities) {
      const inCity = sitters.filter((s) => c.neighbourhoods.some((n) => n.id === s.neighbourhoodId));
      entries.push({ url: absoluteUrl(`/pet-sitters/${c.slug}`), lastModified: newest(inCity), changeFrequency: "weekly", priority: 0.8 });
      for (const n of c.neighbourhoods) {
        const local = inCity.filter((s) => s.neighbourhoodId === n.id);
        entries.push({ url: absoluteUrl(`/pet-sitters/${c.slug}/${n.slug}`), lastModified: newest(local), changeFrequency: "weekly", priority: 0.7 });
        entries.push({
          url: absoluteUrl(`/dog-walkers/${c.slug}/${n.slug}`),
          lastModified: newest(local.filter((s) => s.services.some((x) => x.type === "DOG_WALKING"))),
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }
    for (const s of sitters) {
      entries.push({ url: absoluteUrl(`/sitters/${s.slug}`), lastModified: lastMod(s), changeFrequency: "weekly", priority: 0.8 });
    }
  } catch (e) {
    console.warn("[sitemap] database unavailable, listing static pages only:", (e as Error).message);
  }
  return entries;
}
