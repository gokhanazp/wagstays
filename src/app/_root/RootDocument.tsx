import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import "../globals.css";
import { PwaClient } from "@/components/pwa/PwaClient";
import { intlLocale } from "@/i18n/routing";
import { siteUrl } from "@/lib/seo/site";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

/** Metadata shared by every root layout ([locale], admin, offline). */
export const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: "WagStays",
  openGraph: { type: "website", siteName: "WagStays", locale: "en_CA" },
  twitter: { card: "summary_large_image" },
};

/**
 * The <html> document. The app has several root layouts (site pages under [locale], the English-only admin panel and
 * the static offline page), so the shell lives here instead of app/layout.tsx.
 */
export function RootDocument({ locale, children }: { locale: string; children: React.ReactNode }) {
  return (
    <html lang={intlLocale(locale)} className={jakarta.variable}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="bg-background font-body-md text-on-surface antialiased">
        <NextIntlClientProvider>
          {children}
          <PwaClient vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
