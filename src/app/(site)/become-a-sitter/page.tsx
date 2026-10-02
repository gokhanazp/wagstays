import type { Metadata } from "next";
import { getFees } from "@/lib/settings";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getActiveCities, getActiveCity } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { ApplicationForm } from "./_components/ApplicationForm";
import { EarningsEstimator, FaqAccordion } from "./_components/SidebarWidgets";

export const metadata: Metadata = {
  title: "Become a Sitter",
  description: "Join WagStays' verified sitter network. Set your own hours, pets and rates — and earn up to $3,500 a month.",
};

const FILL = { fontVariationSettings: "'FILL' 1" };

export default async function BecomeASitterPage() {
  const { vetCoverageCents } = await getFees();
  const [user, city, cities] = await Promise.all([getCurrentUser(), getActiveCity(), getActiveCities()]);
  const coverage = formatMoney(vetCoverageCents);

  const trustChips = [
    { icon: "verified", color: "text-primary", label: "100% Free" },
    { icon: "health_and_safety", color: "text-secondary", label: `${coverage} Coverage` },
    { icon: "payments", color: "text-primary", label: "Weekly Payouts" },
    { icon: "headset_mic", color: "text-tertiary-container", label: "24/7 Support" },
  ];

  const approvalSteps = [
    { box: "bg-primary text-on-primary", title: "Online Form & Document Review", text: "Our safety team verifies your details within 12 hours." },
    { box: "bg-primary-fixed text-primary", title: "15-Minute Video Meet & Greet", text: "We chat about your love for animals and how you'd handle emergencies." },
    { box: "bg-secondary-fixed text-secondary", title: "Your Profile Goes Live & First Bookings!", text: "Start getting requests from pet families in your neighbourhood." },
  ];

  const faqs = [
    {
      q: "Can I set my own rates?",
      a: "Absolutely! The amounts in the form are just your area's market averages. Enter any rate you like and update it whenever you want.",
    },
    {
      q: "When do I get paid?",
      a: "Earnings are paid by direct deposit the business day after each completed booking — or, if you prefer, in one weekly payout every Tuesday.",
    },
    {
      q: "What if something goes wrong?",
      a: `Our 24/7 on-call emergency vet line and up to ${coverage} in WagShield vet care coverage per booking have your back. You're never on your own.`,
    },
  ];

  const sidebar = (
    <aside className="lg:col-span-4 flex flex-col gap-space-lg lg:sticky lg:top-28 min-w-0">
      {/* Earning Calculator Card */}
      <div className="bg-surface-container-lowest p-space-lg rounded-3xl shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary" style={FILL}>
              calculate
            </span>
            <h3 className="font-title-md text-title-md text-on-surface">Estimated Monthly Earnings</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed font-label-sm text-label-sm text-primary font-bold">
            Live
          </span>
        </div>
        <EarningsEstimator />
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-base">check_circle</span>
            <span>
              Industry-low commission: <strong>just 15%</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-base">check_circle</span>
            <span>
              Every booking includes <strong>{coverage} WagShield vet care</strong>
            </span>
          </div>
        </div>
      </div>
      {/* Application Process Timeline Card */}
      <div className="bg-surface-container-lowest p-space-lg rounded-3xl shadow-sm flex flex-col gap-space-md">
        <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={FILL}>
            timeline
          </span>
          How Approval Works
        </h3>
        <div className="flex flex-col gap-space-md relative pl-2">
          {approvalSteps.map((s, i) => (
            <div className="flex gap-3" key={s.title}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold shrink-0 ${s.box}`}
              >
                {i + 1}
              </div>
              <div>
                <h4 className="font-label-lg text-label-lg text-on-surface">{s.title}</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* FAQ Accordion Card */}
      <div className="bg-surface-container-lowest p-space-lg rounded-3xl shadow-sm flex flex-col gap-space-sm">
        <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary" style={FILL}>
            quiz
          </span>
          Frequently Asked Questions
        </h3>
        <FaqAccordion items={faqs} />
      </div>
      {/* Help & Support Widget */}
      <div className="bg-surface-container-high p-space-md rounded-2xl flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-3 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- keeps the design's fixed avatar sizing */}
          <img
            alt="WagStays sitter support specialist"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-fixed shrink-0"
            src="/images/img-26.jpg"
          />
          <div>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Have questions?</span>
            <h4 className="font-label-lg text-label-lg text-on-surface">Sitter Support Team</h4>
          </div>
        </div>
        <a
          className="px-space-md py-2 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all flex items-center gap-1 shadow-sm whitespace-nowrap shrink-0"
          href="mailto:sitters@wagstays.ca?subject=Sitter%20application%20question"
        >
          <span className="material-symbols-outlined text-sm">chat</span>
          Chat with us
        </a>
      </div>
    </aside>
  );

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <div className="flex flex-col w-full">
        <div className="relative w-full overflow-hidden">
          <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-secondary-fixed/30 blur-3xl" />
          <div className="pointer-events-none absolute top-96 -left-32 w-96 h-96 rounded-full bg-primary-fixed/40 blur-3xl" />
          <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin pt-space-md pb-space-xl">
            {/* Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="hidden md:flex flex-wrap items-center gap-space-xs text-on-surface-variant font-label-md text-label-md mb-space-md"
            >
              <Link className="hover:text-primary transition-colors flex items-center gap-1" href="/">
                <span className="material-symbols-outlined text-sm">home</span>
                Home
              </Link>
              <span className="text-outline-variant">/</span>
              <Link className="hover:text-primary transition-colors" href="/become-a-sitter">
                Join Our Pack
              </Link>
              <span className="text-outline-variant">/</span>
              <span aria-current="page" className="text-primary font-semibold">
                Sitter Application
              </span>
            </nav>
            {/* Page Header Hero Banner */}
            <header className="bg-surface-container-low rounded-3xl p-space-md sm:p-space-lg md:p-space-xl shadow-sm relative overflow-hidden mb-space-lg md:mb-space-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg relative z-10">
                <div className="max-w-2xl flex flex-col gap-space-sm">
                  <div className="inline-flex items-center gap-2 px-space-md py-1 rounded-full bg-surface-container-highest text-secondary font-label-md text-label-md self-start shadow-xs">
                    <span className="material-symbols-outlined text-base" style={FILL}>
                      pets
                    </span>
                    <span>WagStays Verified Sitter Network</span>
                  </div>
                  <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight md:tracking-tight">
                    Earn <span className="text-secondary">up to $3,500 a month</span> doing what you love 🐾
                  </h1>
                  <p className="font-body-md text-body-md sm:font-body-lg sm:text-body-lg text-on-surface-variant leading-relaxed sm:leading-relaxed">
                    Join {city.name}&apos;s most trusted pet care community. Choose your own hours, the pets you
                    welcome and your rates — all on your terms.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-space-xs">
                    {trustChips.map((c) => (
                      <div
                        className="flex items-center gap-1.5 sm:gap-2 bg-surface-container-lowest/80 px-2.5 sm:px-3 py-2 rounded-2xl shadow-xs"
                        key={c.label}
                      >
                        <span className={`material-symbols-outlined text-xl ${c.color}`} style={FILL}>
                          {c.icon}
                        </span>
                        <span className="font-label-md text-label-md text-on-surface sm:whitespace-nowrap">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-space-md bg-surface-container-lowest/90 backdrop-blur-md p-space-md rounded-2xl shadow-md min-w-[280px]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- keeps the design's fixed avatar sizing */}
                  <img
                    alt="Megan R., a recently joined WagStays sitter, hugging a golden retriever and a ginger cat"
                    className="w-16 h-16 rounded-full object-cover shadow-sm ring-4 ring-primary-fixed"
                    src="/images/img-23.jpg"
                  />
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      Newest Sitter
                    </span>
                    <span className="font-title-md text-title-md text-on-surface">Megan R. (Leslieville)</span>
                    <div className="flex items-center gap-1 text-tertiary font-label-md text-label-md mt-0.5">
                      <span className="material-symbols-outlined text-sm" style={FILL}>
                        star
                      </span>
                      <span>5.0</span>
                      <span className="text-on-surface-variant font-normal">(18 bookings)</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>
            <ApplicationForm
              isLoggedIn={!!user}
              neighbourhoods={cities.flatMap((c) => c.neighbourhoods.map((n) => ({ id: n.id, label: cities.length > 1 ? `${n.name}, ${c.name}` : n.name })))}
              prefill={{
                firstName: user?.firstName ?? "",
                lastName: user?.lastName ?? "",
                email: user?.email ?? "",
                phone: user?.phone ?? "",
              }}
              sidebar={sidebar}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
