import Image from "next/image";

/** Two-column auth layout in the Warm Paw style: photo panel left, form card right. */
export function AuthShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <section className="relative w-full -mt-20 pt-28 pb-16 bg-gradient-to-b from-surface-container via-surface to-background overflow-hidden">
        <div className="absolute -top-16 -left-16 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
        <div className="absolute top-48 -right-20 w-[480px] h-[480px] rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />
        <div className="max-w-[1100px] mx-auto px-margin-mobile md:px-margin relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-space-xl items-center">
          <div className="hidden lg:block relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-xl bg-surface-container-high">
            <Image alt="A happy Golden Retriever playing with a dog walker in a sunny park" className="object-cover" fill sizes="550px" src="/images/img-06.jpg" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/40 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 bg-surface-container-lowest/95 backdrop-blur-md p-space-md rounded-2xl shadow-lg flex items-center gap-space-sm">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <div>
                <div className="font-title-md text-title-md text-on-surface">Every booking is protected</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">$5,000 WagShield vet care coverage included</div>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high shadow-[0_20px_36px_-6px_rgba(83,72,62,0.12)] p-space-lg md:p-space-xl flex flex-col gap-space-lg">
            <div className="flex flex-col gap-space-xs">
              <div className="inline-flex items-center gap-2 px-space-md py-1.5 rounded-full bg-surface-container-low text-primary w-fit">
                <span className="material-symbols-outlined text-lg text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
                <span className="font-label-md text-label-md tracking-wide uppercase">{eyebrow}</span>
              </div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface">{title}</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

export const INPUT =
  "w-full h-12 px-space-md rounded-xl bg-surface-container-lowest border-[1.5px] border-surface-container-high font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-[3px] focus:ring-primary-container/15 transition-all";
export const LABEL = "font-label-lg text-label-lg text-on-surface";
export const PRIMARY_BTN =
  "w-full h-12 rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-all duration-[250ms] [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(243,123,92,0.35)] disabled:opacity-70 disabled:hover:translate-y-0";

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="flex items-center gap-1 font-body-sm text-body-sm text-error">
      <span className="material-symbols-outlined text-base">error</span>
      {messages[0]}
    </p>
  );
}
