import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getFavoriteSitters } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { SitterResultCard } from "../sitters/_components/SitterResultCard";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";

export const metadata: Metadata = { title: "Favourites", robots: { index: false } };

export default async function FavouritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect(await localizedPath("/login?next=/favourites"));
  const sitters = await getFavoriteSitters(user.id);

  return (
    <main className="w-full pt-20 bg-background min-h-[calc(100vh-320px)]">
      <section className="max-w-[1100px] mx-auto px-margin-mobile md:px-margin pt-space-xl flex flex-col gap-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="inline-flex items-center gap-2 px-space-md py-1.5 rounded-full bg-surface-container-low text-primary w-fit">
            <span className="material-symbols-outlined text-lg text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            <span className="font-label-md text-label-md tracking-wide uppercase">Your Saved Sitters</span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface">Favourites</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Sitters you&apos;ve saved, ready to book whenever you need them.</p>
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
            <h2 className="font-headline-sm text-headline-sm text-on-surface">No favourites yet</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Tap the heart on any sitter to save them here.
            </p>
            <Link className="px-space-lg py-space-sm rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-secondary-container hover:text-on-secondary-container transition-all" href="/sitters">
              Find a Sitter
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
