import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/routing";
import { JsonLd } from "@/components/JsonLd";
import { addDays, todayIn } from "@/lib/availability-core";
import { formatMoney } from "@/lib/format";
import { holidaysForDates, holidaysForYear } from "@/lib/holidays";
import { holidayDateLabel, priceLineLabel } from "@/lib/price-details";
import { priceBooking, type Fees } from "@/lib/pricing";
import { DEFAULT_CITY_SLUG, getActiveCity } from "@/lib/queries";
import { quoteBooking, type QuoteService, type QuotePet } from "@/lib/quote";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { localeAlternates } from "@/lib/seo/site";
import { getFees, getPlatformSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("pricing.meta"), getLocale()]);
  return { title: t("title"), description: t("description"), alternates: localeAlternates("/pricing", locale) };
}

// Example rates (a typical Toronto sitter). Every total on this page is computed with the same
// quoteBooking() + priceBooking() the checkout and the booking server action use.
const WALK: QuoteService = { type: "DOG_WALKING", priceCents: 3200, maxPetsPerBooking: 2, additionalPetPriceCents: 1200 };
const BOARD: QuoteService = { type: "BOARDING", priceCents: 7000, maxPetsPerBooking: 2, additionalPetPriceCents: 2500, holidayPriceCents: 8500, puppyPriceCents: 800 };

type Example = { title: string; note: string; service: QuoteService; pets: QuotePet[]; dates: string[] };

