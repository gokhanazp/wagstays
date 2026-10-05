import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getFavoriteSitters } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { SitterResultCard } from "../sitters/_components/SitterResultCard";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("misc.favourites");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function FavouritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect(await localizedPath("/login?next=/favourites"));
  const [sitters, t, tn] = await Promise.all([getFavoriteSitters(user.id), getTranslations("misc.favourites"), getTranslations("common.nav")]);

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <section className="max-w-[1100px] mx-auto px-margin-mobile md:px-margin pt-space-xl flex flex-col gap-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="inline-flex items-center gap-2 px-space-md py-1.5 rounded-full bg-surface-container-low text-primary w-fit">
            <span className="material-symbols-outlined text-lg text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            <span className="font-label-md text-label-md tracking-wide uppercase">{t("eyebrow")}</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface">{t("title")}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{t("subtitle")}</p>
        </div>
        {sitters.length ? (
          <div className="flex flex-col gap-space-lg">
            {sitters.map((s) => (
              <SitterResultCard key={s.id} sitter={s} />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high p-space-xl flex flex-col items-center text-center gap-space-md">
            <div className="w-16 h-16 rounded-2xl bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-3xl">heart_plus</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">{t("emptyTitle")}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              {t("emptyText")}
            </p>
            <Link className="px-space-lg py-space-sm rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="/sitters">
              {tn("findSitter")}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
