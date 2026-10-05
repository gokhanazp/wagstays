import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/JsonLd";
import { addDays, todayIn } from "@/lib/availability-core";
import { formatMoney } from "@/lib/format";
import { holidaysForDates, holidaysForYear } from "@/lib/holidays";
import { holidayDateLabel } from "@/lib/price-details";
import { priceBooking, type Fees } from "@/lib/pricing";
import { DEFAULT_CITY_SLUG, getActiveCity } from "@/lib/queries";
import { quoteBooking, type QuoteService, type QuotePet } from "@/lib/quote";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { getFees, getPlatformSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "How Pricing Works",
  description:
    "What you pay on WagStays: the sitter's own rate, extra pets, statutory holiday rates and puppy surcharges, plus a flat fee, WagShield vet cover and HST. Worked examples and FAQ.",
  alternates: { canonical: "/pricing" },
};

// Example rates (a typical Toronto sitter). Every total on this page is computed with the same
// quoteBooking() + priceBooking() the checkout and the booking server action use.
const WALK: QuoteService = { type: "DOG_WALKING", priceCents: 3200, maxPetsPerBooking: 2, additionalPetPriceCents: 1200 };
const BOARD: QuoteService = { type: "BOARDING", priceCents: 7000, maxPetsPerBooking: 2, additionalPetPriceCents: 2500, holidayPriceCents: 8500, puppyPriceCents: 800 };

type Example = { title: string; note: string; service: QuoteService; pets: QuotePet[]; dates: string[] };

function Receipt({ ex, fees, taxRateBps }: { ex: Example; fees: Fees; taxRateBps: number }) {
  const q = quoteBooking({ service: ex.service, pets: ex.pets, dates: ex.dates, holidays: holidaysForDates(ex.dates, "ON") });
  const p = priceBooking({ subtotalCents: q.subtotalCents, taxRateBps, fees });
  const row = "flex items-start justify-between gap-space-sm font-body-sm text-body-sm";
  return (
    <figure className="bg-surface-container-low rounded-2xl p-space-md flex flex-col gap-space-xs min-w-0" data-testid="pricing-example">
      <figcaption className="flex flex-col">
        <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Example</span>
        <span className="font-title-md text-title-md text-on-surface font-bold">{ex.title}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">{ex.note}</span>
      </figcaption>
      <div className="h-px bg-outline-variant/40 my-1" />
      {q.lines.map((l, i) => (
        <div className={`${row} text-on-surface-variant`} key={`${l.label}-${i}`}>
          <span className="min-w-0">{l.label}</span>
          <span className="font-semibold text-on-surface whitespace-nowrap">{formatMoney(l.amountCents, { exact: true })}</span>
        </div>
      ))}
      <div className={`${row} text-on-surface-variant`}>
        <span>WagShield vet cover</span>
        <span className="font-semibold text-on-surface">{formatMoney(p.protectionFeeCents, { exact: true })}</span>
      </div>
      <div className={`${row} text-on-surface-variant`}>
        <span>Service fee</span>
        <span className="font-semibold text-on-surface">{formatMoney(p.serviceFeeCents, { exact: true })}</span>
      </div>
      <div className={`${row} text-on-surface-variant`}>
        <span>HST ({taxRateBps / 100}%)</span>
        <span className="font-semibold text-on-surface">{formatMoney(p.taxCents, { exact: true })}</span>
      </div>
      <div className="flex items-baseline justify-between gap-space-sm pt-space-xs mt-1 border-t border-outline-variant/40">
        <span className="font-label-lg text-label-lg text-on-surface font-bold">Total</span>
        <span className="font-headline-sm text-headline-sm text-secondary font-extrabold">{formatMoney(p.totalCents, { exact: true })}</span>
      </div>
    </figure>
  );
}

