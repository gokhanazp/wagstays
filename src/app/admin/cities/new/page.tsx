import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { CityForm } from "../_components/CityForm";

export const metadata: Metadata = { title: "Add city" };

export default function NewCityPage() {
  return (
    <>
      <Link className="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline w-fit" href="/admin/cities">
        <span className="material-symbols-outlined text-base">arrow_back</span>All cities
      </Link>
      <PageHeader description="New cities start inactive. Add neighbourhoods, then switch the city on when sitters are ready." eyebrow="Cities" title="Add a city" />
      <Card className="flex flex-col gap-space-md pb-space-lg">
        <CardHeader icon="location_city" title="City details" />
        <div className="px-space-lg">
          <CityForm />
        </div>
      </Card>
    </>
  );
}
