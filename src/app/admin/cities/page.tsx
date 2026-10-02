import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { BTN, Card, PageHeader, StatusChip, TD, TH, Table } from "@/components/ui";
import { CityActiveToggle } from "./_components/CityActiveToggle";

export const metadata: Metadata = { title: "Cities" };

const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 2)}%`;

export default async function CitiesPage() {
  const cities = await db.city.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { neighbourhoods: true, sitters: true } }, sitters: { where: { status: "ACTIVE" }, select: { id: true } } },
  });
  const activeCount = cities.filter((c) => c.isActive).length;

  return (
    <>
      <PageHeader
        actions={
          <Link className={BTN.primary} href="/admin/cities/new">
            <span className="material-symbols-outlined text-xl">add</span>Add city
          </Link>
        }
        description="Launch WagStays in new Canadian cities. Only active cities appear on the public site and accept sitter listings."
        eyebrow="Admin"
        title="Cities"
      />
      <Card className="p-space-sm">
        <Table>
          <thead>
            <tr>
              <th className={TH}>City</th>
              <th className={TH}>Province</th>
              <th className={`${TH} text-right`}>Sales tax</th>
              <th className={TH}>Time zone</th>
              <th className={`${TH} text-right`}>Neighbourhoods</th>
              <th className={`${TH} text-right`}>Sitters</th>
              <th className={TH}>Active</th>
              <th className={`${TH} relative`}>
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cities.map((c) => (
              <tr key={c.id}>
                <td className={TD}>
                  <Link className="flex flex-col hover:text-primary" href={`/admin/cities/${c.id}`}>
                    <span className="font-label-lg text-label-lg">{c.name}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">/{c.slug}</span>
                  </Link>
                </td>
                <td className={TD}>
                  {c.province} <span className="text-on-surface-variant">({c.provinceCode})</span>
                </td>
                <td className={`${TD} text-right`}>{pct(c.taxRateBps)}</td>
                <td className={`${TD} font-body-sm text-body-sm`}>{c.timeZone}</td>
                <td className={`${TD} text-right`}>{c._count.neighbourhoods}</td>
                <td className={`${TD} text-right`}>
                  {c._count.sitters}
                  {c._count.sitters > 0 && <span className="text-on-surface-variant"> ({c.sitters.length} active)</span>}
                </td>
                <td className={TD}>
                  <CityActiveToggle
                    active={c.isActive}
                    activeSitters={c.sitters.length}
                    cityId={c.id}
                    cityName={c.name}
                    isLastActive={c.isActive && activeCount === 1}
                    neighbourhoods={c._count.neighbourhoods}
                  />
                </td>
                <td className={`${TD} text-right`}>
                  <Link aria-label={`Edit ${c.name}`} className={`${BTN.small} hover:bg-surface-container-low text-primary`} href={`/admin/cities/${c.id}`}>
                    <span className="material-symbols-outlined text-base">edit</span>Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <p className="flex items-start gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
        <span className="material-symbols-outlined text-base">info</span>
        {activeCount === 1 ? (
          <span>
            The public site currently serves one launch city. At least one city must stay active. <StatusChip tone="primary">{cities.find((c) => c.isActive)?.name}</StatusChip>
          </span>
        ) : (
          <span>{activeCount} cities are active.</span>
        )}
      </p>
    </>
  );
}
