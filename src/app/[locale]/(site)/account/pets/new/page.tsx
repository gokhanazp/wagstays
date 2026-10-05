import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { PetForm } from "../../_components/PetForm";

export const metadata: Metadata = { title: "Add a Pet | WagStays" };

const safeNext = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") ? s : null;
};

export default async function NewPetPage({ searchParams }: PageProps<"/[locale]/account/pets/new">) {
  await requireUser();
  const next = safeNext((await searchParams).next);
  const back = next ?? "/account/pets";

  return (
    <>
      <div className="flex flex-col gap-space-sm">
        <Link className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href={back}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {next ? "Back to booking" : "My Pets"}
        </Link>
        <PageHeader
          description={next ? "Add your pet and we'll take you straight back to where you left off." : "Tell sitters who they'll be caring for."}
          eyebrow="My Pets"
          title="Add a Pet"
        />
      </div>
      <PetForm cancelHref={back} next={next} />
    </>
  );
}
