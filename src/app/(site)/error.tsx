"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BTN, Card } from "@/components/ui";

/** Error boundary for the public site — the header and footer stay usable around it. */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="w-full pt-28 pb-space-xl px-margin-mobile md:px-margin bg-background min-h-[calc(100vh-320px)] flex justify-center">
      <Card className="w-full max-w-lg p-space-lg md:p-space-xl flex flex-col items-center text-center gap-space-md h-fit">
        <span className="w-16 h-16 rounded-2xl bg-secondary-fixed text-secondary flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl">sentiment_dissatisfied</span>
        </span>
        <h1 className="font-headline-md text-headline-md text-on-surface">Something went wrong</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Sorry — we hit a snag loading this page. Please try again. If it keeps happening, contact support
          {error.digest ? (
            <>
              {" "}
              and mention code <code className="font-mono text-on-surface">{error.digest}</code>
            </>
          ) : null}
          .
        </p>
        <div className="flex flex-wrap justify-center gap-space-sm">
          <Link className={BTN.secondary} href="/">
            Back to home
          </Link>
          <button className={BTN.primary} onClick={() => retry()} type="button">
            <span className="material-symbols-outlined text-xl">refresh</span>
            Try again
          </button>
        </div>
      </Card>
    </main>
  );
}
