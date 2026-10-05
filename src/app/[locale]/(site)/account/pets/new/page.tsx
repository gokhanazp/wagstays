import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PetForm } from "../../_components/PetForm";

export async function generateMetadata() {
  const t = await getTranslations("account.meta");
  return { title: t("addPet") };
}

const safeNext = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") ? s : null;
};

export default async function NewPetPage({ searchParams }: PageProps<"/[locale]/account/pets/new">) {
  await requireUser();
  const next = safeNext((await searchParams).next);
  const back = next ?? "/account/pets";
  const [t, tc] = await Promise.all([getTranslations("account.pets.new"), getTranslations("common.nav")]);

  return (
    <>
      <div className="flex flex-col gap-space-sm">
        <Link className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href={back}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {next ? t("backToBooking") : tc("myPets")}
        </Link>
        <PageHeader
          description={next ? t("descriptionNext") : t("description")}
          eyebrow={tc("myPets")}
          title={t("title")}
        />
      </div>
      <PetForm cancelHref={back} next={next} />
    </>
  );
}
