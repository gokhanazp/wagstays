import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { PetForm } from "../../_components/PetForm";
import { DeletePetButton } from "../../_components/DeletePetButton";

export const metadata: Metadata = { title: "Edit Pet | WagStays" };

export default async function EditPetPage({ params }: PageProps<"/account/pets/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const pet = await db.pet.findUnique({ where: { id }, include: { traits: true } });
  if (!pet || pet.ownerId !== user.id || pet.archivedAt) notFound();

  const upcoming = await db.booking.count({
    where: { petId: pet.id, status: { in: ["PENDING", "CONFIRMED"] }, endAt: { gte: new Date() } },
  });

  return (
    <>
      <div className="flex flex-col gap-space-sm">
        <Link className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href="/account/pets">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          My Pets
        </Link>
        <PageHeader eyebrow="My Pets" title={`Edit ${pet.name}`} />
      </div>
      <PetForm
        cancelHref="/account/pets"
        pet={{
          id: pet.id,
          name: pet.name,
          species: pet.species,
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
          <h2 className="font-title-md text-title-md text-on-surface">Delete {pet.name}&apos;s profile</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {upcoming > 0
              ? `${pet.name} has ${upcoming === 1 ? "an upcoming booking" : `${upcoming} upcoming bookings`} — cancel ${upcoming === 1 ? "it" : "them"} before deleting this profile.`
              : "This permanently removes the profile and its traits. It can't be undone."}
          </p>
        </div>
        <DeletePetButton disabled={upcoming > 0} petId={pet.id} petName={pet.name} />
      </Card>
    </>
  );
}
