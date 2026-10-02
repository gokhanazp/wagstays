import Link from "next/link";

// Shared layout for /terms, /privacy and /pipeda: readable column, draft banner, table of contents.

export type LegalSection = { id: string; title: string; body: React.ReactNode };

const DOCS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/pipeda", label: "PIPEDA Privacy Notice" },
];

export const LAST_UPDATED = "October 2, 2026";

export function LegalDocument({
  title,
  intro,
  current,
  sections,
}: {
  title: string;
  intro: React.ReactNode;
  current: string;
  sections: LegalSection[];
}) {
  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]" id="top">
      <article className="max-w-3xl mx-auto px-margin-mobile md:px-margin pt-space-lg md:pt-space-xl flex flex-col gap-space-lg">
        {/* One swipeable row on mobile instead of wrapping onto two lines */}
        <nav aria-label="Legal documents" className="flex gap-space-xs overflow-x-auto -mx-margin-mobile px-margin-mobile sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible [scrollbar-width:none]">
          {DOCS.map((d) => (
            <Link
              aria-current={d.href === current ? "page" : undefined}
              className={`h-10 sm:h-9 shrink-0 whitespace-nowrap px-space-md rounded-full inline-flex items-center font-label-md text-label-md transition-colors ${
                d.href === current ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
              href={d.href}
              key={d.href}
            >
              {d.label}
            </Link>
          ))}
        </nav>

        <header className="flex flex-col gap-space-xs">
          <span className="font-label-md text-label-md uppercase tracking-wide text-primary">Legal</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface">{title}</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Last updated: {LAST_UPDATED}</p>
        </header>

        <div className="flex items-start gap-space-sm p-space-md rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary-fixed-dim" role="note">
          <span className="material-symbols-outlined text-xl shrink-0">gavel</span>
          <div className="flex flex-col gap-0.5">
            <strong className="font-label-lg text-label-lg">Draft — to be reviewed by legal counsel before launch</strong>
            <span className="font-body-sm text-body-sm">
              This is placeholder text prepared for product development. It is not legal advice and is not yet a binding agreement.
            </span>
          </div>
        </div>

        <div className="font-body-lg text-body-lg text-on-surface-variant">{intro}</div>

        <nav aria-labelledby="toc-title" className="bg-surface-container-lowest rounded-2xl border border-[#EFE7DE] shadow-[0_4px_16px_-2px_rgba(83,72,62,0.05)] p-space-lg">
          <h2 className="font-title-md text-title-md text-on-surface mb-space-sm" id="toc-title">
            Contents
          </h2>
          <ol className="grid sm:grid-cols-2 gap-x-space-lg gap-y-space-xs list-decimal pl-space-lg font-body-md text-body-md text-on-surface-variant marker:text-outline">
            {sections.map((s) => (
              <li key={s.id}>
                <a className="hover:text-primary transition-colors" href={`#${s.id}`}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-space-xl pb-space-lg">
          {sections.map((s, i) => (
            <section aria-labelledby={`${s.id}-h`} className="scroll-mt-28 flex flex-col gap-space-sm" id={s.id} key={s.id}>
              <h2 className="font-headline-sm text-headline-sm text-on-surface" id={`${s.id}-h`}>
                <span className="text-primary">{i + 1}.</span> {s.title}
              </h2>
              <div className="flex flex-col gap-space-sm font-body-md text-body-md text-on-surface-variant leading-relaxed [&_a]:text-primary [&_a]:font-semibold hover:[&_a]:underline [&_strong]:text-on-surface [&_ul]:list-disc [&_ul]:pl-space-lg [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-space-xs [&_ol]:list-decimal [&_ol]:pl-space-lg [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-space-xs">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <a className="self-start inline-flex items-center gap-space-xs font-label-lg text-label-lg text-primary hover:underline mb-space-lg" href="#top">
          <span className="material-symbols-outlined text-base">arrow_upward</span>
          Back to top
        </a>
      </article>
    </main>
  );
}