async function Receipt({ ex, fees, taxRateBps }: { ex: Example; fees: Fees; taxRateBps: number }) {
  const [t, locale] = await Promise.all([getTranslations("pricing.receipt"), getLocale()]);
  const money = (cents: number) => formatMoney(cents, { exact: true, locale });
  const q = quoteBooking({ service: ex.service, pets: ex.pets, dates: ex.dates, holidays: holidaysForDates(ex.dates, "ON") });
  const p = priceBooking({ subtotalCents: q.subtotalCents, taxRateBps, fees });
  const row = "flex items-start justify-between gap-space-sm font-body-sm text-body-sm";
  return (
    <figure className="bg-surface-container-low rounded-2xl p-space-md flex flex-col gap-space-xs min-w-0" data-testid="pricing-example">
      <figcaption className="flex flex-col">
        <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">{t("example")}</span>
        <span className="font-title-md text-title-md text-on-surface font-bold">{ex.title}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">{ex.note}</span>
      </figcaption>
      <div className="h-px bg-outline-variant/40 my-1" />
      {q.lines.map((l, i) => (
        <div className={`${row} text-on-surface-variant`} key={`${l.label}-${i}`}>
          <span className="min-w-0">{priceLineLabel(l, i, locale)}</span>
          <span className="font-semibold text-on-surface whitespace-nowrap">{money(l.amountCents)}</span>
        </div>
      ))}
      <div className={`${row} text-on-surface-variant`}>
        <span>{t("wagShield")}</span>
        <span className="font-semibold text-on-surface">{money(p.protectionFeeCents)}</span>
      </div>
      <div className={`${row} text-on-surface-variant`}>
        <span>{t("serviceFee")}</span>
        <span className="font-semibold text-on-surface">{money(p.serviceFeeCents)}</span>
      </div>
      <div className={`${row} text-on-surface-variant`}>
        <span>{t("hst", { rate: taxRateBps / 100 })}</span>
        <span className="font-semibold text-on-surface">{money(p.taxCents)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-space-sm pt-space-xs mt-1 border-t border-outline-variant/40">
        <span className="font-label-lg text-label-lg text-on-surface font-bold">{t("total")}</span>
        <span className="font-headline-sm text-headline-sm text-secondary font-extrabold">{money(p.totalCents)}</span>
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
  const [fees, settings, city, t, locale] = await Promise.all([
    getFees(),
    getPlatformSettings(),
    getActiveCity(DEFAULT_CITY_SLUG).catch(() => null),
    getTranslations("pricing"),
    getLocale(),
  ]);
  const fmt = (cents: number) => formatMoney(cents, { locale });
  const exact = (cents: number) => formatMoney(cents, { exact: true, locale });
  const b = (c: React.ReactNode) => <strong className="text-on-surface">{c}</strong>;
  const taxRateBps = city?.taxRateBps ?? 1300;
  const taxPct = taxRateBps / 100;
  const earnPct = settings.pointsEarnRateBps / 100;
  const nowMs = new Date().getTime();
  const today = todayIn(city?.timeZone ?? "America/Toronto", nowMs);
  const year = Number(today.slice(0, 4));
  const holidays = Object.entries(holidaysForYear(year, "ON", locale)).sort(([a], [b]) => a.localeCompare(b));
  // the next Christmas Eve still ahead: nights of Dec 24, 25 and 26 (check-out Dec 27)
  const xmasYear = today > `${year}-12-24` ? year + 1 : year;
  const xmas = [`${xmasYear}-12-24`, `${xmasYear}-12-25`, `${xmasYear}-12-26`];
  const monday = (() => {
    let d = addDays(today, 1);
    while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = addDays(d, 1);
    return d;
  })();

  const examples: Record<string, Example> = {
    oneWalk: { title: t("examples.oneWalk.title"), note: t("examples.oneWalk.note", { price: fmt(WALK.priceCents) }), service: WALK, pets: [{ name: "Maple" }], dates: [monday] },
    twoDogs: {
      title: t("examples.twoDogs.title"),
      note: t("examples.twoDogs.note", { price: fmt(WALK.priceCents), extra: fmt(WALK.additionalPetPriceCents!) }),
      service: WALK,
      pets: [{ name: "Maple" }, { name: "Biscuit" }],
      dates: [monday],
    },
    christmas: {
      title: t("examples.christmas.title"),
      note: t("examples.christmas.note", {
        price: fmt(BOARD.priceCents),
        holiday: fmt(BOARD.holidayPriceCents!),
        extra: fmt(BOARD.additionalPetPriceCents!),
        year: String(xmasYear),
      }),
      service: BOARD,
      pets: [{ name: "Maple" }, { name: "Biscuit" }],
      dates: xmas,
    },
    puppy: {
      title: t("examples.puppy.title"),
      note: t("examples.puppy.note", { surcharge: fmt(BOARD.puppyPriceCents!), price: fmt(BOARD.priceCents) }),
      service: BOARD,
      pets: [{ name: "Biscuit", ageYears: 0.5 }],
      dates: [addDays(monday, 3), addDays(monday, 4)],
    },
  };
  const oneWalk = priceBooking({ subtotalCents: WALK.priceCents, taxRateBps, fees });

  const faqs = (["charged", "percent", "secondPet", "holidays", "puppy", "weekly", "cancel", "earns"] as const).map((k) => ({
    q: t(`faq.${k}Q`),
    a: k === "percent" ? t("faq.percentA", { fee: exact(fees.serviceFeeCents), cover: exact(fees.wagShieldFeeCents) }) : t(`faq.${k}A`),
  }));

  const nav = [
    ["what-you-pay", t("nav.whatYouPay")],
    ["extra-pets", t("nav.extraPets")],
    ["holidays", t("nav.holidays")],
    ["puppies", t("nav.puppies")],
    ["weekly", t("nav.weekly")],
    ["capacity", t("nav.capacity")],
    ["cancellations", t("nav.cancellations")],
    ["wagpoints", t("nav.wagpoints")],
    ["faq", t("nav.faq")],
  ];
  const prefix = localePrefix(locale);

  return (
    <main className="w-full pt-20 bg-background">
      <JsonLd data={[breadcrumbSchema([
          { name: t("breadcrumbs.home"), path: prefix || "/" },
          { name: t("breadcrumbs.pricing"), path: `${prefix}/pricing` },
        ]), faqSchema(faqs)]} />
      <div className="w-full bg-surface-container-low">
        <div className="max-w-[960px] mx-auto px-margin-mobile md:px-margin py-space-xl flex flex-col gap-space-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest text-primary font-label-sm text-label-sm uppercase tracking-wider w-fit">
            <span className="material-symbols-outlined text-sm">sell</span>
            {t("hero.eyebrow")}
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">{t("hero.title")}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            {t("hero.intro")}
          </p>
          <nav aria-label={t("hero.navLabel")} className="flex flex-wrap gap-space-xs pt-space-xs">
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
        <Section icon="receipt_long" id="what-you-pay" title={t("whatYouPay.title")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            {[
              { icon: "payments", t: t("whatYouPay.sitterPrice"), d: t("whatYouPay.sitterPriceText") },
              { icon: "health_and_safety", t: t("whatYouPay.wagShield", { amount: exact(fees.wagShieldFeeCents) }), d: t("whatYouPay.wagShieldText", { amount: fmt(fees.vetCoverageCents) }) },
              { icon: "storefront", t: t("whatYouPay.serviceFee", { amount: exact(fees.serviceFeeCents) }), d: t("whatYouPay.serviceFeeText") },
              { icon: "account_balance", t: t("whatYouPay.hst", { rate: taxPct }), d: t("whatYouPay.hstText") },
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
            {t.rich("whatYouPay.summary", { price: fmt(WALK.priceCents), total: exact(oneWalk.totalCents), b })}
          </p>
          <Receipt ex={examples.oneWalk} fees={fees} taxRateBps={taxRateBps} />
        </Section>

        <Section icon="pets" id="extra-pets" title={t("extraPets.title")}>
          <p className={P}>
            {t.rich("extraPets.text", { extra: fmt(WALK.additionalPetPriceCents!), b, em: (c) => <em>{c}</em> })}
          </p>
          <Receipt ex={examples.twoDogs} fees={fees} taxRateBps={taxRateBps} />
          <p className={P}>
            {t.rich("extraPets.together", {
              total: exact(oneWalk.totalCents * 2),
              b,
              link: (c) => (
                <Link className="text-primary font-semibold hover:underline" href="/sitters?petCount=2">
                  {c}
                </Link>
              ),
            })}
          </p>
        </Section>

        <Section icon="celebration" id="holidays" title={t("holidays.title")}>
          <p className={P}>
            {t.rich("holidays.text", { b })}
          </p>
          <Receipt ex={examples.christmas} fees={fees} taxRateBps={taxRateBps} />
          <div className="flex flex-col gap-space-xs">
            <h3 className="font-title-md text-title-md text-on-surface font-bold">{t("holidays.listTitle", { year: String(year) })}</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-lg gap-y-1" data-testid="pricing-holidays">
              {holidays.map(([date, name]) => (
                <li className={`flex justify-between gap-space-sm font-body-sm text-body-sm py-1 border-b border-outline-variant/30 ${date < today ? "text-outline" : "text-on-surface"}`} key={date}>
                  <span className="font-medium">{name}</span>
                  <span className={date < today ? "" : "text-on-surface-variant"}>{holidayDateLabel(date, locale)}</span>
                </li>
              ))}
            </ul>
            <p className="font-body-sm text-body-sm text-outline">{t("holidays.observed")}</p>
          </div>
        </Section>

        <Section icon="child_care" id="puppies" title={t("puppies.title")}>
          <p className={P}>
            {t("puppies.text")}
          </p>
          <Receipt ex={examples.puppy} fees={fees} taxRateBps={taxRateBps} />
        </Section>

        <Section icon="repeat" id="weekly" title={t("weekly.title")}>
          <p className={P}>
            {t("weekly.text")}
          </p>
        </Section>

        <Section icon="groups" id="capacity" title={t("capacity.title")}>
          <ul className="flex flex-col gap-space-xs">
            <li className="flex items-start gap-space-sm font-body-md text-body-md text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-xl">directions_walk</span>
              <span>{t.rich("capacity.walks", { b })}</span>
            </li>
            <li className="flex items-start gap-space-sm font-body-md text-body-md text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-xl">night_shelter</span>
              <span>{t.rich("capacity.boarding", { b })}</span>
            </li>
          </ul>
        </Section>

        <Section icon="event_available" id="cancellations" title={t("cancellations.title")}>
          <ul className="flex flex-col gap-space-xs">
            {[
              t("cancellations.charged"),
              t("cancellations.refund"),
              t("cancellations.declined"),
              t("cancellations.guarantee"),
            ].map((item) => (
              <li className="flex items-start gap-space-sm font-body-md text-body-md text-on-surface-variant" key={item}>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon="toll" id="wagpoints" title={t("wagpoints.title")}>
          <p className={P}>
            {t.rich("wagpoints.text", {
              pct: earnPct,
              price: fmt(WALK.priceCents),
              earn: exact(Math.round((WALK.priceCents * settings.pointsEarnRateBps) / 10000)),
              max: fmt(fees.wagPointsDiscountCents),
              b,
              link: (c) => (
                <Link className="text-primary font-semibold hover:underline" href="/account/wagpoints">
                  {c}
                </Link>
              ),
            })}
          </p>
        </Section>

        <Section icon="quiz" id="faq" title={t("faq.title")}>
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
            <h2 className="font-title-md text-title-md text-on-surface font-bold">{t("cta.title")}</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{t("cta.text")}</p>
          </div>
          <Link className="px-space-lg h-12 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center gap-space-xs shadow-sm hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="/sitters">
            {t("cta.button")}
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
