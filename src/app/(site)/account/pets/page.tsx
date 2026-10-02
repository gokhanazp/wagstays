import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getOwnerPets } from "@/lib/queries";
import { BTN, Card, EmptyState, PageHeader } from "@/components/ui";
import { SPECIES_LABELS, ageLabel, sizeLabel } from "../_lib";

export const metadata: Metadata = { title: "My Pets | WagStays" };

const TRAIT_TONE: Record<string, string> = {
  warning: "bg-error-container text-on-error-container",
  primary: "bg-primary/10 text-primary",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export default async function MyPetsPage({ searchParams }: PageProps<"/account/pets">) {
  const user = await requireUser();
  const sp = await searchParams;
  const pets = await getOwnerPets(user.id);
  const notice = sp.deleted ? "Pet profile deleted." : sp.saved ? "Pet profile saved." : null;

  return (
    <>
      <PageHeader
        actions={
          <Link className={BTN.primary} href="/account/pets/new">
            <span className="material-symbols-outlined text-xl">add</span>
            Add a pet
          </Link>
        }
        description="Keep your pets' details up to date so sitters know exactly how to care for them."
        eyebrow="Pet Parent"
        title="My Pets"
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
                Add your first pet
              </Link>
            }
            icon="pets"
            text="Add your dog, cat or other companion — you'll pick them when you book."
            title="No pets yet"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-space-lg">
          {pets.map((p) => {
            const facts = [SPECIES_LABELS[p.species] ?? p.species, ageLabel(p.ageYears), sizeLabel(p.size)].filter(Boolean);
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
                      Chipped
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
                        Rabies vaccinated
                      </span>
                    )}
                    {p.neutered && (
                      <span className="inline-flex items-center px-space-sm py-0.5 rounded-full font-label-sm text-label-sm bg-[#EBF3EF] text-primary">
                        {p.sex === "FEMALE" ? "Spayed" : "Neutered"}
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
                      Edit profile
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
