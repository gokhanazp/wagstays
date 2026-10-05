import { PET_KIND_META, normalizeKinds } from "@/lib/pets";
import type { Metadata } from "next";
import { getFees } from "@/lib/settings";
import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getActiveCity } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import {
  PET_SIZE_LABELS,
  PET_SIZES,
  SERVICE_LABELS,
  SERVICE_TYPES,
  UNIT_LABELS,
  type PetSize,
  type ServiceType,
} from "@/lib/constants";
import { DEFAULT_SLOT_INDEX, formatRelativeDayTime, getSuggestedSlots } from "@/lib/meet-greet";
import { CopyCode } from "./_components/CopyCode";
import { MeetGreetPicker } from "./_components/MeetGreetPicker";
import { ScrollToPicker } from "./_components/ScrollToPicker";
import { localizedPath } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Application Status",
  robots: { index: false, follow: false },
};

const SERVICE_UNITS: Record<ServiceType, string> = {
  DOG_WALKING: UNIT_LABELS.WALK,
  BOARDING: UNIT_LABELS.NIGHT,
  DAY_CARE: UNIT_LABELS.DAY,
  DROP_IN: UNIT_LABELS.VISIT,
};

const STATUS_LABELS: Record<string, string> = {
  IN_REVIEW: "In review",
  MEET_GREET: "Meet & Greet booked",
  APPROVED: "Approved",
  REJECTED: "Not approved",
};

const PICKER_ID = "meet-greet";

async function loadApplication(rawCode?: string) {
  const include = { services: true, user: { select: { avatarUrl: true } }, sitterProfile: { select: { slug: true } } } as const;
  const code = rawCode?.trim().replace(/^#/, "").toUpperCase();
  if (code) {
    const app = await db.sitterApplication.findUnique({ where: { trackingCode: code }, include });
    if (!app) notFound();
    return app;
  }
  const user = await getCurrentUser();
  if (!user) redirect(await localizedPath("/become-a-sitter"));
  const app = await db.sitterApplication.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include });
  if (!app) redirect(await localizedPath("/become-a-sitter"));
  return app;
}

type StepState = "current" | "action" | "done" | "next" | "pending";

const CARD = "relative flex gap-space-sm sm:gap-space-md p-space-md sm:p-space-lg rounded-2xl transition-all";
const CARD_PLAIN = `${CARD} bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(83,72,62,0.05)]`;
const CARD_RAISED = `${CARD} bg-surface-container-low shadow-[0_8px_20px_rgba(83,72,62,0.06)]`;
const CARD_MUTED = `${CARD} bg-surface-container-lowest shadow-[0_4px_16px_-2px_rgba(83,72,62,0.03)]`;
const BADGE = "px-2.5 py-0.5 rounded-full font-label-sm text-label-sm";

