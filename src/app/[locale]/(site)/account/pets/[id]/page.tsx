import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { PetForm } from "../../_components/PetForm";
import { DeletePetButton } from "../../_components/DeletePetButton";

export async function generateMetadata() {
  const t = await getTranslations("account.meta");
  return { title: t("editPet") };
}

export default async function EditPetPage({ params }: PageProps<"/[locale]/account/pets/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const pet = await db.pet.findUnique({ where: { id }, include: { traits: true } });
  if (!pet || pet.ownerId !== user.id || pet.archivedAt) notFound();

  const [t, tc] = await Promise.all([getTranslations("account.pets.edit"), getTranslations("common.nav")]);
  const upcoming = await db.booking.count({
    where: { petId: pet.id, status: { in: ["PENDING", "CONFIRMED"] }, endAt: { gte: new Date() } },
  });

  return (
    <>
      <div className="flex flex-col gap-space-sm">
        <Link className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href="/account/pets">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {tc("myPets")}
        </Link>
        <PageHeader eyebrow={tc("myPets")} title={t("title", { name: pet.name })} />
      </div>
      <PetForm
        cancelHref="/account/pets"
        pet={{
          id: pet.id,
          name: pet.name,
          species: pet.species,
          speciesOther: pet.speciesOther,
          breed: pet.breed,
          ageYears: pet.ageYears,
          size: pet.size,
          sex: pet.sex,
          neutered: pet.neutered,
          rabiesVaccinated: pet.rabiesVaccinated,
          microchip: pet.microchip,
          photoUrl: pet.photoUrl,
          traits: pet.traits.map((t) => ({ label: t.label, tone: t.tone === "warning" ? "warning" : "neutral" })),
        }}
      />
      <Card className="p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <h2 className="font-title-md text-title-md text-on-surface">{t("deleteTitle", { name: pet.name })}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {upcoming > 0 ? t("upcoming", { name: pet.name, count: upcoming }) : t("permanent")}
          </p>
        </div>
        <DeletePetButton disabled={upcoming > 0} petId={pet.id} petName={pet.name} />
      </Card>
    </>
  );
}
