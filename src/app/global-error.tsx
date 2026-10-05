"use client";

import "./globals.css";

/** Last-resort boundary when the root layout itself fails; renders its own document. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-CA">
      <body className="bg-background text-on-surface antialiased min-h-screen flex items-center justify-center p-6" style={{ fontFamily: "system-ui, sans-serif" }}>
        <title>Something went wrong · WagStays</title>
        <div className="max-w-md w-full bg-surface-container-lowest rounded-3xl shadow-sm p-8 flex flex-col items-center text-center gap-4">
          <span className="text-5xl" aria-hidden="true">
            🐾
          </span>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-on-surface-variant">
            WagStays couldn&apos;t load right now. Please try again in a moment.
            {error.digest ? ` (code ${error.digest})` : ""}
          </p>
          <button className="h-12 px-6 rounded-full bg-secondary text-on-secondary font-semibold" onClick={() => retry()} type="button">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
