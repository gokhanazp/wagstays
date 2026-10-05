import Link from "next/link";
import { RootDocument } from "./_root/RootDocument";
import { BTN, Card } from "@/components/ui";

// Fallback 404 for URLs outside any language segment. Most 404s render app/[locale]/not-found.tsx instead.
export default function RootNotFound() {
  return (
    <RootDocument locale="en">
      <main className="w-full min-h-screen px-margin-mobile bg-background flex items-center justify-center">
        <Card className="w-full max-w-lg p-space-xl flex flex-col items-center text-center gap-space-md">
          <h1 className="font-headline-md text-headline-md text-on-surface">Page not found</h1>
          <Link className={BTN.primary} href="/">
            Back to home
          </Link>
        </Card>
      </main>
    </RootDocument>
  );
}
