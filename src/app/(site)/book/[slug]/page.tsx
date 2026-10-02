import type { Metadata } from "next";
import { getFees } from "@/lib/settings";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getOwnerPets, getSitterBySlug } from "@/lib/queries";
import { TIME_SLOTS } from "@/lib/booking-slots";
import { formatClock, formatLongDate, formatShortDate, isIsoDate, nextSaturdayIso, slotRange, todayIso } from "@/lib/booking-time";
import { CheckoutForm } from "./_components/CheckoutForm";
import { durationLabel, serviceLine } from "./_lib";

export const metadata: Metadata = { title: "Booking & Care Instructions | WagStays" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const flag = (v: string | string[] | undefined) => ["1", "true", "on", "yes"].includes(one(v) ?? "");

export default async function BookPage({ params, searchParams }: PageProps<"/book/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v !== undefined) qs.set(k, one(v)!);
    const current = `/book/${slug}${qs.size ? `?${qs}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(current)}`);
  }

  const sitter = await getSitterBySlug(slug);
  const fees = await getFees();
  if (!sitter || sitter.status !== "ACTIVE" || sitter.services.length === 0) notFound();
  const pets = await getOwnerPets(user.id);

  const service = sitter.services.find((s) => s.id === one(sp.service)) ?? sitter.services.find((s) => s.type === "DOG_WALKING") ?? sitter.services[0];
  const petId = pets.find((p) => p.id === one(sp.pet))?.id ?? pets[0]?.id ?? "";
  const rawDate = one(sp.date);
  const date = isIsoDate(rawDate) && rawDate >= todayIso() ? rawDate : nextSaturdayIso();
  const slot = TIME_SLOTS.find((s) => s.key === one(sp.slot)) ?? TIME_SLOTS[0];
  const duration = durationLabel(service.durationMins);

  // "Add a new pet" returns here (the pet form appends pet=<newId>).
  const backQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v !== undefined && k !== "pet") backQs.set(k, one(v)!);
  const addPetHref = `/account/pets/new?next=${encodeURIComponent(`/book/${slug}${backQs.size ? `?${backQs}` : ""}`)}`;

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="flex flex-col w-full">
        {/* Stepper Progress Header */}
        <div className="w-full bg-surface-container-low py-space-lg shadow-sm">
          <div className="max-w-[1240px] mx-auto px-margin-mobile md:px-margin">
            <div className="flex flex-col md:flex-row items-center justify-between gap-space-md">
              <div className="text-center md:text-left">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">Secure Booking</span>
                <h1 className="font-headline-md text-headline-md text-on-surface">Booking &amp; Care Instructions</h1>
              </div>
              <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-space-sm rounded-full">
                <div className="flex items-center gap-space-xs text-primary">
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md">
                    <span className="material-symbols-outlined text-sm">done</span>
                  </div>
                  <span className="font-label-md text-label-md hidden sm:inline font-semibold">Date &amp; Time</span>
                </div>
                <div className="w-6 h-0.5 bg-primary/40 rounded-full" />
                <div className="flex items-center gap-space-xs text-secondary">
                  <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-md text-label-md font-bold">
                    2
                  </div>
                  <span className="font-label-md text-label-md font-bold">Pets &amp; Instructions</span>
                </div>
                <div className="w-6 h-0.5 bg-outline-variant/60 rounded-full" />
                <div className="flex items-center gap-space-xs text-on-surface-variant/70">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-label-md text-label-md">
                    3
                  </div>
                  <span className="font-label-md text-label-md hidden sm:inline">Payment</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <CheckoutForm
          sitter={{
            slug: sitter.slug,
            displayName: sitter.displayName,
            firstName: sitter.displayName.split(" ")[0],
            avatarUrl: sitter.avatarUrl,
            rating: sitter.rating,
            isSuperSitter: sitter.isSuperSitter,
            completedBookings: sitter.completedBookings,
          }}
          service={{
            id: service.id,
            type: service.type,
            unitPriceCents: service.priceCents,
            line: serviceLine(service),
          }}
          pets={pets.map((p) => ({
            id: p.id,
            name: p.name,
            species: p.species,
            breed: p.breed,
            ageYears: p.ageYears,
            sex: p.sex,
            neutered: p.neutered,
            rabiesVaccinated: p.rabiesVaccinated,
            microchip: p.microchip,
            photoUrl: p.photoUrl,
            traits: p.traits.map((t) => ({ id: t.id, label: t.label, tone: t.tone })),
          }))}
          initialPetId={petId}
          schedule={{
            date,
            slot: slot.key,
            dateLabel: formatLongDate(date),
            timeLabel: `${slotRange(slot)}${duration ? ` (${duration})` : ""}`,
            cancelLabel: `${formatShortDate(date)}, ${formatClock(slot.start)}`,
            recurring: flag(sp.recurring),
            meet: flag(sp.meet),
          }}
          owner={{
            fullName: `${user.firstName} ${user.lastName}`.toUpperCase(),
            wagPointsCents: user.wagPointsCents,
          }}
          taxRateBps={sitter.city.taxRateBps}
          fees={fees}
          addPetHref={addPetHref}
        />
      </div>
    </main>
  );
}
