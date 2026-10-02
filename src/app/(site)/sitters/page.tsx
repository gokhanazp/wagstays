import type { Metadata } from "next";
import { getFees } from "@/lib/settings";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { PRICE_RANGE, getActiveCities, parseSearchParams, searchSitters, toSearchQuery } from "@/lib/queries";
import { FilterSidebar } from "./_components/FilterSidebar";
import type { MapPin } from "./_components/map-types";
import { Pagination } from "./_components/Pagination";
import { SearchTopBar } from "./_components/SearchTopBar";
import { SitterMap } from "./_components/SitterMap";
import { SitterResultCard } from "./_components/SitterResultCard";
import { SortSelect } from "./_components/SortSelect";
import { withExtras, type SearchExtras } from "./_components/search-url";

export const metadata: Metadata = {
  title: "Find a Trusted Pet Sitter",
  description: "Search verified dog walkers, boarding hosts and drop-in sitters near you. Filter by price, dog size, home and qualifications.",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function SittersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { vetCoverageCents } = await getFees();
  const sp = await searchParams;
  const filters = parseSearchParams(sp);
  const str = (k: string) => {
    const v = Array.isArray(sp[k]) ? sp[k]![0] : sp[k];
    return typeof v === "string" && ISO_DATE.test(v) ? v : undefined;
  };
  const extras: SearchExtras = { from: str("from"), to: str("to") };
  const [result, cities] = await Promise.all([searchSitters(filters), getActiveCities()]);
  const { city, centreHood, total, page, pageCount, pageSize, sitters } = result;

  const pins: MapPin[] = result.allMatches;

  const hrefFor = (p: number) => withExtras(toSearchQuery({ ...filters, page: p }), extras);
  const viewHref = (view: "list" | "map") => withExtras(toSearchQuery({ ...filters, page, view }), extras);
  const isMap = filters.view === "map";
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const liveLabel = `Live area: ${city.name} / ${centreHood.name}`;

  const viewBtn = (active: boolean) =>
    `px-space-sm sm:px-space-md py-2 sm:py-1.5 rounded-full font-label-md text-label-md flex items-center gap-1.5 transition-all ${
      active ? "bg-surface-container-lowest text-primary shadow-xs" : "text-on-surface-variant hover:text-on-surface"
    }`;

  const guarantee = (
    <div className="bg-surface-container p-space-lg rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-space-md mt-space-md">
      <div className="flex items-center gap-space-md">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-3xl">verified_user</span>
        </div>
        <div>
          <h3 className="font-title-md text-title-md text-on-surface font-bold">WagStays 100% Trust Guarantee</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Every walk and stay is protected by {formatMoney(vetCoverageCents)} in WagShield emergency vet coverage.
          </p>
        </div>
      </div>
      <Link
        className="shrink-0 px-space-md py-2.5 rounded-full bg-surface-container-lowest text-primary font-label-md text-label-md hover:bg-primary hover:text-on-primary transition-all"
        href="/#how-it-works"
      >
        Learn More
      </Link>
    </div>
  );

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="flex flex-col w-full">
        <SearchTopBar
          centreHood={centreHood.slug}
          citySlug={city.slug}
          cities={cities.map((c) => ({ slug: c.slug, name: c.name, hoods: c.neighbourhoods.map((n) => ({ slug: n.slug, name: n.name })) }))}
          extras={extras}
          filters={filters}
          key={`${filters.service}-${filters.hood}-${filters.sizes.join()}-${extras.from}-${extras.to}`}
        />
        {/* Main Workspace: Split Content Grid */}
        <div className="w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin py-space-md md:py-space-xl">
          <div className="flex flex-col lg:flex-row gap-space-md md:gap-space-xl items-start">
            <FilterSidebar
              extras={extras}
              filters={filters}
              medicalCount={result.medicalCount}
              priceRange={PRICE_RANGE}
              serviceCounts={result.serviceCounts}
            />
            {/* Main Results + Dynamic Map Split Area */}
            <section className="flex-1 flex flex-col gap-space-md md:gap-space-lg min-w-0 w-full">
              {/* Results Header Controls */}
              <div className="bg-surface-container-lowest p-space-md rounded-3xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-sm md:gap-space-md">
                <div className="flex items-center gap-space-sm">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse shrink-0" />
                  <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    <span className="text-primary">
                      {total} trusted sitter{total === 1 ? "" : "s"}
                    </span>{" "}
                    found around {centreHood.name}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-space-sm sm:gap-space-md justify-between md:justify-end">
                  <SortSelect extras={extras} filters={filters} />
                  {/* View Layout Toggle */}
                  <div className="flex items-center p-1 bg-surface-container rounded-full">
                    <Link aria-current={!isMap ? "page" : undefined} className={viewBtn(!isMap)} href={viewHref("list")} replace scroll={false}>
                      <span className="material-symbols-outlined text-base">view_list</span>
                      <span>List</span>
                    </Link>
                    <Link aria-current={isMap ? "page" : undefined} className={viewBtn(isMap)} href={viewHref("map")} replace scroll={false}>
                      <span className="material-symbols-outlined text-base">map</span>
                      <span>Map</span>
                    </Link>
                  </div>
                </div>
              </div>
              {/* Dual Column View (List + Mini Map) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
                {!isMap && (
                  <div className="xl:col-span-8 flex flex-col gap-space-lg min-w-0">
                    {sitters.length === 0 ? (
                      <div className="bg-surface-container-lowest rounded-3xl p-space-xl shadow-sm flex flex-col items-center text-center gap-space-sm">
                        <span className="material-symbols-outlined text-4xl text-primary">search_off</span>
                        <h2 className="font-title-md text-title-md text-on-surface font-bold">No sitters match these filters</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant">Try widening your price range or removing a filter or two.</p>
                        <Link
                          className="mt-space-xs px-space-md py-2.5 rounded-full bg-primary text-on-primary font-label-md text-label-md"
                          href={withExtras(toSearchQuery({ hood: filters.hood }), extras)}
                        >
                          Reset Filters
                        </Link>
                      </div>
                    ) : (
                      sitters.map((s) => <SitterResultCard key={s.id} sitter={s} />)
                    )}
                    {/* Pagination Bar */}
                    {total > 0 && (
                      <div className="pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Showing {first} – {last} of {total} results
                        </span>
                        <Pagination hrefFor={hrefFor} page={page} pageCount={pageCount} />
                      </div>
                    )}
                    {guarantee}
                  </div>
                )}
                {/* Interactive Map View Area */}
                <div className={`${isMap ? "xl:col-span-12 flex" : "xl:col-span-4 hidden xl:flex xl:sticky top-28"} flex-col gap-space-md min-w-0`}>
                  <SitterMap
                    centre={{ lat: centreHood.lat, lng: centreHood.lng }}
                    focusIds={sitters.map((s) => s.id)}
                    heightClass={isMap ? "h-[70vh] min-h-[460px]" : "h-[580px]"}
                    liveLabel={liveLabel}
                    pins={pins}
                  />
                  {/* Neighbourhood Info Chip Box (curated routes exist for Toronto only so far) */}
                  {city.slug === "toronto" && (
                  <div className="p-space-md bg-surface-container-lowest rounded-3xl shadow-sm flex items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-xl">park</span>
                      </div>
                      <div>
                        <div className="font-label-lg text-label-lg text-on-surface font-bold">Kew Gardens &amp; Ashbridges Bay Park</div>
                        <div className="font-body-sm text-body-sm text-outline">Most popular walking routes for dogs</div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-outline">info</span>
                  </div>
                  )}
                  {isMap && guarantee}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
