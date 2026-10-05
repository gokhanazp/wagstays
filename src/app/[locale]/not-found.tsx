import { getTranslations } from "next-intl/server";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { BTN, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Root 404 for unmatched URLs and notFound() calls — keeps the site chrome so visitors can find their way back. */
export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <>
      <title>{`${t("errors.pageNotFound")} · WagStays`}</title>
      <Header />
      <main className="w-full pt-28 pb-space-xl px-margin-mobile md:px-margin bg-background min-h-[calc(100vh-320px)] flex justify-center">
        <Card className="w-full max-w-lg p-space-lg md:p-space-xl flex flex-col items-center text-center gap-space-md h-fit">
          <span className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-primary-container to-primary text-white flex items-center justify-center shadow-[0_10px_24px_-6px_rgba(83,72,62,0.25)]">
            <span aria-hidden="true" className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>
              pets
            </span>
          </span>
          <span className="font-label-md text-label-md uppercase tracking-wider text-secondary">{t("errors.error404")}</span>
          <h1 className="font-headline-md text-headline-md text-on-surface">{t("errors.notFoundTitle")}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t("errors.notFoundText")}
          </p>
          <div className="flex flex-wrap justify-center gap-space-sm">
            <Link className={BTN.secondary} href="/">
              {t("actions.backToHome")}
            </Link>
            <Link className={BTN.primary} href="/sitters">
              <span className="material-symbols-outlined text-xl">search</span>
              {t("nav.findSitter")}
            </Link>
          </div>
        </Card>
      </main>
      <Footer />
    </>
  );
}
