import { absoluteUrl, SITE_NAME, siteUrl } from "./site";

/** schema.org builders. Only real data goes in — callers pass already-filtered rows (no hidden reviews). */

type Json = Record<string, unknown>;

export function organizationSchema(opts: { email?: string; phone?: string } = {}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl()}/#organization`,
    name: SITE_NAME,
    legalName: "WagStays Technologies Inc.",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.svg"),
    areaServed: { "@type": "Country", name: "Canada" },
    ...(opts.email || opts.phone
      ? { contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: opts.email, telephone: opts.phone, areaServed: "CA", availableLanguage: "English" }] }
      : {}),
  };
}

export function websiteSchema(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl()}/#website`,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "en-CA",
    publisher: { "@id": `${siteUrl()}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      // /sitters filters by neighbourhood slug (e.g. "leslieville").
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/sitters")}?hood={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function faqSchema(faqs: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function sitterListSchema(name: string, sitters: { slug: string; displayName: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: sitters.length,
    itemListElement: sitters.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/sitters/${s.slug}`), name: s.displayName })),
  };
}

const SERVICE_NAME: Record<string, string> = { DOG_WALKING: "Dog Walking", BOARDING: "Overnight Boarding", DAY_CARE: "Doggy Day Care", DROP_IN: "Drop-In Visits" };
const UNIT_TEXT: Record<string, string> = { WALK: "walk", NIGHT: "night", DAY: "day", VISIT: "visit" };

export function sitterSchema(s: {
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  cardPhotoUrl: string | null;
  rating: number;
  reviewCount: number;
  city: { name: string; provinceCode: string };
  neighbourhood: { name: string };
  services: { id: string; type: string; priceCents: number; unit: string; durationMins: number | null; description: string | null }[];
  reviews: { authorName: string; rating: number; body: string; createdAt: Date }[];
}): Json {
  const url = absoluteUrl(`/sitters/${s.slug}`);
  const image = absoluteUrl(s.cardPhotoUrl ?? s.avatarUrl);
  const area = { "@type": "Place", name: `${s.neighbourhood.name}, ${s.city.name}` };
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#sitter`,
    name: s.displayName,
    description: s.bio,
    url,
    image,
    // City-level address only — a sitter's home address is never published.
    address: { "@type": "PostalAddress", addressLocality: s.city.name, addressRegion: s.city.provinceCode, addressCountry: "CA" },
    areaServed: area,
    currenciesAccepted: "CAD",
    founder: { "@type": "Person", name: s.displayName, jobTitle: s.headline, image },
    parentOrganization: { "@id": `${siteUrl()}/#organization` },
    ...(s.reviewCount > 0 && s.rating > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(s.rating.toFixed(2)), reviewCount: s.reviewCount, bestRating: 5, worstRating: 1 } }
      : {}),
    ...(s.reviews.length
      ? {
          review: s.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.authorName },
            datePublished: r.createdAt.toISOString().slice(0, 10),
            reviewBody: r.body,
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
          })),
        }
      : {}),
    ...(s.services.length
      ? {
          makesOffer: s.services.map((svc) => ({
            "@type": "Offer",
            url,
            price: (svc.priceCents / 100).toFixed(2),
            priceCurrency: "CAD",
            availability: "https://schema.org/InStock",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: (svc.priceCents / 100).toFixed(2),
              priceCurrency: "CAD",
              unitText: UNIT_TEXT[svc.unit] ?? svc.unit.toLowerCase(),
              valueAddedTaxIncluded: false,
            },
            itemOffered: {
              "@type": "Service",
              name: SERVICE_NAME[svc.type] ?? svc.type,
              serviceType: SERVICE_NAME[svc.type] ?? svc.type,
              ...(svc.description ? { description: svc.description } : {}),
              areaServed: area,
              provider: { "@id": `${url}#sitter` },
            },
          })),
        }
      : {}),
  };
}
