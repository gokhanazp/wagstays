import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { BTN, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Account closed | WagStays", robots: { index: false } };

export default function AccountClosedPage() {
  return (
    <main className="w-full pt-28 pb-space-xl px-margin-mobile md:px-margin bg-background min-h-[calc(100vh-320px)] flex justify-center">
      <Card className="w-full max-w-lg p-space-lg md:p-space-xl flex flex-col items-center text-center gap-space-md h-fit">
        <span className="w-16 h-16 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl">waving_hand</span>
        </span>
        <h1 className="font-headline-md text-headline-md text-on-surface">Your account is closed</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          We&apos;ve removed your login, photos and contact details and anonymised the rest. Past bookings and payments are kept without your
          name as a financial record. Thanks for being part of WagStays — give your pets a scratch from us.
        </p>
        <div className="flex flex-wrap justify-center gap-space-sm">
          <Link className={BTN.secondary} href="/privacy">
            Privacy Policy
          </Link>
          <Link className={BTN.primary} href="/">
            Back to home
          </Link>
        </div>
      </Card>
    </main>
  );
}
