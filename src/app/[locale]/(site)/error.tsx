"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { BTN, Card } from "@/components/ui";
import { Link } from "@/i18n/navigation";

/** Error boundary for the public site — the header and footer stay usable around it. */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="w-full pt-28 pb-space-xl px-margin-mobile md:px-margin bg-background min-h-[calc(100vh-320px)] flex justify-center">
      <Card className="w-full max-w-lg p-space-lg md:p-space-xl flex flex-col items-center text-center gap-space-md h-fit">
        <span className="w-16 h-16 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl">sentiment_dissatisfied</span>
        </span>
        <h1 className="font-headline-md text-headline-md text-on-surface">{t("errors.somethingWrong")}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {t("errors.somethingWrongText")}
          {error.digest ? (
            <>
              {" "}
              {t.rich("errors.mentionCode", { digest: error.digest, mono: (c) => <code className="font-mono text-on-surface">{c}</code> })}
            </>
          ) : null}
          .
        </p>
        <div className="flex flex-wrap justify-center gap-space-sm">
          <Link className={BTN.secondary} href="/">
            {t("actions.backToHome")}
          </Link>
          <button className={BTN.primary} onClick={() => retry()} type="button">
            <span className="material-symbols-outlined text-xl">refresh</span>
            {t("actions.tryAgain")}
          </button>
        </div>
      </Card>
    </main>
  );
}
