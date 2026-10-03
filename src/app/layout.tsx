import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/seo/site";
import { PwaClient } from "@/components/pwa/PwaClient";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const viewport: Viewport = { themeColor: "#226150" };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: "WagStays",
  openGraph: { type: "website", siteName: "WagStays", locale: "en_CA" },
  twitter: { card: "summary_large_image" },
  title: {
    default: "WagStays — Trusted Pet Sitters & Dog Walkers in Toronto",
    template: "%s · WagStays",
  },
  description:
    "Book verified, loving pet sitters and dog walkers near you in Toronto. Background-checked sitters, live GPS walk tracking and vet care coverage on every booking.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={jakarta.variable}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="bg-background font-body-md text-on-surface antialiased">
        {children}
        <PwaClient vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null} />
      </body>
    </html>
  );
}
