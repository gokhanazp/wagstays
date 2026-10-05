import { AvailabilityCalendar } from "./_components/AvailabilityCalendar";
import { PriceDetails } from "@/components/pricing/PriceDetails";
import { MobileBookBar } from "./_components/MobileBookBar";
import type { Metadata } from "next";
import { getFees } from "@/lib/settings";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PET_SIZES, PET_SIZE_LABELS, UNIT_LABELS } from "@/lib/constants";
import { PET_KIND_META, petBlockReason, petKindOf } from "@/lib/pets";
import { PetKindChips } from "@/components/PetKinds";
import { formatDistance, formatMoney, formatRating, timeAgo } from "@/lib/format";
import { getOwnerPets, getSitterBySlug, type SitterDetail } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { BookingWidget } from "./_components/BookingWidget";
import { getOwnerReadiness } from "@/lib/owner-readiness";
import { loadSnapshot, publicSnapshot } from "@/lib/availability";
import { addDays, todayIn } from "@/lib/availability-core";
import { PhotoGallery } from "./_components/PhotoGallery";
import { ProfileActions } from "./_components/ProfileActions";
import { ReviewList } from "./_components/ReviewList";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema, sitterSchema } from "@/lib/seo/schema";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sitter = await getSitterBySlug(slug);
  if (!sitter) return { title: "Sitter not found" };
  const title = `${sitter.displayName} — ${sitter.headline} in ${sitter.neighbourhood.name}`;
  const rated = sitter.reviewCount > 0 ? ` rated ${formatRating(sitter.rating)} from ${sitter.reviewCount} reviews` : "";
  const full = `${sitter.displayName} is a ${sitter.city.name} pet sitter in ${sitter.neighbourhood.name}${rated}. ${sitter.bio}`;
  const description = full.length > 160 ? `${full.slice(0, 157).replace(/\s+\S*$/, "")}…` : full;
  const url = `/sitters/${sitter.slug}`;
  const photo = sitter.cardPhotoUrl ?? sitter.avatarUrl;
  return {
    title,
    description,
    alternates: { canonical: url },
    // Paused profiles stay reachable for existing clients but aren't indexed (they're also left out of the sitemap).
    ...(sitter.status !== "ACTIVE" ? { robots: { index: false } } : {}),
    openGraph: {
      type: "profile",
      siteName: "WagStays",
      locale: "en_CA",
      url,
      title: `${sitter.displayName} · ${sitter.headline}`,
      description,
      images: [{ url: photo, alt: `${sitter.displayName}, ${sitter.headline}` }],
    },
    twitter: { card: "summary_large_image", title: `${sitter.displayName} · ${sitter.headline}`, description, images: [photo] },
  };
}

const HST_PROVINCES = new Set(["ON", "NS", "NB", "NL", "PE"]);

type Service = SitterDetail["services"][number];

const SERVICE_STYLE: Record<
  string,
  { icon: string; iconBox: string; price: string; feature: { icon: string; label: string }; fallback: string; title: string }
> = {
  DOG_WALKING: {
    icon: "directions_walk",
    iconBox: "bg-primary-container text-on-primary-container",
    price: "text-primary",
    feature: { icon: "my_location", label: "Live GPS Route" },
    title: "Dog Walking",
    fallback: "Live GPS route tracking, potty report and fresh water included.",
  },
  BOARDING: {
    icon: "cottage",
    iconBox: "bg-secondary-container text-on-secondary-container",
    price: "text-secondary",
    feature: { icon: "nest_cam_wired_stand", label: "3x Daily Live Video" },
    title: "Overnight Boarding",
    fallback: "Your pet stays in a loving home with daily walks and round-the-clock attention.",
  },
  DAY_CARE: {
    icon: "sunny",
    iconBox: "bg-surface-container-highest text-on-surface",
    price: "text-on-surface",
    feature: { icon: "sports_soccer", label: "Social Playtime" },
    title: "Doggy Day Care",
    fallback: "No more lonely workdays. Social play, exercise and nap time.",
  },
  DROP_IN: {
    icon: "door_front",
    iconBox: "bg-surface-container-highest text-on-surface",
    price: "text-on-surface",
    feature: { icon: "cleaning_services", label: "Litter & Water Refresh" },
    title: "Drop-In Visits",
    fallback: "Food and water refresh, litter box cleaning, play and cuddles at home.",
  },
};

