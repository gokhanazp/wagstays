/* eslint-disable @next/next/no-img-element -- plain <img> keeps the design's object-cover layouts identical */
import Link from "next/link";
import { SERVICE_SLUGS, type ServiceType } from "@/lib/constants";
import { formatDistance, formatMoney, formatRating } from "@/lib/format";
import { defaultHoodOf, getActiveCities, getActiveCity, getFeaturedSitters, getHomeTestimonials, getPlatformStats } from "@/lib/queries";
import { CarouselControls } from "./_home/CarouselControls";
import { FeaturedHeart } from "./_home/FeaturedHeart";
import { HomeSearch } from "./_home/HomeSearch";

const FILLED = { fontVariationSettings: "'FILL' 1" } as const;

// Marketing floors from the design: real platform stats replace them once they're bigger.
const MARKETING_BOOKINGS = 25_000;
const MARKETING_RATING = 4.96;
const MARKETING_PARENTS = 4_200;

const SERVICE_CARDS = [
  {
    type: "DOG_WALKING",
    icon: "directions_walk",
    iconBox: "bg-primary-fixed text-primary",
    eyebrow: "Most Popular",
    accent: "text-primary",
    arrowHover: "group-hover:bg-primary group-hover:text-on-primary",
    title: "Dog Walking",
    body: "Live GPS route tracking, pee & poop updates, fresh-water breaks and plenty of sniffing adventures.",
    chips: ["30 / 60 min", "GPS Map", "Solo Walks"],
    price: "$28",
    unit: "/hour",
  },
  {
    type: "BOARDING",
    icon: "roofing",
    iconBox: "bg-secondary-fixed text-secondary",
    eyebrow: "Cage-Free Stays",
    accent: "text-secondary",
    arrowHover: "group-hover:bg-secondary group-hover:text-on-secondary",
    title: "Overnight Boarding",
    body: "While you're away, your pet stays in a sitter's cosy home: cage-free, loved and treated like family all night.",
    chips: ["Cosy Home", "Overnight Care", "Special Diets"],
    price: "$65",
    unit: "/night",
  },
  {
    type: "DROP_IN",
    icon: "cruelty_free",
    iconBox: "bg-tertiary-fixed text-tertiary",
    eyebrow: "Ideal for Cats",
    accent: "text-tertiary",
    arrowHover: "group-hover:bg-tertiary group-hover:text-on-tertiary",
    title: "Cat Visits & Play",
    body: "In the comfort of their own home: food, fresh water, litter cleaning, brushing and a 30-minute laser play session.",
    chips: ["Stays at Home", "Litter Cleaning", "Photos & Video"],
    price: "$22",
    unit: "/visit",
  },
  {
    type: "DAY_CARE",
    icon: "sports_baseball",
    iconBox: "bg-primary-fixed-dim text-on-primary-fixed-variant",
    eyebrow: "For Office Days",
    accent: "text-primary",
    arrowHover: "group-hover:bg-primary group-hover:text-on-primary",
    title: "Doggy Day Care",
    body: "No more lonely days at home while you work. Social play sessions, yard zoomies and restful nap times.",
    chips: ["8 AM – 7 PM", "Social Play", "Nap Time"],
    price: "$45",
    unit: "/day",
  },
] satisfies {
  type: ServiceType;
  icon: string;
  iconBox: string;
  eyebrow: string;
  accent: string;
  arrowHover: string;
  title: string;
  body: string;
  chips: string[];
  price: string;
  unit: string;
}[];

// Per-card colourways from the design, cycled by position.
const SITTER_TONES = [
  { badge: "bg-primary text-on-primary", credential: "bg-tertiary-fixed text-tertiary" },
  { badge: "bg-secondary text-on-secondary", credential: "bg-primary-fixed text-primary" },
  { badge: "bg-tertiary text-on-tertiary", credential: "bg-secondary-fixed text-secondary" },
];

// The service each featured card highlights (design: boarding, walking, drop-in), falling back to the cheapest.
const SITTER_PRICE_PREF: ServiceType[] = ["BOARDING", "DOG_WALKING", "DROP_IN"];
const PRICE_LABELS: Record<ServiceType, string> = {
  BOARDING: "Per Night",
  DOG_WALKING: "Walk / Hour",
  DAY_CARE: "Per Day",
  DROP_IN: "Per Visit",
};