function StepNode({ state, icon, last }: { state: StepState; icon: string; last?: boolean }) {
  const node =
    state === "done" || state === "current"
      ? "bg-primary text-on-primary shadow-md"
      : state === "action"
        ? "bg-secondary text-on-secondary shadow-md"
        : "bg-surface-container-highest text-on-surface-variant";
  const glyph = state === "done" ? "check" : state === "current" ? "sync" : icon;
  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${node}`}>
        <span className={`material-symbols-outlined text-xl ${state === "current" ? "animate-spin" : ""}`}>{glyph}</span>
      </div>
      {!last && (
        <div className={`w-0.5 h-full mt-2 ${state === "done" || state === "current" ? "bg-primary-fixed-dim" : "bg-surface-container-highest"}`} />
      )}
    </div>
  );
}

function StepBadge({ state, pendingLabel = "Pending", label }: { state: StepState; pendingLabel?: string; label?: string }) {
  if (state === "current")
    return (
      <span className={`${BADGE} bg-surface-container-highest text-secondary font-bold flex items-center gap-1`}>
        <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
        {label ?? "Under review now"}
      </span>
    );
  if (state === "action" || state === "next")
    return <span className={`${BADGE} bg-secondary-fixed text-on-secondary-fixed-variant font-bold`}>{label ?? "Up next"}</span>;
  if (state === "done")
    return <span className={`${BADGE} bg-primary-fixed text-on-primary-fixed-variant font-bold`}>{label ?? "Completed"}</span>;
  return <span className={`${BADGE} bg-surface-container text-on-surface-variant`}>{pendingLabel}</span>;
}

export default async function ApplicationSubmittedPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  const { vetCoverageCents } = await getFees();
  const { code } = await searchParams;
  const app = await loadApplication(Array.isArray(code) ? code[0] : code);

  const [hood, city] = await Promise.all([
    app.neighbourhood
      ? db.neighbourhood.findFirst({
          where: { OR: [{ slug: app.neighbourhood }, { name: app.neighbourhood }] },
          include: { city: true },
        })
      : null,
    getActiveCity(),
  ]);
  const hoodName = hood?.name ?? app.neighbourhood ?? city.name;
  const cityName = hood?.city.name ?? city.name;
  const location = hood ? `${hood.name}, ${cityName}` : (app.neighbourhood ?? `${city.name}, ${city.provinceCode}`);

  const now = new Date();
  const slots = getSuggestedSlots(now);
  const status = app.status;
  const approved = status === "APPROVED";
  const rejected = status === "REJECTED";
  const booked = !!app.meetGreetAt && (status === "MEET_GREET" || approved);
  const bookedLabel = app.meetGreetAt ? formatRelativeDayTime(app.meetGreetAt, now) : null;
  const canBook = status === "IN_REVIEW" || status === "MEET_GREET";

  const s1: StepState = status === "IN_REVIEW" || status === "REJECTED" ? "current" : "done";
  const s2: StepState = approved || booked ? "done" : rejected ? "pending" : "action";
  const s3: StepState = approved ? "done" : booked ? "next" : "pending";
  const s4: StepState = approved ? "done" : "pending";

  const docsUploaded = [app.idDocumentName, app.backgroundCheckName].filter(Boolean).length;
  const reviewEta = formatRelativeDayTime(new Date(app.createdAt.getTime() + 24 * 3_600_000), now);

  const services = [...app.services].sort(
    (a, b) => SERVICE_TYPES.indexOf(a.type as ServiceType) - SERVICE_TYPES.indexOf(b.type as ServiceType),
  );
  const sizeFlags: Record<PetSize, boolean> = {
    SMALL: app.acceptsSmall,
    MEDIUM: app.acceptsMedium,
    LARGE: app.acceptsLarge,
    GIANT: app.acceptsGiant,
  };
  const sizes = PET_SIZES.filter((s) => sizeFlags[s]);
  const kinds = app.acceptedKinds.length ? normalizeKinds(app.acceptedKinds) : (["DOG"] as const);
  const applicantName = `${app.firstName} ${app.lastName.charAt(0)}.`;

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="flex flex-col w-full">
        <div className="max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-space-lg flex flex-col gap-space-xl">
          {/* Breadcrumb & Step Progress Pill */}
          <section className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-space-xs text-on-surface-variant font-label-md text-label-md">
              <Link className="hover:text-primary transition-colors flex items-center gap-1" href="/">
                <span className="material-symbols-outlined text-base">home</span>
                <span>Home</span>
              </Link>
              <span className="text-outline-variant">/</span>
              <Link className="hover:text-primary transition-colors" href="/become-a-sitter">
                Join Our Pack
              </Link>
              <span className="text-outline-variant">/</span>
              <span className="text-primary font-semibold" aria-current="page">
                Application Status
              </span>
            </nav>
            <div className="inline-flex items-center gap-space-sm bg-surface-container px-space-md py-1.5 rounded-full shadow-sm w-fit">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
              </span>
              <span className="font-label-md text-label-md text-on-surface">Step 4/4 completed</span>
              <span className="text-outline-variant">•</span>
              <span className="font-label-md text-label-md text-secondary font-bold">{STATUS_LABELS[status] ?? "In review"}</span>
            </div>
          </section>

          {/* Celebratory Hero Banner */}
          <section className="relative overflow-hidden rounded-3xl bg-surface-container-low shadow-[0_4px_24px_rgba(83,72,62,0.06)] p-space-md sm:p-space-xl lg:p-12">
            <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-space-lg sm:gap-space-xl items-center">
              <div className="lg:col-span-8 flex flex-col gap-space-md">
                <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm w-fit shadow-xs">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {rejected ? "info" : "celebration"}
                  </span>
                  <span>{approved ? "You're approved!" : rejected ? "Application update" : "We've got your application!"}</span>
                </div>
                <h1 className="font-headline-lg-mobile text-headline-lg-mobile sm:font-headline-lg sm:text-headline-lg md:font-display-lg md:text-display-lg text-on-surface tracking-tight leading-tight">
                  {approved ? (
                    <>
                      Welcome to the pack! You&apos;re now an <span className="text-secondary">official WagStays sitter</span> 🐾🎉
                    </>
                  ) : rejected ? (
                    <>Thank you for applying to WagStays</>
                  ) : (
                    <>
                      Congratulations! You&apos;ve taken your <span className="text-secondary">first step</span> into the{" "}
                      <span className="whitespace-nowrap">WagStays family 🐾🎉</span>
                    </>
                  )}
                </h1>
                <p className="font-body-md text-body-md sm:font-body-lg sm:text-body-lg text-on-surface-variant max-w-2xl leading-relaxed sm:leading-relaxed">
                  {approved
                    ? `Your profile is live for pet parents in ${hoodName}. Set up your services, photos and availability to start receiving requests.`
                    : rejected
                      ? "After careful review, we're not able to approve your application right now. This is often about missing documents or experience we couldn't verify — our Sitter Support team can tell you more and help you re-apply."
                      : `Your application and documents are safely in our system. You're only a few steps away from sharing lots of love with the furry friends of ${hoodName} and beyond!`}
                </p>
                {approved && app.sitterProfile && (
                  <div className="flex flex-wrap gap-space-sm">
                    <Link className="px-space-lg py-3 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center gap-2 hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="/sitter">
                      <span className="material-symbols-outlined text-base">space_dashboard</span>
                      Go to my Sitter Dashboard
                    </Link>
                    <Link className="px-space-lg py-3 rounded-full bg-surface-container-lowest text-primary font-label-lg text-label-lg flex items-center gap-2 hover:bg-surface-container-high transition-all" href={`/sitters/${app.sitterProfile.slug}`}>
                      <span className="material-symbols-outlined text-base">visibility</span>
                      View my public profile
                    </Link>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-space-sm pt-space-xs">
                  <CopyCode code={app.trackingCode} />
                  {!approved && !rejected && (
                  <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-md py-2 rounded-xl shadow-xs">
                    <span className="material-symbols-outlined text-tertiary text-lg">schedule</span>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Estimated review</span>
                      <span className="font-label-lg text-label-lg text-tertiary font-bold">12 – 24 hours</span>
                    </div>
                  </div>
                  )}
                  <div className="col-span-2 flex items-center gap-space-xs bg-primary-fixed/50 px-space-md py-2 rounded-xl shadow-xs">
                    <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                    <span className="font-label-md text-label-md text-on-primary-fixed-variant">
                      {rejected ? "Review complete" : s1 === "done" ? "Security check passed" : "Security check started"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4 flex justify-center lg:justify-end">
                <div className="relative w-48 h-48 sm:w-72 sm:h-72">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-secondary-fixed to-primary-fixed-dim rotate-6 scale-105" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="relative w-full h-full object-cover rounded-full shadow-[0_8px_24px_rgba(83,72,62,0.12)]"
                    alt="A cheerful young woman hugging a fluffy golden retriever in a sunlit park"
                    src="/images/img-21.jpg"
                  />
                  <div className="absolute -bottom-2 -left-2 bg-surface-container-lowest px-space-md py-2 rounded-2xl shadow-md flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      pets
                    </span>
                    <div className="flex flex-col text-left">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Pre-approval match</span>
                      <span className="font-label-md text-label-md text-primary font-bold">94% match score</span>
                    </div>
                  </div>
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-xl">favorite</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Timeline + Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
            <section className="lg:col-span-7 flex flex-col gap-space-lg">
              <div className="flex items-center justify-between gap-space-sm">
                <div className="flex flex-col">
                  <h2 className="font-headline-md text-headline-md text-on-surface">Your Approval Journey</h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Become an official WagStays Badge Sitter in 4 steps</p>
                </div>
                <span className="font-label-sm text-label-sm px-space-md py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-semibold whitespace-nowrap">
                  {approved ? "Complete" : rejected ? "Closed" : "In progress"}
                </span>
              </div>
              <div className="flex flex-col gap-space-md relative">
                {/* STEP 1 */}
                <div className={CARD_PLAIN}>
                  <StepNode state={s1} icon="fact_check" />
                  <div className="flex-1 min-w-0 flex flex-col gap-space-xs pb-space-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">1. Document &amp; Security Review</h3>
                      <StepBadge state={s1} label={rejected ? "Not approved" : undefined} />
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Our team is carefully reviewing your government ID, Police Vulnerable Sector Check and proof of address, in line
                      with PIPEDA.
                    </p>
                    <div className="mt-space-xs flex items-center flex-wrap gap-x-space-md gap-y-1 text-on-surface-variant font-body-sm text-body-sm">
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <span className="material-symbols-outlined text-base">{s1 === "done" ? "task_alt" : "timer"}</span>
                        {s1 === "done" ? "Review passed" : rejected ? "Review complete" : `Est. done: ${reviewEta}`}
                      </span>
                      <span className="text-outline-variant">•</span>
                      <span className="text-on-surface-variant">{docsUploaded}/2 documents uploaded</span>
                    </div>
                  </div>
                </div>

                {/* STEP 2: Meet & Greet */}
                <div id={PICKER_ID} className={`${CARD_RAISED} scroll-mt-28`}>
                  <StepNode state={s2} icon="video_camera_front" />
                  <div className="flex-1 min-w-0 flex flex-col gap-space-sm pb-space-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-title-md text-title-md text-on-surface">2. 15-Minute Online Meet &amp; Greet</h3>
                      <StepBadge state={s2} label={rejected ? "Not available" : s2 === "action" ? "Up next • Booking open" : approved ? "Completed" : "Booked"} />
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Have a short, friendly Google Meet chat with our WagStays community coordinator and ask anything you&apos;re curious
                      about.
                    </p>
                    {!approved && !rejected && (
                      <MeetGreetPicker
                        code={app.trackingCode}
                        slots={slots}
                        defaultIndex={DEFAULT_SLOT_INDEX}
                        bookedLabel={booked ? bookedLabel : null}
                        canBook={canBook}
                      />
                    )}
                  </div>
                </div>

                {/* STEP 3 */}
                <div className={`${s3 === "done" ? CARD_PLAIN : CARD_MUTED} ${s3 === "pending" ? "opacity-85" : ""}`}>
                  <StepNode state={s3} icon="verified_user" />
                  <div className="flex-1 min-w-0 flex flex-col gap-space-xs pb-space-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-title-md text-title-md text-on-surface">3. WagStays Badge &amp; Profile Activation</h3>
                      <StepBadge state={s3} />
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Right after your Meet &amp; Greet, your profile goes live for pet parents in {hoodName} and nearby, and you can start
                      accepting bookings.
                    </p>
                  </div>
                </div>

                {/* STEP 4 */}
                <div className={`${s4 === "done" ? CARD_PLAIN : CARD_MUTED} ${s4 === "pending" ? "opacity-75" : ""}`}>
                  <StepNode state={s4} icon="redeem" last />
                  <div className="flex-1 min-w-0 flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-title-md text-title-md text-on-surface">4. Welcome Kit &amp; First Booking Support</h3>
                      <StepBadge state={s4} pendingLabel="Final step" />
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      We&apos;ll ship a WagStays reflective walking leash, a pet first aid handbook, a treat pouch and an emergency info card
                      right to your door.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Application Summary */}
            <section className="lg:col-span-5 flex flex-col gap-space-lg">
              <div className="bg-surface-container-lowest p-space-lg rounded-3xl shadow-[0_4px_20px_rgba(83,72,62,0.06)] flex flex-col gap-space-md">
                <div className="flex items-center justify-between pb-space-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      badge
                    </span>
                    <h3 className="font-title-md text-title-md text-on-surface">Application Summary</h3>
                  </div>
                  <Link href="/become-a-sitter" className="font-label-sm text-label-sm text-secondary hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit
                  </Link>
                </div>
                <div className="flex items-center gap-space-md p-space-md rounded-2xl bg-surface-container-low">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={applicantName}
                    className="w-14 h-14 rounded-full object-cover shadow-sm"
                    src={app.user?.avatarUrl ?? "/images/img-22.jpg"}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-sm text-headline-sm text-on-surface">{applicantName}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-secondary">location_on</span>
                      {location}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-space-sm pt-space-xs">
                  <div className="flex justify-between items-center gap-space-sm py-2 px-1">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Selected services</span>
                    <div className="flex flex-col items-end text-right">
                      {services.length === 0 && <span className="font-label-md text-label-md text-on-surface">—</span>}
                      {services.map((s, i) => {
                        const type = s.type as ServiceType;
                        const text = `${SERVICE_LABELS[type] ?? s.type} (${formatMoney(s.priceCents)}/${SERVICE_UNITS[type] ?? "visit"})`;
                        return (
                          <span
                            key={s.id}
                            className={i === 0 ? "font-label-md text-label-md text-on-surface" : "font-label-sm text-label-sm text-on-surface-variant"}
                          >
                            {text}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="w-full h-px bg-surface-container" />
                  <div className="flex justify-between items-center gap-space-sm py-2 px-1">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Pets</span>
                    <div className="flex items-center justify-end flex-wrap gap-1">
                      {kinds.map((k) => (
                        <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container rounded-md font-label-sm text-label-sm text-on-surface whitespace-nowrap">
                          <span aria-hidden className="material-symbols-outlined text-sm text-primary">{PET_KIND_META[k].icon}</span>
                          {PET_KIND_META[k].label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={`w-full h-px bg-surface-container ${kinds.includes("DOG") ? "" : "hidden"}`} />
                  <div className={`flex justify-between items-center gap-space-sm py-2 px-1 ${kinds.includes("DOG") ? "" : "hidden"}`}>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Accepted sizes</span>
                    <div className="flex items-center justify-end flex-wrap gap-1">
                      {sizes.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-surface-container rounded-md font-label-sm text-label-sm text-on-surface whitespace-nowrap">
                          {PET_SIZE_LABELS[s].label} ({PET_SIZE_LABELS[s].range})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-full h-px bg-surface-container" />
                  <div className="flex justify-between items-center gap-space-sm py-2 px-1">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Availability</span>
                    <span className="font-label-md text-label-md text-on-surface">Weekdays &amp; weekends</span>
                  </div>
                  <div className="w-full h-px bg-surface-container" />
                  <div className="p-space-md rounded-2xl bg-primary-fixed/30 flex items-center justify-between gap-space-sm">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-primary-fixed-variant">Target monthly earnings</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">With ~14 sessions a week</span>
                    </div>
                    <div className="text-right">
                      <span className="font-headline-md text-headline-md text-primary font-extrabold">{formatMoney(284_000)}</span>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">/ month</span>
                    </div>
                  </div>
                </div>
                <div className="p-space-sm rounded-xl bg-surface-container flex items-center gap-space-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                    shield
                  </span>
                  <span className="font-body-sm text-body-sm">
                    Every service is covered by up to {formatMoney(vetCoverageCents)} in WagShield vet care.
                  </span>
                </div>
              </div>
              <div className="bg-surface-container-high p-space-md rounded-2xl flex items-center gap-space-md">
                <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">groups</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-title-md text-title-md text-on-surface">1,200+ Active Sitters</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    28,000+ happy pets cared for across {cityName}
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* While you wait */}
          {!approved && !rejected && (
          <section className="flex flex-col gap-space-lg pt-space-md">
            <div className="flex flex-col">
              <div className="inline-flex items-center gap-2 text-secondary font-label-lg text-label-lg mb-1">
                <span className="material-symbols-outlined text-base">rocket_launch</span>
                <span>Get a head start</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">What Can You Do While You Wait?</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Boost your profile score with these mini tasks before your Meet &amp; Greet
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
              <div className="group bg-surface-container-lowest p-space-lg rounded-2xl shadow-[0_4px_16px_-2px_rgba(83,72,62,0.05)] hover:shadow-[0_10px_24px_-4px_rgba(83,72,62,0.08)] hover:-translate-y-1 transition-all flex flex-col justify-between gap-space-md">
                <div className="flex flex-col gap-space-sm">
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">school</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-primary bg-primary-fixed/40 px-2 py-0.5 rounded-full font-bold">15 min</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">+100 profile points</span>
                  </div>
                  <h3 className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">
                    Wag Academy: Behaviour Basics &amp; First Aid Guide
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    A short video series on managing leash tension, first contact with shy dogs and handling emergencies.
                  </p>
                </div>
                <button
                  className="w-full py-2.5 px-space-md rounded-full bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-label-md text-label-md transition-all flex items-center justify-center gap-1.5"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">play_circle</span>
                  <span>Watch the Lessons</span>
                </button>
              </div>
              <div className="group bg-surface-container-lowest p-space-lg rounded-2xl shadow-[0_4px_16px_-2px_rgba(83,72,62,0.05)] hover:shadow-[0_10px_24px_-4px_rgba(83,72,62,0.08)] hover:-translate-y-1 transition-all flex flex-col justify-between gap-space-md">
                <div className="flex flex-col gap-space-sm">
                  <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-2xl">forum</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded-full font-bold">Community</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{hoodName} group</span>
                  </div>
                  <h3 className="font-title-md text-title-md text-on-surface group-hover:text-secondary transition-colors">
                    Join the Sitter WhatsApp &amp; Discord Community
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Meet experienced sitters near you, learn the best park routes and swap stories from the field.
                  </p>
                </div>
                <button
                  className="w-full py-2.5 px-space-md rounded-full bg-surface-container hover:bg-secondary hover:text-on-secondary text-on-surface font-label-md text-label-md transition-all flex items-center justify-center gap-1.5"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">chat</span>
                  <span>Join the Group</span>
                </button>
              </div>
              <div className="group bg-surface-container-lowest p-space-lg rounded-2xl shadow-[0_4px_16px_-2px_rgba(83,72,62,0.05)] hover:shadow-[0_10px_24px_-4px_rgba(83,72,62,0.08)] hover:-translate-y-1 transition-all flex flex-col justify-between gap-space-md">
                <div className="flex flex-col gap-space-sm">
                  <div className="w-12 h-12 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-tertiary bg-tertiary-fixed/60 px-2 py-0.5 rounded-full font-bold">35% more requests</span>
                  </div>
                  <h3 className="font-title-md text-title-md text-on-surface group-hover:text-tertiary transition-colors">
                    Enrich Your Photos &amp; Home Setup
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                    Add happy photos from past time with pets and, if you have them, the safe resting spots in your home.
                  </p>
                </div>
                <Link
                  href="/become-a-sitter"
                  className="w-full py-2.5 px-space-md rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">photo_library</span>
                  <span>Upload Photos</span>
                </Link>
              </div>
            </div>
          </section>
          )}

          {/* Support */}
          <section className="bg-surface-container-low p-space-lg md:p-space-xl rounded-3xl flex flex-col md:flex-row items-center justify-between gap-space-lg shadow-sm">
            <div className="flex items-center gap-space-md">
              <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary flex-shrink-0">
                <span className="material-symbols-outlined text-3xl">support_agent</span>
              </div>
              <div className="flex flex-col">
                <h4 className="font-headline-sm text-headline-sm text-on-surface">Got a question on your mind?</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Our Sitter Support team is happy to help 7 days a week, from 9:00 AM to 9:00 PM.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-space-sm flex-wrap w-full md:w-auto">
              <a
                className="flex-1 md:flex-initial px-space-md py-3 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container-high font-label-lg text-label-lg transition-all flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
                href="sms:+14165550142"
              >
                <span className="material-symbols-outlined text-lg text-primary">chat_bubble</span>
                <span>Chat with us</span>
              </a>
              <a
                className="flex-1 md:flex-initial px-space-md py-3 rounded-full bg-surface-container-lowest text-on-surface hover:bg-surface-container-high font-label-lg text-label-lg transition-all flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
                href={`mailto:sitters@wagstays.ca?subject=${encodeURIComponent(`Application ${app.trackingCode}`)}`}
              >
                <span className="material-symbols-outlined text-lg text-on-surface-variant">mail</span>
                <span>Email us</span>
              </a>
            </div>
          </section>

          {/* Bottom action dock */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between sm:flex-wrap gap-space-sm sm:gap-space-md pt-space-xs pb-space-sm">
            <Link
              className="px-space-lg py-3 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-label-lg text-label-lg transition-all flex items-center justify-center gap-2"
              href="/"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Back to Home</span>
            </Link>
            {!approved && !rejected && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-space-md">
                <span className="hidden sm:inline font-body-sm text-body-sm text-on-surface-variant">
                  {booked && bookedLabel ? `Meet & Greet: ${bookedLabel}` : "Next up: pick your 15-min Meet & Greet"}
                </span>
                <ScrollToPicker targetId={PICKER_ID} label={booked ? "View My Meet & Greet" : "Pick My Meet & Greet Time"} />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
