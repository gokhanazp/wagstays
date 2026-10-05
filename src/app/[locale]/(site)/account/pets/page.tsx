import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnerPets } from "@/lib/queries";
import { BTN, Card, EmptyState, PageHeader } from "@/components/ui";
import { ageLabel, sizeLabel } from "../_lib";

export async function generateMetadata() {
  const t = await getTranslations("account.meta");
  return { title: t("pets") };
}

const TRAIT_TONE: Record<string, string> = {
  warning: "bg-error-container text-on-error-container",
  primary: "bg-primary/10 text-primary",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export default async function MyPetsPage({ searchParams }: PageProps<"/[locale]/account/pets">) {
  const user = await requireUser();
  const sp = await searchParams;
  const [pets, t, tc, locale] = await Promise.all([getOwnerPets(user.id), getTranslations("account.pets"), getTranslations("common"), getLocale()]);
  const notice = sp.deleted ? t("deleted") : sp.saved ? t("saved") : null;
  const kindLabel = (p: { species: string; speciesOther?: string | null }) =>
    p.species === "OTHER" ? p.speciesOther?.trim() || t("otherPet") : p.species === "DOG" || p.species === "CAT" ? tc(`enums.petKind.${p.species}`) : p.species;

  return (
    <>
      <PageHeader
        actions={
          <Link className={BTN.primary} href="/account/pets/new">
            <span className="material-symbols-outlined text-xl">add</span>
            {t("addPet")}
          </Link>
        }
        description={t("description")}
        eyebrow={tc("enums.role.OWNER")}
        title={tc("nav.myPets")}
      />

      {notice && (
        <p className="flex items-center gap-space-xs rounded-xl bg-[#EBF3EF] text-primary px-space-md py-space-sm font-label-lg text-label-lg" role="status">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          {notice}
        </p>
      )}

      {pets.length === 0 ? (
        <Card>
          <EmptyState
            action={
              <Link className={`${BTN.primary} mt-space-sm`} href="/account/pets/new">
                {t("emptyAction")}
              </Link>
            }
            icon="pets"
            text={t("emptyText")}
            title={t("emptyTitle")}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-space-lg">
          {pets.map((p) => {
            const facts = [kindLabel(p), ageLabel(p.ageYears, locale), sizeLabel(p.size, locale)].filter(Boolean);
            return (
              <Card className="overflow-hidden flex flex-col" key={p.id}>
                <div className="relative h-44 bg-primary-fixed flex items-center justify-center">
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={`${p.name}${p.breed ? `, ${p.breed}` : ""}`} className="w-full h-full object-cover" src={p.photoUrl} />
                  ) : (
                    <span className="material-symbols-outlined text-primary text-6xl">pets</span>
                  )}
                  {p.microchip && (
                    <span className="absolute top-space-sm right-space-sm bg-surface-container-lowest/90 px-space-sm py-0.5 rounded-full font-label-sm text-label-sm text-primary flex items-center gap-0.5 shadow-sm">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      {t("chipped")}
                    </span>
                  )}
                </div>
                <div className="p-space-lg flex flex-col gap-space-sm flex-1">
                  <div className="flex flex-col">
                    <h2 className="font-title-md text-title-md text-on-surface">{p.name}</h2>
                    {p.breed && <span className="font-body-sm text-body-sm text-primary font-semibold">{p.breed}</span>}
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{facts.join(" · ")}</p>
                  <div className="flex flex-wrap gap-space-xs">
                    {p.rabiesVaccinated && (
                      <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full font-label-sm text-label-sm bg-[#EBF3EF] text-primary">
                        <span className="material-symbols-outlined text-sm">vaccines</span>
                        {t("rabies")}
                      </span>
                    )}
                    {p.neutered && (
                      <span className="inline-flex items-center px-space-sm py-0.5 rounded-full font-label-sm text-label-sm bg-[#EBF3EF] text-primary">
                        {p.sex === "FEMALE" ? t("spayed") : t("neutered")}
                      </span>
                    )}
                    {p.traits.map((t) => (
                      <span className={`inline-flex items-center px-space-sm py-0.5 rounded-full font-label-sm text-label-sm ${TRAIT_TONE[t.tone] ?? TRAIT_TONE.neutral}`} key={t.id}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto pt-space-sm">
                    <Link className={`${BTN.secondary} w-full`} href={`/account/pets/${p.id}`}>
                      <span className="material-symbols-outlined text-xl">edit</span>
                      {t("editProfile")}
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