const SERVICE_ORDER = ["DOG_WALKING", "BOARDING", "DAY_CARE", "DROP_IN"];

function unitLabel(s: Service) {
  switch (s.type) {
    case "DOG_WALKING":
      return `/ ${s.durationMins ?? 60} min`;
    case "BOARDING":
      return "/ night";
    case "DAY_CARE":
      return "/ day (8 AM – 7 PM)";
    case "DROP_IN":
      return `/ ${s.durationMins ?? 30} min`;
    default:
      return `/ ${UNIT_LABELS[s.unit] ?? s.unit.toLowerCase()}`;
  }
}

const HEADER_PRICE_LABEL: Record<string, string> = { WALK: "Per Walk", NIGHT: "Per Night", DAY: "Per Day", VISIT: "Per Visit" };

function headerPriceNote(s: Service) {
  if (s.durationMins) return `${s.durationMins} minutes`;
  return s.unit === "NIGHT" ? "overnight stay" : s.unit === "DAY" ? "full day" : "per booking";
}

function formatResponseTime(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  return `${h} hr${h === 1 ? "" : "s"}`;
}

/** "Sarah Mitchell" → "Sarah"; duos like "Liam & Priya" keep the full name. */
function shortName(displayName: string) {
  return displayName.includes("&") ? displayName : displayName.split(" ")[0];
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SitterProfilePage({ params }: Props) {
  const { slug } = await params;
  const sitter = await getSitterBySlug(slug);
  const fees = await getFees();
  if (!sitter) notFound();

  const user = await getCurrentUser();
  const [pets, readiness] = user ? await Promise.all([getOwnerPets(user.id), getOwnerReadiness(user.id)]) : [null, null];
  const pendingStep = readiness?.steps.find((st) => !st.done && (st.key === "approval" || st.key === "phone"));
  const readinessHint = !pendingStep
    ? null
    : pendingStep.key === "phone"
      ? "Add your phone number before booking — you can do it at checkout."
      : pendingStep.status === "PENDING"
        ? "Your account is being reviewed — you can book once it's approved."
        : "Your account can't book right now — please contact support.";

  const first = shortName(sitter.displayName);
  const about = {
    paragraphs: sitter.about ? sitter.about.split(/\n\s*\n/) : [sitter.bio],
    residentPetName: sitter.residentPetName,
  };
  const services = [...sitter.services].sort((a, b) => SERVICE_ORDER.indexOf(a.type) - SERVICE_ORDER.indexOf(b.type));
  const headlineService = services.find((s) => s.type === "DOG_WALKING") ?? services[0];
  const location = `${sitter.neighbourhood.name}, ${sitter.city.name}`;
  const kinds = sitter.species.map((s) => s.kind);
  const acceptance = { ...sitter, firstName: first, kinds };
  const dogSizes = PET_SIZES.filter((z) => ({ SMALL: sitter.acceptsSmall, MEDIUM: sitter.acceptsMedium, LARGE: sitter.acceptsLarge, GIANT: sitter.acceptsGiant })[z]);

  const photos = sitter.photos.length
    ? sitter.photos.map((p) => ({ id: p.id, url: p.url, caption: p.caption }))
    : sitter.cardPhotoUrl
      ? [{ id: "card", url: sitter.cardPhotoUrl, caption: null }]
      : [];

  const now = new Date();
  const today = todayIn(sitter.city.timeZone, now.getTime());
  const availability = await loadSnapshot(sitter.id, today, addDays(today, 180));
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const trust = [
    { icon: "badge", title: "Government ID Verified", note: "Official photo ID checked", ok: sitter.idVerified },
    { icon: "gavel", title: "Police Vulnerable Sector Check", note: "Clear record, police-issued", ok: sitter.backgroundChecked },
    { icon: "medical_services", title: "Pet First Aid & CPR", note: "Emergency care certified", ok: sitter.firstAidCertified },
    { icon: "psychology", title: "Interview Passed", note: "In-person behaviour assessment", ok: sitter.status === "ACTIVE" },
  ];

  const home = [
    {
      icon: sitter.hasYard ? "deck" : "apartment",
      tone: "text-primary",
      title: sitter.homeTitle ?? (sitter.hasYard ? "Home with Yard" : sitter.homeType === "CONDO_BALCONY" ? "Condo with Balcony" : "Cozy Apartment"),
      note: sitter.homeNote ?? (sitter.hasYard ? "Fenced outdoor space for safe play" : "Pet-proofed indoor space with nearby parks"),
    },
    sitter.smokeFree
      ? { icon: "smoke_free", tone: "text-primary", title: "Smoke-Free Home", note: "No smoking indoors, air purifier running" }
      : { icon: "smoking_rooms", tone: "text-on-surface-variant", title: "Smoking Household", note: "Ask about outdoor-only arrangements" },
    sitter.hasChildren
      ? { icon: "family_restroom", tone: "text-primary", title: "Children in the Home", note: "Great for dogs who love little humans" }
      : { icon: "child_friendly", tone: "text-primary", title: "No Children at Home", note: "A completely calm space for sensitive or shy dogs" },
    sitter.hasOtherPets
      ? {
          icon: "pets",
          tone: "text-secondary",
          title: about.residentPetName ? `Resident Pup: ${about.residentPetName}` : "Shares Home with Pets",
          note: sitter.otherPetsNote ?? "Friendly, fully vaccinated resident pets",
        }
      : { icon: "pets", tone: "text-secondary", title: "No Other Pets", note: "Your pet gets undivided attention" },
  ];

  const reviews = sitter.reviews.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    authorAvatar: r.authorAvatar,
    petLabel: r.petLabel,
    rating: r.rating,
    body: r.body,
    verifiedBooking: r.verifiedBooking,
    walkSummary: r.walkSummary,
    walkPhotoUrl: r.walkPhotoUrl,
    timeAgo: timeAgo(r.createdAt, now),
    reply: r.sitterReply
      ? { by: sitter.displayName.split(" ")[0], body: r.sitterReply, timeAgo: r.sitterRepliedAt ? timeAgo(r.sitterRepliedAt, now) : null }
      : null,
  }));

  return (
    <main className="w-full pt-20 pb-24 lg:pb-0 bg-background min-h-[calc(100vh-320px)]">
      <JsonLd
        data={[
          sitterSchema(sitter),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: `${sitter.city.name} Pet Sitters`, path: `/pet-sitters/${sitter.city.slug}` },
            { name: `${sitter.neighbourhood.name} Pet Sitters`, path: `/pet-sitters/${sitter.city.slug}/${sitter.neighbourhood.slug}` },
            { name: sitter.displayName, path: `/sitters/${sitter.slug}` },
          ]),
        ]}
      />
      <div className="flex flex-col w-full">
        <div className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-space-lg">
          {/* Breadcrumb & quick actions */}
          <div className="flex flex-row items-center justify-between gap-space-md pb-space-md md:pb-space-lg">
            <Link className="md:hidden flex items-center gap-1 font-label-lg text-label-lg text-on-surface-variant hover:text-primary" href="/sitters">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
              {sitter.city.name} Sitters
            </Link>
            <nav aria-label="Breadcrumb" className="hidden md:flex flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
              <Link className="hover:text-primary transition-colors flex items-center gap-1" href="/">
                <span className="material-symbols-outlined text-sm">home</span>
                Home
              </Link>
              <span>/</span>
              <Link className="hover:text-primary transition-colors" href={`/pet-sitters/${sitter.city.slug}`}>
                {sitter.city.name} Sitters
              </Link>
              <span>/</span>
              <Link className="hover:text-primary transition-colors" href={`/pet-sitters/${sitter.city.slug}/${sitter.neighbourhood.slug}`}>
                {sitter.neighbourhood.name}
              </Link>
              <span>/</span>
              <span aria-current="page" className="text-on-surface font-semibold">
                {sitter.displayName}
              </span>
            </nav>
            <ProfileActions isFavorite={sitter.isFavorite} name={sitter.displayName} sitterId={sitter.id} />
          </div>

          {/* Mobile: one column where the booking widget sits right under the identity card (left column uses
              `contents` so its sections can be ordered around the widget). Desktop: 8/4 grid with sticky widget. */}
          <div className="flex flex-col gap-space-lg md:gap-space-xl lg:grid lg:grid-cols-12 items-start">
            {/* LEFT COLUMN */}
            <div className="contents lg:col-span-8 lg:flex lg:flex-col lg:gap-space-xl min-w-0 max-lg:[&>*]:order-3">
              {/* Identity hero */}
              <div className="max-lg:!order-1 w-full bg-surface-container-lowest p-space-md sm:p-space-xl rounded-3xl shadow-sm flex flex-col md:flex-row gap-space-lg items-start md:items-center justify-between relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
                <div className="flex flex-row gap-space-md sm:gap-space-lg items-start sm:items-center min-w-0">
                  <div className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={`Portrait of ${sitter.displayName}`} className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl object-cover shadow-md" src={sitter.avatarUrl} />
                    {sitter.idVerified && (
                      <div
                        className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-1 sm:p-1.5 rounded-lg sm:rounded-xl shadow-md flex items-center justify-center"
                        title={sitter.isSuperSitter ? "Verified Super Sitter" : "Verified Sitter"}
                      >
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                          verified
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-space-xs min-w-0">
                    {(sitter.isSuperSitter || sitter.professionalTrainer) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {sitter.isSuperSitter && (
                          <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                              stars
                            </span>
                            Super Sitter
                          </span>
                        )}
                        {sitter.professionalTrainer && (
                          <span className="bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">school</span>
                            Certified Trainer
                          </span>
                        )}
                      </div>
                    )}
                    <h1 className="font-headline-md text-headline-md sm:font-headline-lg sm:text-headline-lg text-on-surface tracking-tight mt-1">{sitter.displayName}</h1>
                    <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant flex-wrap">
                      <span className="material-symbols-outlined text-base text-secondary">location_on</span>
                      <span className="font-medium text-on-surface">{location}</span>
                      {sitter.distanceKm !== undefined && (
                        <>
                          <span className="text-outline">·</span>
                          <span className="text-primary font-semibold">{formatDistance(sitter.distanceKm)} away</span>
                        </>
                      )}
                      <span className="text-outline">·</span>
                      <div className="flex items-center text-tertiary-container font-semibold">
                        <span className="material-symbols-outlined text-base mr-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                        {formatRating(sitter.rating)}
                      </div>
                      <span className="text-on-surface-variant">
                        ({sitter.reviewCount} review{sitter.reviewCount === 1 ? "" : "s"})
                      </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-space-sm pt-1">
                      <div className="flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span>
                          Responds in: <strong>{formatResponseTime(sitter.responseTimeMins)}</strong>
                        </span>
                        <span className="text-outline">·</span>
                        <span className="text-primary font-bold">100% response rate</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Mobile-only response line (the pill above is hidden on small screens) */}
                <div className="sm:hidden -mt-space-sm flex flex-wrap items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Responds in <strong>{formatResponseTime(sitter.responseTimeMins)}</strong>
                  <span className="text-outline">·</span>
                  <span className="text-primary font-bold">100% response rate</span>
                </div>
                {headlineService && (
                  <div className="hidden md:flex md:flex-col gap-space-sm self-stretch md:self-auto justify-end">
                    <div className="bg-surface-container-low rounded-2xl p-4 text-center min-w-[130px]">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">
                        {HEADER_PRICE_LABEL[headlineService.unit] ?? "From"}
                      </span>
                      <span className="font-headline-md text-headline-md text-primary font-bold">{formatMoney(headlineService.priceCents)}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">{headerPriceNote(headlineService)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo gallery */}
              {photos.length > 0 && (
                <div className="flex flex-col gap-space-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">photo_library</span>
                      Photos &amp; Living Space
                    </h2>
                    {sitter._count.photos > 0 && (
                      <span className="font-label-md text-label-md text-on-surface-variant">
                        {sitter._count.photos} Verified Photo{sitter._count.photos === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <PhotoGallery name={sitter.displayName} photos={photos} totalCount={Math.max(sitter._count.photos, photos.length)} />
                </div>
              )}

              {/* Trust standards */}
              <div className="bg-surface-container-low p-space-lg rounded-3xl flex flex-col gap-space-md">
                <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">verified_user</span>
                  WagStays Safety &amp; Verification Standards
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
                  {trust.map((t) => (
                    <div
                      className={`bg-surface-container-lowest p-space-md rounded-2xl flex flex-col items-center text-center gap-1.5 shadow-sm ${t.ok ? "" : "opacity-60"}`}
                      key={t.title}
                    >
                      <span className={`material-symbols-outlined text-2xl ${t.ok ? "text-primary" : "text-outline"}`}>{t.ok ? t.icon : "pending"}</span>
                      <span className="font-label-md text-label-md text-on-surface font-semibold">{t.title}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{t.ok ? t.note : "Not yet verified"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* About */}
              <div className="bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-md">
                <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person_heart</span>
                  About {first}
                </h2>
                <div className="prose font-body-lg text-body-lg text-on-surface-variant space-y-3 leading-relaxed max-w-none">
                  {about.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                {sitter.skills.length > 0 && (
                  <div className="pt-space-xs flex flex-wrap gap-2">
                    {sitter.skills.map((s) => (
                      <span className="px-3 py-1 rounded-full bg-surface-container font-label-md text-label-md text-on-surface flex items-center gap-1.5" key={s.id}>
                        {s.emoji ? `${s.emoji} ` : ""}
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Services & pricing */}
              {services.length > 0 && (
                <div className="bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">task_alt</span>
                      Services &amp; Pricing
                    </h2>
                    <span className="font-label-sm text-label-sm text-primary font-bold bg-primary-fixed/50 px-3 py-1 rounded-full">
                      All services covered by WagShield
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    {services.map((s) => {
                      const style = SERVICE_STYLE[s.type] ?? SERVICE_STYLE.DROP_IN;
                      const featured = s.id === headlineService?.id;
                      return (
                        <div
                          className={
                            featured
                              ? "p-space-lg rounded-2xl bg-surface-container-low border-2 border-primary/20 flex flex-col justify-between gap-space-md relative overflow-hidden"
                              : "p-space-lg rounded-2xl bg-surface-container-low flex flex-col justify-between gap-space-md hover:bg-surface-container transition-colors"
                          }
                          key={s.id}
                        >
                          <div className="flex items-start justify-between">
                            <div className={`w-12 h-12 rounded-2xl ${style.iconBox} flex items-center justify-center shadow-sm`}>
                              <span className="material-symbols-outlined text-2xl">{style.icon}</span>
                            </div>
                            <div className="text-right">
                              <span className={`font-headline-sm text-headline-sm ${style.price} font-bold`}>{formatMoney(s.priceCents)}</span>
                              <span className="block font-label-sm text-label-sm text-on-surface-variant">{unitLabel(s)}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-title-md text-title-md text-on-surface font-bold">{style.title}</h4>
                            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">{s.description ?? style.fallback}</p>
                            <PriceDetails
                              className="mt-space-sm pt-space-sm border-t border-outline-variant/30"
                              provinceCode={sitter.city.provinceCode}
                              service={{
                                type: s.type,
                                unit: s.unit,
                                priceCents: s.priceCents,
                                durationMins: s.durationMins,
                                maxPetsPerBooking: s.maxPetsPerBooking,
                                additionalPetPriceCents: s.additionalPetPriceCents,
                                holidayPriceCents: s.holidayPriceCents,
                                puppyPriceCents: s.puppyPriceCents,
                              }}
                            />
                          </div>
                          <div className="pt-2 flex items-center justify-between gap-2 border-t border-outline-variant/30">
                            <span
                              className={`font-label-sm text-label-sm flex items-center gap-1 ${featured ? "text-primary font-semibold" : "text-on-surface-variant"}`}
                            >
                              <span className="material-symbols-outlined text-sm">{style.feature.icon}</span>
                              {style.feature.label}
                            </span>
                            {s.extraNote && (
                              <span
                                className={
                                  featured
                                    ? "text-xs bg-surface-container-highest px-2 py-0.5 rounded-md font-bold text-on-surface-variant text-right"
                                    : "text-xs bg-surface-container px-2 py-0.5 rounded-md font-medium text-on-surface-variant text-right"
                                }
                              >
                                {s.extraNote}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-1">
                    <span className="material-symbols-outlined text-base text-primary">help</span>
                    Checkout adds WagShield vet cover, a flat service fee and {HST_PROVINCES.has(sitter.city.provinceCode) ? "HST" : "sales tax"}.
                    <Link className="text-primary font-bold hover:underline" href="/pricing">
                      How pricing works
                    </Link>
                  </p>
                </div>
              )}

              {/* Pets I care for */}
              {kinds.length > 0 && (
                <div className="bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-md" id="pets">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">pets</span>
                    Pets I Care For
                  </h2>
                  <PetKindChips kinds={kinds} />
                  {kinds.includes("DOG") && dogSizes.length > 0 && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-base text-primary">straighten</span>
                      <span>
                        Dog sizes:{" "}
                        {dogSizes.length === PET_SIZES.length
                          ? "all sizes welcome"
                          : dogSizes.map((z) => `${PET_SIZE_LABELS[z].label} (${PET_SIZE_LABELS[z].range})`).join(", ")}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Availability calendar */}
              <AvailabilityCalendar
                firstName={first}
                nowMs={now.getTime()}
                services={services.map((sv) => ({ type: sv.type, durationMins: sv.durationMins }))}
                snapshot={publicSnapshot(availability ?? { timeZone: sitter.city.timeZone, noticeHours: 12, capacity: 1, hours: [], timeOff: [], bookings: [] })}
              />

              {/* Home & environment */}
              <div className="bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-md">
                <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">home_work</span>
                  Home &amp; Environment
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  {home.map((h) => (
                    <div className="flex items-start gap-space-md p-space-md rounded-2xl bg-surface-container" key={h.title}>
                      <span className={`material-symbols-outlined ${h.tone} text-2xl`}>{h.icon}</span>
                      <div className="flex flex-col">
                        <span className="font-title-md text-title-md text-on-surface">{h.title}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{h.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-space-sm p-space-md rounded-2xl bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-md">
                  <div className="flex items-center gap-space-md">
                    <div className="w-12 h-12 shrink-0 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
                      <span className="material-symbols-outlined">distance</span>
                    </div>
                    <div>
                      <span className="font-title-md text-title-md text-on-surface block">
                        Service Area Radius: {sitter.serviceRadiusKm.toLocaleString("en-CA", { maximumFractionDigits: 1 })} km
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {sitter.serviceAreaNote ?? `${sitter.neighbourhood.name} and nearby neighbourhoods`}
                      </span>
                    </div>
                  </div>
                  <div
                    aria-label={`Map of ${location}`}
                    className="w-full sm:w-44 h-16 shrink-0 rounded-xl bg-cover bg-center overflow-hidden shadow-inner"
                    role="img"
                    style={{ backgroundImage: "url('/images/img-19.png')" }}
                  />
                </div>
              </div>

              {/* Reviews */}
              <div className="bg-surface-container-lowest p-space-lg sm:p-space-xl rounded-3xl shadow-sm flex flex-col gap-space-xl" id="reviews">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                      </span>
                      <span className="font-display-lg text-display-lg text-on-surface font-extrabold leading-none">{formatRating(sitter.rating)}</span>
                      <span className="font-title-md text-title-md text-on-surface-variant self-end">/ 5.0</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      {sitter.reviewCount} verified review{sitter.reviewCount === 1 ? "" : "s"} from real pet parents
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-space-md">
                    {[
                      { label: "Communication", value: sitter.ratingCommunication },
                      { label: "Reliability", value: sitter.ratingReliability },
                      { label: "Love & Care", value: sitter.ratingCare },
                    ].map((r) => (
                      <div className="bg-surface-container p-3 rounded-2xl text-center" key={r.label}>
                        <span className="font-label-sm text-label-sm text-on-surface-variant block">{r.label}</span>
                        <span className="font-title-md text-title-md text-primary font-bold">{(r.value || sitter.rating).toFixed(1)} ★</span>
                      </div>
                    ))}
                  </div>
                </div>
                <ReviewList reviewCount={sitter.reviewCount} reviews={reviews} />
              </div>
            </div>

            {/* RIGHT COLUMN: booking widget */}
            <div className="max-lg:order-2 w-full lg:col-span-4 lg:sticky top-24 min-w-0 scroll-mt-24" id="book">
              <BookingWidget
                availability={publicSnapshot(availability ?? { timeZone: sitter.city.timeZone, noticeHours: 12, capacity: 1, hours: [], timeOff: [], bookings: [] })}
                nowMs={now.getTime()}
                askHref={`/messages/new?sitter=${sitter.id}`}
                defaultDate={ymd(tomorrow)}
                firstName={first}
                minDate={ymd(now)}
                pets={
                  pets?.map((p) => ({
                    id: p.id,
                    name: p.name,
                    breed: p.breed,
                    ageYears: p.ageYears,
                    photoUrl: p.photoUrl,
                    icon: PET_KIND_META[petKindOf(p)].icon,
                    isDog: petKindOf(p) === "DOG",
                    blocked: petBlockReason(acceptance, p),
                  })) ?? null
                }
                services={services.map((s) => ({
                  id: s.id,
                  type: s.type,
                  priceCents: s.priceCents,
                  unit: s.unit,
                  durationMins: s.durationMins,
                  maxPetsPerBooking: s.maxPetsPerBooking,
                  additionalPetPriceCents: s.additionalPetPriceCents,
                  holidayPriceCents: s.holidayPriceCents,
                  puppyPriceCents: s.puppyPriceCents,
                }))}
                provinceCode={sitter.city.provinceCode}
                slug={sitter.slug}
                taxLabel={HST_PROVINCES.has(sitter.city.provinceCode) ? "HST" : "Sales Tax"}
                taxRateBps={sitter.city.taxRateBps}
                fees={fees}
                readinessHint={readinessHint}
              />
            </div>
          </div>
        </div>
      </div>
      {headlineService && (
        <MobileBookBar
          priceLabel={formatMoney(headlineService.priceCents)}
          rating={formatRating(sitter.rating)}
          reviewCount={sitter.reviewCount}
          unitLabel={HEADER_PRICE_LABEL[headlineService.unit]?.replace("Per ", "") ?? ""}
        />
      )}
    </main>
  );
}
