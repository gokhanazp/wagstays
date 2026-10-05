import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { SERVICE_TYPES } from "@/lib/constants";
import { db } from "@/lib/db";
import { getFees } from "@/lib/settings";
import { SERVICE_DEFAULT_PRICE } from "@/lib/sitter";
import { SERVICE_ICONS } from "../_lib";
import { ServiceForm } from "./_components/ServiceForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sitter.meta");
  return { title: `${t("services")}` };
}

export default async function SitterServicesPage() {
  const { profile } = await requireSitter();
  const [services, fees, t, tc] = await Promise.all([
    db.service.findMany({ where: { sitterId: profile.id } }),
    getFees(),
    getTranslations("sitter"),
    getTranslations("common"),
  ]);
  const taxPct = profile.city.taxRateBps / 100;
  const taxLabel = t(`services.taxLabel.${["ON", "NS", "NB", "NL", "PE"].includes(profile.city.provinceCode) ? "hst" : "tax"}`, { pct: taxPct });

  return (
    <>
      <PageHeader
        description={t("services.description")}
        eyebrow={t("eyebrow")}
        title={t("meta.services")}
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
                maxPetsPerBooking: s?.maxPetsPerBooking ?? 3,
                additionalPetPriceCents: s?.additionalPetPriceCents ?? null,
                holidayPriceCents: s?.holidayPriceCents ?? null,
                puppyPriceCents: s?.puppyPriceCents ?? null,
              }}
              provinceCode={profile.city.provinceCode}
              taxLabel={taxLabel}
              taxRateBps={profile.city.taxRateBps}
              title={tc(`enums.service.${type}`)}
              type={type}
            />
          );
        })}
      </div>
    </>
  );
}
