import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/routing";
import { JsonLd } from "@/components/JsonLd";
import { SERVICE_SLUGS } from "@/lib/constants";
import { formatMoney, formatRating } from "@/lib/format";
import { landingFaqs, landingIntro, landingNoun, landingPath, landingTitle, priceLabel, priceText, type Landing } from "@/lib/seo/landing";
import { breadcrumbSchema, faqSchema, sitterListSchema } from "@/lib/seo/schema";
import { SitterResultCard } from "../../sitters/_components/SitterResultCard";

const PRICE_ICON: Record<string, string> = { DOG_WALKING: "directions_walk", BOARDING: "cottage", DROP_IN: "door_front", DAY_CARE: "sunny" };

export async function LandingView({ landing: l, vetCoverageCents }: { landing: Landing; vetCoverageCents: number }) {
  const [t, locale] = await Promise.all([getTranslations("landing.view"), getLocale()]);
  const noun = landingNoun(l, locale);
  const title = landingTitle(l, locale);
  const faqs = landingFaqs(l, vetCoverageCents, locale);
  const place = l.hood?.name ?? l.city.name;
  const search = new URLSearchParams({ city: l.city.slug });
  if (l.hood) search.set("hood", l.hood.slug);
  if (l.service) search.set("service", SERVICE_SLUGS[l.service]);
  const searchHref = `/sitters?${search.toString()}`;

  const crumbs = [
    { name: t("home"), path: "/" },
    { name: t("citySitters", { city: l.city.name }), path: `/pet-sitters/${l.city.slug}` },
    ...(l.hood && l.service === "DOG_WALKING" ? [{ name: t("hoodSitters", { hood: l.hood.name }), path: `/pet-sitters/${l.city.slug}/${l.hood.slug}` }] : []),
    ...(l.hood ? [{ name: t("hoodNoun", { hood: l.hood.name, nounTitle: noun.title }), path: landingPath(l) }] : []),
  ];
  // JSON-LD needs absolute URLs in this page's language
  const prefix = localePrefix(locale);
  const schemaCrumbs = crumbs.map((c) => ({ ...c, path: prefix ? `${prefix}${c.path === "/" ? "" : c.path}` : c.path }));

  const siblingTitle = l.hood ? t("siblingsNearby", { nounTitle: noun.title }) : t("siblingsByHood", { nounTitle: noun.title });
  const otherKind = l.hood
    ? l.service === "DOG_WALKING"
      ? { href: `/pet-sitters/${l.city.slug}/${l.hood.slug}`, label: t("allSittersIn", { hood: l.hood.name }) }
      : { href: `/dog-walkers/${l.city.slug}/${l.hood.slug}`, label: t("walkersIn", { hood: l.hood.name }) }
    : null;

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <JsonLd data={breadcrumbSchema(schemaCrumbs)} />
      <JsonLd data={sitterListSchema(title, l.cards)} />
      <JsonLd data={faqSchema(faqs)} />

      {/* Hero */}
      <section className="w-full bg-gradient-to-b from-surface-container via-surface to-background">
        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin pt-space-lg pb-space-xl flex flex-col gap-space-md">
          <nav aria-label={t("breadcrumb")} className="flex flex-wrap items-center gap-space-xs font-label-md text-label-md text-on-surface-variant">
            {crumbs.map((c, i) => (
              <span className="flex items-center gap-space-xs" key={c.path}>
                {i > 0 && <span aria-hidden>/</span>}
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="text-on-surface">
                    {c.name}
                  </span>
                ) : (
                  <Link className="hover:text-primary transition-colors" href={c.path}>
                    {c.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg lg:items-end">
            <div className="lg:col-span-8 flex flex-col gap-space-md">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-display-lg-mobile md:text-display-lg-mobile font-extrabold text-on-surface tracking-tight">
                {title}
              </h1>
              {landingIntro(l, locale).map((p) => (
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl leading-relaxed" key={p}>
                  {p}
                </p>
              ))}
              <div className="flex flex-wrap gap-space-sm">
                {l.servingCount > 0 && (
                  <Stat icon="pets" label={t(l.hood ? "statServingNearby" : "statServing", { count: l.servingCount, one: noun.one, many: noun.many })} />
                )}
                {l.avgRating !== null && <Stat icon="star" label={t("statRating", { rating: formatRating(l.avgRating, locale) })} />}
                {l.prices[0] && (
                  <Stat icon="payments" label={t("statFrom", { price: formatMoney(l.prices[0].min, { locale }), unit: priceLabel(l.prices[0], locale).unit })} />
                )}
                <Stat icon="health_and_safety" label={t("statVet", { amount: formatMoney(vetCoverageCents, { locale }) })} />
              </div>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-space-sm">
              <Link
                className="h-12 px-space-lg rounded-full bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container font-label-lg text-label-lg transition-all flex items-center justify-center gap-space-xs shadow-sm"
                href={searchHref}
              >
                <span className="material-symbols-outlined text-lg">search</span>
                {t("searchIn", { many: noun.many, place })}
              </Link>
              {otherKind && (
                <Link
                  className="h-12 px-space-lg rounded-full bg-surface-container-lowest text-primary hover:bg-primary-container hover:text-on-primary-container font-label-lg text-label-lg transition-all flex items-center justify-center gap-space-xs shadow-sm"
                  href={otherKind.href}
                >
                  {otherKind.label}
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex flex-col gap-space-xl pb-space-xl">
        {/* Top sitters */}
        <section aria-labelledby="top-sitters" className="flex flex-col gap-space-md">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold" id="top-sitters">
              {t(l.hood ? "topNear" : "topIn", { many: noun.many, place })}
            </h2>
            <Link className="font-label-lg text-label-lg text-primary hover:underline flex items-center gap-1" href={searchHref}>
              {t("seeAll")}
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>
          {l.cards.length ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg">
              {l.cards.map((s) => (
                <SitterResultCard key={s.id} sitter={s} />
              ))}
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm text-on-surface-variant font-body-md text-body-md">
              {t.rich("empty", {
                many: noun.many,
                place,
                link: (c) => (
                  <Link className="text-primary font-semibold hover:underline" href="/become-a-sitter">
                    {c}
                  </Link>
                ),
              })}
            </div>
          )}
        </section>

        {/* Prices */}
        {l.prices.length > 0 && (
          <section aria-labelledby="prices" className="flex flex-col gap-space-md">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold" id="prices">
              {t("pricesTitle", { many: noun.many, place })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {l.prices.map((p) => (
                <div className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-sm flex flex-col gap-space-xs" key={p.type}>
                  <span className="w-11 h-11 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">{PRICE_ICON[p.type]}</span>
                  </span>
                  <span className={`font-title-md text-title-md text-on-surface ${locale === "fr" ? "first-letter:uppercase" : "capitalize"}`}>{priceLabel(p, locale).label}</span>
                  <span className="font-headline-sm text-headline-sm text-primary font-bold">{priceText(p, locale)}</span>
                </div>
              ))}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{t("pricesNote")}</p>
          </section>
        )}

        {/* FAQ */}
        <section aria-labelledby="faq" className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <div className="lg:col-span-4">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold" id="faq">
              {t("faqTitle")}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
              {t("faqText", { many: noun.many, place })}
            </p>
          </div>
          <div className="lg:col-span-8 flex flex-col gap-space-sm">
            {faqs.map((f, i) => (
              <details className="group bg-surface-container-lowest rounded-2xl shadow-sm open:shadow-md transition-shadow" key={f.q} open={i === 0}>
                <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer p-space-md flex items-center justify-between gap-space-md font-title-md text-title-md text-on-surface">
                  {f.q}
                  <span className="material-symbols-outlined text-primary transition-transform group-open:rotate-180 shrink-0">expand_more</span>
                </summary>
                <p className="px-space-md pb-space-md font-body-md text-body-md text-on-surface-variant leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Sibling neighbourhoods */}
        {l.siblings.length > 0 && (
          <section aria-labelledby="hoods" className="flex flex-col gap-space-md">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold" id="hoods">
              {siblingTitle}
            </h2>
            <ul className="flex flex-wrap gap-space-sm">
              {l.siblings.map((n) => (
                <li key={n.slug}>
                  <Link
                    className="px-space-md py-2 rounded-full bg-surface-container-lowest shadow-sm text-on-surface hover:bg-primary-container hover:text-on-primary-container font-label-lg text-label-lg transition-all flex items-center gap-space-xs"
                    href={landingPath(l, n.slug)}
                  >
                    <span className="material-symbols-outlined text-base text-primary">location_on</span>
                    {n.name}
                    {n.count > 0 && <span className="text-on-surface-variant font-label-sm text-label-sm">({n.count})</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <section className="bg-primary text-on-primary rounded-3xl p-space-lg md:p-space-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
          <div>
            <h2 className="font-headline-md text-headline-md font-bold">{t("ctaTitle", { one: noun.one, place })}</h2>
            <p className="font-body-md text-body-md opacity-90 mt-space-xs">
              {t("ctaText")}
            </p>
          </div>
          <Link
            className="shrink-0 h-12 px-space-lg rounded-full bg-surface-container-lowest text-primary hover:bg-secondary hover:text-on-secondary font-label-lg text-label-lg transition-all flex items-center gap-space-xs shadow-sm"
            href={searchHref}
          >
            {t("ctaSearch", { many: noun.many })}
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </Link>
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="px-space-md py-1.5 rounded-full bg-surface-container-lowest shadow-sm text-on-surface font-label-md text-label-md flex items-center gap-1.5">
      <span className="material-symbols-outlined text-base text-primary">{icon}</span>
      {label}
    </span>
  );
}