function Stars({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span className="material-symbols-outlined text-sm" key={i} style={FILLED}>
          star
        </span>
      ))}
    </>
  );
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export default async function Home() {
  const [city, cities, sitters, testimonials, stats] = await Promise.all([
    getActiveCity(),
    getActiveCities(),
    getFeaturedSitters(),
    getHomeTestimonials(),
    getPlatformStats(),
  ]);

  const bookings = Math.max(stats.completedBookings, MARKETING_BOOKINGS);
  const rating = stats.completedBookings >= MARKETING_BOOKINGS ? stats.avgRating : MARKETING_RATING;
  const parents = Math.max(stats.completedBookings, MARKETING_PARENTS);
  const defaultHood = defaultHoodOf(city)?.slug;
  const now = new Date();

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="flex flex-col w-full overflow-hidden">
        {/* HERO */}
        <section className="relative w-full -mt-20 pt-28 pb-16 bg-gradient-to-b from-surface-container via-surface to-background overflow-hidden">
          <div className="absolute -top-16 -left-16 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
          <div className="absolute top-48 -right-20 w-[480px] h-[480px] rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />
          {/* Mobile: copy → search → photo (the grid uses `contents` so the search can sit between them);
              lg: the original copy/photo grid with the search underneath. */}
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin relative z-10 flex flex-col gap-space-xl lg:block">
            <div className="contents lg:grid lg:grid-cols-12 lg:gap-space-xl lg:items-center lg:mb-space-xl">
              {/* Left Hero Copy */}
              <div className="lg:col-span-7 flex flex-col gap-space-md">
                <div className="inline-flex items-center gap-2 px-space-md py-1.5 rounded-full bg-surface-container-lowest text-primary shadow-sm w-fit">
                  <span className="material-symbols-outlined text-lg text-secondary" style={FILLED}>
                    pets
                  </span>
                  <span className="font-label-md text-label-md sm:font-label-lg sm:text-label-lg tracking-wide sm:tracking-wide uppercase">{city.name}&apos;s Most Loved Pet Care Platform</span>
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                </div>
                <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-extrabold sm:font-display-lg-mobile sm:text-display-lg-mobile md:font-display-lg md:text-display-lg text-on-surface leading-tight sm:leading-tight md:leading-tight tracking-tight sm:tracking-tight md:tracking-tight">
                  For Your Furry Best Friend
                  <br />
                  <span className="text-secondary relative inline-block">
                    Loving & Trusted
                    <svg className="absolute -bottom-2 left-0 w-full h-3 text-secondary-container opacity-60" fill="none" preserveAspectRatio="none" viewBox="0 0 250 12">
                      <path d="M2 9C50 3 150 1 248 7" stroke="currentColor" strokeLinecap="round" strokeWidth="4" />
                    </svg>
                  </span>
                  <span className="text-primary block mt-1">Sitters Right Next Door</span>
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
                  Verified pet lovers in your neighbourhood, professional dog walkers and free 24/7 emergency vet support, so you
                  can travel with total peace of mind while your pet is in great hands.
                </p>
                <div className="flex flex-wrap items-center gap-space-lg pt-space-xs text-on-surface-variant">
                  <div className="flex items-center -space-x-3">
                    <img alt="WagStays sitter holding a tabby kitten" className="w-11 h-11 rounded-full object-cover shadow-sm bg-surface-container-high" src="/images/img-03.jpg" />
                    <img alt="WagStays sitter with a Golden Retriever" className="w-11 h-11 rounded-full object-cover shadow-sm bg-surface-container-high" src="/images/img-04.jpg" />
                    <img alt="WagStays sitter with two small dogs" className="w-11 h-11 rounded-full object-cover shadow-sm bg-surface-container-high" src="/images/img-05.jpg" />
                    <div className="w-11 h-11 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center shadow-sm">
                      +{(parents / 1000).toFixed(1).replace(/\.0$/, "")}k
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-secondary">
                      <Stars />
                      <span className="font-title-md text-title-md text-on-surface ml-1">{rating.toFixed(2)} / 5.0</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {bookings.toLocaleString("en-CA")}+ happy bookings completed
                    </p>
                  </div>
                </div>
              </div>
              {/* Right Hero Visual Collage */}
              <div className="max-lg:order-3 lg:col-span-5 relative">
                <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-xl bg-surface-container-high">
                  <img alt="A happy Golden Retriever playing catch with a dog walker in a sunny park" className="w-full h-full object-cover" src="/images/img-06.jpg" />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface/40 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 bg-surface-container-lowest/95 backdrop-blur-md p-space-md rounded-2xl shadow-lg flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-2xl" style={FILLED}>
                          location_on
                        </span>
                      </div>
                      <div>
                        <div className="font-label-lg text-label-lg text-on-surface">Live Walk in Progress</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                          Maple & Olive (Woodbine Beach)
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap">
                      <span className="font-headline-sm text-headline-sm text-primary">2.4 km</span>
                      <span className="block font-label-sm text-label-sm text-on-surface-variant">38 min</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 right-0 sm:-right-4 bg-surface-container-lowest py-2.5 px-4 rounded-2xl shadow-md flex items-center gap-2 animate-bounce">
                  <span className="text-xl">🩺</span>
                  <div>
                    <p className="font-label-sm text-label-sm text-secondary leading-none">WagStays</p>
                    <p className="font-label-lg text-label-lg text-on-surface leading-tight">Vet Care Covered</p>
                  </div>
                </div>
              </div>
            </div>
            {/* SEARCH */}
            <div className="max-lg:order-2">
              <HomeSearch
                defaultCity={city.slug}
                defaultEnd={isoDay(addDays(now, 20))}
                defaultHood={defaultHood}
                defaultStart={isoDay(addDays(now, 16))}
                hoods={cities.flatMap((c) => c.neighbourhoods.map((n) => ({ slug: n.slug, name: n.name, city: c.slug, cityLabel: `${c.name}, ${c.provinceCode}` })))}
                today={isoDay(now)}
              />
            </div>
          </div>
        </section>

        {/* OUR SERVICES */}
        <section className="w-full py-space-xl bg-background">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-xl">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm uppercase tracking-wider mb-2">
                  <span>🐾</span>
                  Professional Care Options
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Loving Care for Every Need of Your Furry Friend</h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                Every pet has their own habits and personality. Pick the service that suits yours best and start with confidence
                after a free Meet & Greet.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {SERVICE_CARDS.map((c) => (
                <Link
                  className="group bg-surface-container-low rounded-3xl p-space-md flex flex-col justify-between hover:bg-surface-container transition-all hover:-translate-y-1 shadow-sm hover:shadow-md"
                  href={`/sitters?service=${SERVICE_SLUGS[c.type]}`}
                  key={c.type}
                >
                  <div>
                    <div className={`w-14 h-14 rounded-2xl ${c.iconBox} flex items-center justify-center mb-space-md group-hover:scale-110 transition-transform`}>
                      <span className="material-symbols-outlined text-3xl">{c.icon}</span>
                    </div>
                    <span className={`font-label-sm text-label-sm uppercase tracking-wider ${c.accent} font-bold`}>{c.eyebrow}</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface mt-1 mb-2">{c.title}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-space-md">{c.body}</p>
                    <div className="flex flex-wrap gap-1.5 mb-space-md">
                      {c.chips.map((chip) => (
                        <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm" key={chip}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-space-sm flex items-center justify-between">
                    <div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">From</span>
                      <span className={`font-headline-sm text-headline-sm ${c.accent}`}>
                        {c.price}
                        <span className="font-body-sm text-body-sm text-on-surface-variant"> {c.unit}</span>
                      </span>
                    </div>
                    <span
                      aria-hidden
                      className={`w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface ${c.arrowHover} transition-colors shadow-sm`}
                    >
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED SITTERS */}
        <section className="w-full py-space-xl bg-surface-container-low/60">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-xl">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-secondary font-label-sm text-label-sm uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-sm" style={FILLED}>
                    verified
                  </span>
                  Top Rated Sitters
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Friendly Pet Lovers in Your Neighbourhood</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Experienced hands, every one interviewed in person, with police and reference checks completed.
                </p>
              </div>
              <CarouselControls targetId="featured-sitters" />
            </div>
            <div
              className="flex gap-space-lg overflow-x-auto snap-x snap-mandatory scroll-smooth scroll-px-2 -m-2 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              id="featured-sitters"
            >
              {sitters.map((s, i) => {
                const tone = SITTER_TONES[i % SITTER_TONES.length];
                const pref = SITTER_PRICE_PREF[i % SITTER_PRICE_PREF.length];
                const svc = s.services.find((x) => x.type === pref) ?? [...s.services].sort((a, b) => a.priceCents - b.priceCents)[0];
                return (
                  <div
                    className="snap-start shrink-0 w-full md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] bg-surface-container-lowest rounded-3xl p-space-md shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                    key={s.id}
                  >
                    <div>
                      <div className="relative w-full h-64 rounded-2xl overflow-hidden mb-space-md bg-surface-container">
                        <img
                          alt={`${s.displayName}, WagStays sitter`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          src={s.cardPhotoUrl ?? s.avatarUrl}
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="bg-surface-container-lowest/95 backdrop-blur-sm text-primary font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <span className="material-symbols-outlined text-xs" style={FILLED}>
                              star
                            </span>
                            {formatRating(s.rating)} ({s.reviewCount} Reviews)
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <FeaturedHeart initial={s.isFavorite} name={s.displayName} sitterId={s.id} />
                        </div>
                        {s.featuredBadge && (
                          <div className="absolute bottom-3 left-3">
                            <span className={`${tone.badge} font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm`}>
                              {s.featuredBadgeIcon && <span className="material-symbols-outlined text-xs">{s.featuredBadgeIcon}</span>}
                              {s.featuredBadge}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-space-sm mb-2">
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface">{s.displayName}</h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                            {s.neighbourhood.name} ({formatDistance(s.distanceKm)} away)
                          </p>
                        </div>
                        {s.credential && (
                          <span className={`px-2.5 py-1 rounded-full ${tone.credential} font-label-sm text-label-sm font-semibold text-center`}>
                            {s.credential}
                          </span>
                        )}
                      </div>
                      {s.quote && (
                        <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mb-space-md italic">&ldquo;{s.quote}&rdquo;</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mb-space-md">
                        {s.tags.slice(0, 2).map((t) => (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm" key={t.id}>
                            {t.icon && <span className="material-symbols-outlined text-sm">{t.icon}</span>}
                            {t.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="pt-space-sm flex items-center justify-between">
                      <div>
                        {svc && (
                          <>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">{PRICE_LABELS[svc.type as ServiceType]}</span>
                            <span className="font-headline-sm text-headline-sm text-primary block leading-none">{formatMoney(svc.priceCents)}</span>
                          </>
                        )}
                      </div>
                      <Link
                        className="px-space-md py-2.5 rounded-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-label-lg text-label-lg transition-all shadow-sm"
                        href={`/sitters/${s.slug}`}
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="w-full py-space-xl bg-background relative overflow-hidden scroll-mt-20" id="how-it-works">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
            <div className="text-center max-w-2xl mx-auto mb-space-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm uppercase tracking-wider mb-2">
                Peace of Mind in 3 Easy Steps
              </span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">How It Works</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                Choosing the right sitter for your furry family member has never been this easy, transparent and safe.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg relative">
              <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-1 bg-surface-container-highest -translate-y-8 z-0" />
              <div className="relative z-10 bg-surface-container-lowest rounded-3xl p-space-lg flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-display-lg text-2xl font-bold mb-space-md shadow-md relative">
                  1<span className="absolute -top-2 -right-2 text-lg">🔍</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Browse Local Sitters</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Filter sitters near you by reviews, experience badges, home photos and calendar availability.
                </p>
                <div className="mt-space-md p-space-xs rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm px-3">✓ Free to Message</div>
              </div>
              <div className="relative z-10 bg-surface-container-lowest rounded-3xl p-space-lg flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-2xl bg-secondary text-on-secondary flex items-center justify-center font-display-lg text-2xl font-bold mb-space-md shadow-md relative">
                  2<span className="absolute -top-2 -right-2 text-lg">🤝</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Book a Meet & Greet</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Before you book, meet your sitter at the park or at home for a free{" "}
                  <span className="font-semibold text-secondary">&quot;Meet & Greet&quot;</span> and see the chemistry for
                  yourself.
                </p>
                <div className="mt-space-md p-space-xs rounded-full bg-surface-container-low text-secondary font-label-sm text-label-sm px-3">
                  ✓ 100% Free First Meeting
                </div>
              </div>
              <div className="relative z-10 bg-surface-container-lowest rounded-3xl p-space-lg flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-2xl bg-tertiary text-on-tertiary flex items-center justify-center font-display-lg text-2xl font-bold mb-space-md shadow-md relative">
                  3<span className="absolute -top-2 -right-2 text-lg">📸</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Relax with Live Updates</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Adorable photos all day long, GPS walk maps and meal reports let you follow every happy moment as it happens.
                </p>
                <div className="mt-space-md p-space-xs rounded-full bg-surface-container-low text-tertiary font-label-sm text-label-sm px-3">
                  ✓ Daily Live Notifications
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WAGSHIELD TRUST BAR */}
        <section className="w-full py-space-xl bg-surface-container" id="wagshield">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
            <div className="bg-surface-container-lowest rounded-3xl p-space-lg lg:p-space-xl shadow-md">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
                <div className="lg:col-span-5 flex flex-col gap-space-sm">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider w-fit">
                    🛡️ Protection, No Strings Attached
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Everything&apos;s Covered with WagShield Protection</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    To us, every pet is family. That&apos;s why every booking on our platform is automatically protected by our
                    highest safety standards.
                  </p>
                  <div className="pt-2">
                    <Link className="inline-flex items-center gap-2 font-label-lg text-label-lg text-primary hover:text-primary-container transition-colors" href="/#how-it-works">
                      <span>Learn More About Our Safety Standards</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">health_and_safety</span>
                    </div>
                    <h4 className="font-title-md text-title-md text-on-surface">Free Vet Care Coverage</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      If something unexpected happens during a booking, we cover up to $5,000 in vet treatment costs.
                    </p>
                  </div>
                  <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-2">
                    <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">ring_volume</span>
                    </div>
                    <h4 className="font-title-md text-title-md text-on-surface">24/7 Emergency Vet Line</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      You or your sitter can reach our emergency vet video line with a single tap, any time of day or night.
                    </p>
                  </div>
                  <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-2">
                    <div className="w-10 h-10 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">badge</span>
                    </div>
                    <h4 className="font-title-md text-title-md text-on-surface">Rigorous Sitter Vetting</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Only 2 in 10 applicants are accepted, after ID verification, a home check and a Police Vulnerable Sector Check.
                    </p>
                  </div>
                  <div className="p-space-md rounded-2xl bg-surface-container-low flex flex-col gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">lock</span>
                    </div>
                    <h4 className="font-title-md text-title-md text-on-surface">Secure Hold Payments</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Your payment is held securely and only released to the sitter once the stay is complete and you confirm.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="w-full py-space-xl bg-background">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
            <div className="text-center max-w-2xl mx-auto mb-space-xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-secondary font-label-sm text-label-sm uppercase tracking-wider mb-2">
                Real Reviews, Happy Pets
              </span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">What Pet Parents Are Saying</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">
                Just a few of the thousands of families who enjoy the deep peace of mind that comes from knowing their pet is safe.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg">
              {testimonials.map((t) => (
                <div className="bg-surface-container-low rounded-3xl p-space-lg flex flex-col justify-between shadow-sm" key={t.id}>
                  <div>
                    <div aria-label={`${t.rating} out of 5 stars`} className="flex items-center gap-1 text-secondary mb-space-sm" role="img">
                      <Stars count={t.rating} />
                    </div>
                    <p className="font-body-md text-body-md text-on-surface leading-relaxed mb-space-md italic">&ldquo;{t.body}&rdquo;</p>
                  </div>
                  <div className="flex items-center gap-space-sm pt-space-sm">
                    {t.authorAvatar ? (
                      <img alt={t.authorName} className="w-12 h-12 rounded-full object-cover shadow-sm bg-surface-container-high" src={t.authorAvatar} />
                    ) : (
                      <span className="w-12 h-12 rounded-full shadow-sm bg-primary-container text-on-primary font-title-md text-title-md flex items-center justify-center">
                        {t.authorName.charAt(0)}
                      </span>
                    )}
                    <div>
                      <div className="font-title-md text-title-md text-on-surface leading-snug">{t.authorName}</div>
                      {t.petLabel && <div className="font-body-sm text-body-sm text-on-surface-variant">{t.petLabel}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BECOME A SITTER CTA */}
        <section className="w-full py-space-xl bg-background">
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
            <div className="relative bg-gradient-to-r from-primary to-primary-container rounded-3xl p-space-lg lg:p-space-xl overflow-hidden shadow-xl text-on-primary">
              <div className="absolute -right-10 -bottom-10 opacity-10 text-on-primary pointer-events-none">
                <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C10.5 2 9.2 3.1 9 4.6C8.8 6.1 9.8 7.5 11.3 7.8C12.8 8.1 14.2 7.1 14.5 5.6C14.7 4.1 13.7 2.7 12 2ZM5.5 6C4.1 6 3 7.1 3 8.5C3 9.9 4.1 11 5.5 11C6.9 11 8 9.9 8 8.5C8 7.1 6.9 6 5.5 6ZM18.5 6C17.1 6 16 7.1 16 8.5C16 9.9 17.1 11 18.5 11C19.9 11 21 9.9 21 8.5C21 7.1 19.9 6 18.5 6ZM8.5 13C6 13 4 15 4 17.5C4 20 6.5 22 12 22C17.5 22 20 20 20 17.5C20 15 18 13 15.5 13C14 13 13 13.8 12 14.5C11 13.8 10 13 8.5 13Z" />
                </svg>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center relative z-10">
                <div className="lg:col-span-8 flex flex-col gap-space-md">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-on-primary/10 text-on-primary font-label-sm text-label-sm uppercase tracking-wider w-fit">
                    🐶 Join the WagStays Pack
                  </span>
                  <h2 className="font-display-lg text-[2rem] sm:text-display-lg text-on-primary leading-tight break-words">
                    Do You Love Animals as Much as We Do?
                    <br />
                    <span className="text-primary-fixed">Earn Extra Income as a Sitter in Your Neighbourhood!</span>
                  </h2>
                  <p className="font-body-lg text-body-lg text-on-primary/90 max-w-2xl leading-relaxed">
                    Set your own hours, choose the pets you welcome and name your own rates. Spend your days with adorable pets
                    and earn{" "}
                    <span className="font-bold underline decoration-primary-fixed">$1,500 – $3,500</span> a month.
                  </p>
                  <div className="flex flex-wrap items-center gap-space-md pt-2">
                    <Link
                      className="px-space-xl py-4 rounded-full bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container font-label-lg text-label-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                      href="/become-a-sitter"
                    >
                      <span className="material-symbols-outlined text-xl">pets</span>
                      <span>Become a Sitter 🐾</span>
                    </Link>
                    <Link
                      className="px-space-lg py-4 rounded-full bg-on-primary/10 hover:bg-on-primary/20 text-on-primary font-label-lg text-label-lg transition-all flex items-center gap-2"
                      href="/become-a-sitter"
                    >
                      <span className="material-symbols-outlined text-xl">play_circle</span>
                      <span>How to Become a Sitter (2-Min Video)</span>
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-4 flex justify-center">
                  <div className="relative w-64 h-64 lg:w-72 lg:h-72 rounded-3xl overflow-hidden shadow-2xl bg-surface-container">
                    <img alt="A happy pet sitter sitting on the grass with three playful dogs" className="w-full h-full object-cover" src="/images/img-13.jpg" />
                    <div className="absolute bottom-3 left-3 right-3 bg-surface-container-lowest/90 backdrop-blur-md p-space-sm rounded-xl text-on-surface text-center">
                      <span className="font-headline-sm text-headline-sm text-primary block">Avg. $2,450</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Monthly earnings of active sitters</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