function Section({ id, icon, title, children }: { id: string; icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-3xl shadow-sm p-space-lg md:p-space-xl flex flex-col gap-space-md scroll-mt-24" id={id}>
      <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-sm">
        <span className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const P = "font-body-md text-body-md text-on-surface-variant";

export default async function PricingPage() {
  const [fees, settings, city] = await Promise.all([getFees(), getPlatformSettings(), getActiveCity(DEFAULT_CITY_SLUG).catch(() => null)]);
  const taxRateBps = city?.taxRateBps ?? 1300;
  const taxPct = taxRateBps / 100;
  const earnPct = settings.pointsEarnRateBps / 100;
  const nowMs = new Date().getTime();
  const today = todayIn(city?.timeZone ?? "America/Toronto", nowMs);
  const year = Number(today.slice(0, 4));
  const holidays = Object.entries(holidaysForYear(year, "ON")).sort(([a], [b]) => a.localeCompare(b));
  // the next Christmas Eve still ahead: nights of Dec 24, 25 and 26 (check-out Dec 27)
  const xmasYear = today > `${year}-12-24` ? year + 1 : year;
  const xmas = [`${xmasYear}-12-24`, `${xmasYear}-12-25`, `${xmasYear}-12-26`];
  const monday = (() => {
    let d = addDays(today, 1);
    while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = addDays(d, 1);
    return d;
  })();

  const examples: Record<string, Example> = {
    oneWalk: { title: "1 dog, one 60-minute walk", note: `Sitter's rate ${formatMoney(WALK.priceCents)} per walk.`, service: WALK, pets: [{ name: "Maple" }], dates: [monday] },
    twoDogs: {
      title: "2 dogs on the same walk",
      note: `${formatMoney(WALK.priceCents)} per walk, +${formatMoney(WALK.additionalPetPriceCents!)} for the second dog.`,
      service: WALK,
      pets: [{ name: "Maple" }, { name: "Biscuit" }],
      dates: [monday],
    },
    christmas: {
      title: "2 dogs, 3 nights over Christmas",
      note: `Boarding at ${formatMoney(BOARD.priceCents)} a night, ${formatMoney(BOARD.holidayPriceCents!)} on statutory holidays, +${formatMoney(BOARD.additionalPetPriceCents!)} per extra pet per night. Check-in Dec 24, check-out Dec 27, ${xmasYear}.`,
      service: BOARD,
      pets: [{ name: "Maple" }, { name: "Biscuit" }],
      dates: xmas,
    },
    puppy: {
      title: "1 puppy, 2 nights of boarding",
      note: `Biscuit is 6 months old: +${formatMoney(BOARD.puppyPriceCents!)} per night on top of ${formatMoney(BOARD.priceCents)}.`,
      service: BOARD,
      pets: [{ name: "Biscuit", ageYears: 0.5 }],
      dates: [addDays(monday, 3), addDays(monday, 4)],
    },
  };
  const oneWalk = priceBooking({ subtotalCents: WALK.priceCents, taxRateBps, fees });

  const faqs = [
    {
      q: "When am I charged?",
      a: "Only when the sitter accepts your request. Sending a booking request is free, and so is a Meet & Greet before you book.",
    },
    {
      q: "Is the service fee a percentage of my booking?",
      a: `No. It's a flat ${formatMoney(fees.serviceFeeCents, { exact: true })} per booking, whatever the sitter charges. WagShield vet cover is also a flat ${formatMoney(fees.wagShieldFeeCents, { exact: true })} per booking.`,
    },
    {
      q: "Why can't I add my second pet to a booking?",
      a: "Each sitter decides how many pets they take at once for each service. If a service shows “One pet per booking”, that sitter only takes one pet for it. Use “Number of pets” in search to see sitters who take more than one.",
    },
    {
      q: "Which days count as statutory holidays?",
      a: "The statutory holidays of the sitter's province. In Ontario: New Year's Day, Family Day, Good Friday, Victoria Day, Canada Day, Civic Holiday, Labour Day, Thanksgiving, Christmas Day and Boxing Day. Each sitter profile has a “Which days?” link with the next dates.",
    },
    {
      q: "How do you know my pet is a puppy?",
      a: "From the age in your pet's profile. Pets under 1 year old count as puppies. If the sitter has no puppy surcharge, nothing is added.",
    },
    {
      q: "Do fees and HST apply to every weekly visit?",
      a: "Yes. Each weekly visit or stay is its own booking, priced on its own date — so a visit that falls on a holiday can cost a little more. Your WagPoints discount comes off the first one.",
    },
    {
      q: "What if I cancel?",
      a: "Cancel in one tap for a 100% refund, no fees, up to 24 hours before your start time. Any WagPoints you used are returned to your balance automatically.",
    },
    {
      q: "Does the sitter get the whole sitter's price?",
      a: "The sitter's price (including extra pets, holiday rates and puppy surcharges) is what the sitter earns. The WagShield cover, service fee and HST are added on top for you.",
    },
  ];

  const nav = [
    ["what-you-pay", "What you pay"],
    ["extra-pets", "Extra pets"],
    ["holidays", "Holidays"],
    ["puppies", "Puppies"],
    ["weekly", "Weekly bookings"],
    ["capacity", "How many pets"],
    ["cancellations", "Cancellations"],
    ["wagpoints", "WagPoints"],
    ["faq", "FAQ"],
  ];

  return (
    <main className="w-full pt-20 bg-background">
      <JsonLd data={[breadcrumbSchema([{ name: "Home", path: "/" }, { name: "How pricing works", path: "/pricing" }]), faqSchema(faqs)]} />
      <div className="w-full bg-surface-container-low">
        <div className="max-w-[960px] mx-auto px-margin-mobile md:px-margin py-space-xl flex flex-col gap-space-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest text-primary font-label-sm text-label-sm uppercase tracking-wider w-fit">
            <span className="material-symbols-outlined text-sm">sell</span>
            Clear prices, no surprises
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">How pricing works</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            You pay the sitter&apos;s own rate, plus a flat service fee, WagShield vet cover and HST. Extra pets, statutory holidays and puppies
            can add a little — always shown before you book.
          </p>
          <nav aria-label="On this page" className="flex flex-wrap gap-space-xs pt-space-xs">
            {nav.map(([id, label]) => (
              <a
                className="px-3 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-primary-fixed hover:text-primary transition-colors"
                href={`#${id}`}
                key={id}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-margin-mobile md:px-margin py-space-lg md:py-space-xl flex flex-col gap-space-lg">
        <Section icon="receipt_long" id="what-you-pay" title="What you pay">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            {[
              { icon: "payments", t: "Sitter's price", d: "Set by the sitter, per walk, night, day or visit. It includes one pet." },
              { icon: "health_and_safety", t: `WagShield vet cover · ${formatMoney(fees.wagShieldFeeCents, { exact: true })}`, d: `Flat, per booking. Emergency vet care up to ${formatMoney(fees.vetCoverageCents)}.` },
              { icon: "storefront", t: `Service fee · ${formatMoney(fees.serviceFeeCents, { exact: true })}`, d: "Flat, per booking — never a percentage. Secure payments, verification and support." },
              { icon: "account_balance", t: `HST · ${taxPct}%`, d: "Ontario's Harmonized Sales Tax on the sitter's price and fees (after any WagPoints)." },
            ].map((x) => (
              <div className="flex items-start gap-space-sm p-space-md rounded-2xl bg-surface-container-low" key={x.icon}>
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">{x.icon}</span>
                <div className="min-w-0">
                  <div className="font-label-lg text-label-lg text-on-surface font-bold">{x.t}</div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p className={P}>
            A {formatMoney(WALK.priceCents)} walk comes to <strong className="text-on-surface">{formatMoney(oneWalk.totalCents, { exact: true })}</strong> all in. Your card
            isn&apos;t charged until the sitter accepts your request.
          </p>
          <Receipt ex={examples.oneWalk} fees={fees} taxRateBps={taxRateBps} />
        </Section>

        <Section icon="pets" id="extra-pets" title="Extra pets">
          <p className={P}>
            The sitter&apos;s price covers your first pet. Sitters who take more than one pet set a price for <strong className="text-on-surface">each extra pet</strong>{" "}
            (per walk, night, day or visit) and the most pets they take in one booking. You&apos;ll see it on every profile as{" "}
            <em>“Each extra dog +$12 per walk (up to 2 dogs)”</em> — or <em>“One pet per booking”</em> when a sitter only takes one.
          </p>
          <Receipt ex={examples.twoDogs} fees={fees} taxRateBps={taxRateBps} />
          <p className={P}>
            Booking two pets together is usually cheaper than two separate bookings — the fees are charged once. Two separate walks would be{" "}
            <strong className="text-on-surface">{formatMoney(oneWalk.totalCents * 2, { exact: true })}</strong>. Searching with{" "}
            <Link className="text-primary font-semibold hover:underline" href="/sitters?petCount=2">
              2 pets
            </Link>{" "}
            shows only sitters who take that many.
          </p>
        </Section>

        <Section icon="celebration" id="holidays" title="Statutory holiday rates">
          <p className={P}>
            Some sitters charge a holiday rate on statutory holidays. It <strong className="text-on-surface">replaces</strong> their usual price for that walk, night, day or
            visit only — the summary names each holiday and shows the difference.
          </p>
          <Receipt ex={examples.christmas} fees={fees} taxRateBps={taxRateBps} />
          <div className="flex flex-col gap-space-xs">
            <h3 className="font-title-md text-title-md text-on-surface font-bold">Ontario statutory holidays in {year}</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-lg gap-y-1" data-testid="pricing-holidays">
              {holidays.map(([date, name]) => (
                <li className={`flex justify-between gap-space-sm font-body-sm text-body-sm py-1 border-b border-outline-variant/30 ${date < today ? "text-outline" : "text-on-surface"}`} key={date}>
                  <span className="font-medium">{name}</span>
                  <span className={date < today ? "" : "text-on-surface-variant"}>{holidayDateLabel(date)}</span>
                </li>
              ))}
            </ul>
            <p className="font-body-sm text-body-sm text-outline">Holiday rates use the holiday itself, not a weekday it&apos;s observed on.</p>
          </div>
        </Section>

        <Section icon="child_care" id="puppies" title="Puppy surcharge">
          <p className={P}>
            Puppies under 1 year need more attention — extra potty breaks, chewing patrol, training. Some sitters add a small surcharge per puppy, per walk, night, day
            or visit. We use the age in your pet&apos;s profile, so keep it up to date.
          </p>
          <Receipt ex={examples.puppy} fees={fees} taxRateBps={taxRateBps} />
        </Section>

        <Section icon="repeat" id="weekly" title="Weekly recurring bookings">
          <p className={P}>
            Booking the same walk or visit every week? Each week is its own booking with its own price: the service fee, WagShield cover and HST apply to each one, and a
            week that lands on a statutory holiday uses the holiday rate. Your WagPoints discount comes off the first booking. The checkout shows the first booking and
            the total for all weeks.
          </p>
        </Section>

        <Section icon="groups" id="capacity" title="How many pets can a sitter take?">
          <ul className="flex flex-col gap-space-xs">
            <li className="flex items-start gap-space-sm font-body-md text-body-md text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-xl">directions_walk</span>
              <span>
                <strong className="text-on-surface">Walks and drop-in visits:</strong> up to the number the sitter sets per walk or visit (“up to 2 dogs”).
              </span>
            </li>
            <li className="flex items-start gap-space-sm font-body-md text-body-md text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-xl">night_shelter</span>
              <span>
                <strong className="text-on-surface">Boarding and day care:</strong> each pet also takes one of the sitter&apos;s places at home. Two pets need two free places
                on every night or day — if a date is full, the calendar tells you before you book.
              </span>
            </li>
          </ul>
        </Section>

        <Section icon="event_available" id="cancellations" title="Cancellations & refunds">
          <ul className="flex flex-col gap-space-xs">
            {[
              "Your card won't be charged until the sitter accepts your request.",
              "Cancel in one tap for a 100% refund, no fees, up to 24 hours before your start time.",
              "If the sitter declines, you aren't charged. WagPoints used on a cancelled or declined booking go back to your balance automatically.",
              "Not happy? Get a free rebooking or a full refund under our 100% Satisfaction Guarantee.",
            ].map((t) => (
              <li className="flex items-start gap-space-sm font-body-md text-body-md text-on-surface-variant" key={t}>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                {t}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon="toll" id="wagpoints" title="WagPoints">
          <p className={P}>
            You earn <strong className="text-on-surface">{earnPct}%</strong> of the sitter&apos;s price back in WagPoints when a booking is completed (a{" "}
            {formatMoney(WALK.priceCents)} walk earns {formatMoney(Math.round((WALK.priceCents * settings.pointsEarnRateBps) / 10000), { exact: true })}). At checkout, up to{" "}
            {formatMoney(fees.wagPointsDiscountCents)} of your balance comes off a booking, before HST. You can see your balance under{" "}
            <Link className="text-primary font-semibold hover:underline" href="/account/wagpoints">
              Account → WagPoints
            </Link>
            .
          </p>
        </Section>

        <Section icon="quiz" id="faq" title="Questions pet parents ask">
          <div className="flex flex-col divide-y divide-outline-variant/30">
            {faqs.map((f) => (
              <details className="group py-space-sm" key={f.q}>
                <summary className="flex items-center justify-between gap-space-sm cursor-pointer list-none font-label-lg text-label-lg text-on-surface font-bold">
                  {f.q}
                  <span className="material-symbols-outlined text-outline transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">{f.a}</p>
              </details>
            ))}
          </div>
        </Section>

        <div className="bg-primary-fixed/40 rounded-3xl p-space-lg flex flex-col sm:flex-row items-center justify-between gap-space-md text-center sm:text-left">
          <div>
            <h2 className="font-title-md text-title-md text-on-surface font-bold">Ready to find a sitter?</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Every price is on the profile — no sign-up needed to look.</p>
          </div>
          <Link className="px-space-lg h-12 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center gap-space-xs shadow-sm hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="/sitters">
            Find a sitter
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
