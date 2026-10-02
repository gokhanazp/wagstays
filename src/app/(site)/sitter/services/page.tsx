import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { SERVICE_LABELS, SERVICE_TYPES } from "@/lib/constants";
import { db } from "@/lib/db";
import { getFees } from "@/lib/settings";
import { SERVICE_DEFAULT_PRICE } from "@/lib/sitter";
import { SERVICE_ICONS } from "../_lib";
import { ServiceForm } from "./_components/ServiceForm";

export const metadata: Metadata = { title: "Services & Rates | WagStays" };

export default async function SitterServicesPage() {
  const { profile } = await requireSitter();
  const [services, fees] = await Promise.all([db.service.findMany({ where: { sitterId: profile.id } }), getFees()]);
  const taxPct = profile.city.taxRateBps / 100;
  const taxLabel = `${["ON", "NS", "NB", "NL", "PE"].includes(profile.city.provinceCode) ? "HST" : "tax"} ${taxPct}%`;

  return (
    <>
      <PageHeader
        description="Choose what you offer and set your rates. You keep 100% of your price — WagStays adds its fees and tax on top for the owner."
        eyebrow="Sitter Dashboard"
        title="Services & Rates"
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">
        {SERVICE_TYPES.map((type) => {
          const s = services.find((x) => x.type === type);
          return (
            <ServiceForm
              fees={fees}
              icon={SERVICE_ICONS[type]}
              key={type}
              service={{
                exists: !!s,
                active: s?.active ?? false,
                priceCents: s?.priceCents ?? SERVICE_DEFAULT_PRICE[type],
                durationMins: s?.durationMins ?? null,
                description: s?.description ?? "",
                extraNote: s?.extraNote ?? "",
              }}
              taxLabel={taxLabel}
              taxRateBps={profile.city.taxRateBps}
              title={SERVICE_LABELS[type]}
              type={type}
            />
          );
        })}
      </div>
    </>
  );
}
