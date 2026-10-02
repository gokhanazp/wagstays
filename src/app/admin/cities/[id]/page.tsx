import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardHeader, PageHeader, StatusChip } from "@/components/ui";
import { CityForm } from "../_components/CityForm";
import { CityActiveToggle } from "../_components/CityActiveToggle";
import { Neighbourhoods } from "../_components/Neighbourhoods";

export const metadata: Metadata = { title: "Edit city" };

export default async function EditCityPage({ params, searchParams }: PageProps<"/admin/cities/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const city = await db.city.findUnique({
    where: { id },
    include: {
      neighbourhoods: { orderBy: { name: "asc" }, include: { _count: { select: { sitters: true } } } },
      sitters: { where: { status: "ACTIVE" }, select: { id: true } },
    },
  });
  if (!city) notFound();
  const activeCount = await db.city.count({ where: { isActive: true } });

  return (
    <>
      <Link className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline w-fit" href="/admin/cities">
        <span className="material-symbols-outlined text-base">arrow_back</span>All cities
      </Link>
      <PageHeader
        actions={
          <span className="flex items-center gap-space-sm p-space-sm px-space-md rounded-full bg-surface-container-low">
            <span className="font-label-lg text-label-lg text-on-surface">Active</span>
            <CityActiveToggle
              active={city.isActive}
              activeSitters={city.sitters.length}
              cityId={city.id}
              cityName={city.name}
              isLastActive={city.isActive && activeCount === 1}
              neighbourhoods={city.neighbourhoods.length}
              showHint={false}
            />
          </span>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-space-sm">
            {city.isActive ? <StatusChip tone="success">Live</StatusChip> : <StatusChip>Inactive</StatusChip>}
            {city.province} · {city.sitters.length} active sitter{city.sitters.length === 1 ? "" : "s"}
            {city.isActive && activeCount === 1 && <span className="w-full font-body-sm text-body-sm">This is the only active city, so it can&apos;t be switched off.</span>}
            {!city.isActive && city.neighbourhoods.length === 0 && <span className="w-full font-body-sm text-body-sm">Add a neighbourhood before switching this city on.</span>}
          </span>
        }
        eyebrow="Cities"
        title={city.name}
      />
      {sp.created === "1" && (
        <p className="flex items-center gap-space-xs p-space-sm px-space-md rounded-xl bg-[#EBF3EF] text-primary font-body-sm text-body-sm" role="status">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {city.name} created. Add its neighbourhoods below, then switch it on.
        </p>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-space-lg items-start">
        <Card className="flex flex-col gap-space-md pb-space-lg">
          <CardHeader icon="location_city" title="City details" />
          <div className="px-space-lg">
            <CityForm
              city={{
                id: city.id,
                name: city.name,
                slug: city.slug,
                province: city.province,
                provinceCode: city.provinceCode,
                taxRateBps: city.taxRateBps,
                timeZone: city.timeZone,
                lat: city.lat,
                lng: city.lng,
              }}
            />
          </div>
        </Card>
        <Card className="flex flex-col gap-space-md pb-space-lg">
          <CardHeader icon="holiday_village" title={`Neighbourhoods (${city.neighbourhoods.length})`} />
          <div className="px-space-sm sm:px-space-md">
            <Neighbourhoods cityId={city.id} hoods={city.neighbourhoods.map((h) => ({ id: h.id, name: h.name, slug: h.slug, sitters: h._count.sitters }))} />
          </div>
        </Card>
      </div>
    </>
  );
}
