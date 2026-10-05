import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { BTN, Card } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("misc.accountClosed");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default function AccountClosedPage() {
  const t = useTranslations("misc.accountClosed");
  const tc = useTranslations("common.actions");
  return (
    <main className="w-full pt-28 pb-space-xl px-margin-mobile md:px-margin bg-background min-h-[calc(100vh-320px)] flex justify-center">
      <Card className="w-full max-w-lg p-space-lg md:p-space-xl flex flex-col items-center text-center gap-space-md h-fit">
        <span className="w-16 h-16 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl">waving_hand</span>
        </span>
        <h1 className="font-headline-md text-headline-md text-on-surface">{t("title")}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t("text")}
        </p>
        <div className="flex flex-wrap justify-center gap-space-sm">
          <Link className={BTN.secondary} href="/privacy">
            {t("privacy")}
          </Link>
          <Link className={BTN.primary} href="/">
            {tc("backToHome")}
          </Link>
        </div>
      </Card>
    </main>
  );
}
