import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { BTN, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found" };

/** Root 404 for unmatched URLs and notFound() calls — keeps the site chrome so visitors can find their way back. */
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="w-full pt-28 pb-space-xl px-margin-mobile md:px-margin bg-background min-h-[calc(100vh-320px)] flex justify-center">
        <Card className="w-full max-w-lg p-space-lg md:p-space-xl flex flex-col items-center text-center gap-space-md h-fit">
          <span className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-primary-container to-primary text-white flex items-center justify-center shadow-[0_10px_24px_-6px_rgba(83,72,62,0.25)]">
            <span aria-hidden="true" className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>
              pets
            </span>
          </span>
          <span className="font-label-md text-label-md uppercase tracking-wider text-secondary">Error 404</span>
          <h1 className="font-headline-md text-headline-md text-on-surface">This page wandered off</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            We sniffed everywhere but couldn&apos;t find it. The link may be old, or the page may have moved.
          </p>
          <div className="flex flex-wrap justify-center gap-space-sm">
            <Link className={BTN.secondary} href="/">
              Back to home
            </Link>
            <Link className={BTN.primary} href="/sitters">
              <span className="material-symbols-outlined text-xl">search</span>
              Find a Sitter
            </Link>
          </div>
        </Card>
      </main>
      <Footer />
    </>
  );
}
