import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";
import { TICKET_CATEGORIES, type TicketCategory } from "@/lib/support";
import { Card } from "@/components/ui";
import { bookingDate, bookingRef, serviceLabel } from "../../_lib";
import { NewTicketForm, type BookingOption } from "../_components/NewTicketForm";

export const metadata: Metadata = { title: "New support request | WagStays" };

export default async function NewTicketPage({ searchParams }: PageProps<"/account/support/new">) {
  const user = await requireUser();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const wantedBooking = one(sp.booking)?.slice(0, 64);
  const wantedCategory = one(sp.category)?.toUpperCase();

  const select = {
    id: true,
    ownerId: true,
    startAt: true,
    owner: { select: { firstName: true } },
    pet: { select: { name: true } },
    service: { select: { type: true } },
    sitter: { select: { displayName: true, userId: true, city: { select: { timeZone: true } } } },
  } as const;
  const mine = { OR: [{ ownerId: user.id }, { sitter: { userId: user.id } }] };
  const [recent, prefill, settings] = await Promise.all([
    db.booking.findMany({ where: { AND: [mine, { status: { not: "DRAFT" } }] }, select, orderBy: { startAt: "desc" }, take: 40 }),
    // The prefilled booking is only honoured when it's one of the user's own.
    wantedBooking ? db.booking.findFirst({ where: { AND: [mine, { id: wantedBooking }] }, select }) : null,
    getPlatformSettings(),
  ]);
  const all = prefill && !recent.some((b) => b.id === prefill.id) ? [prefill, ...recent] : recent;

  const bookings: BookingOption[] = all.map((b) => {
    const asOwner = b.ownerId === user.id;
    const who = asOwner ? `with ${b.sitter.displayName.split(" ")[0]}` : `for ${b.pet.name} (${b.owner.firstName})`;
    return {
      value: b.id,
      label: `${serviceLabel(b.service.type)} ${who}`,
      hint: `${bookingRef(b.id)} · ${bookingDate(b.startAt, b.sitter.city.timeZone)}${asOwner ? "" : " · as sitter"}`,
    };
  });

  return (
    <>
      <div className="flex flex-col gap-space-sm">
        <Link className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href="/account/support">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Help &amp; Support
        </Link>
        <div className="flex flex-col gap-1">
          <span className="font-label-md text-label-md uppercase tracking-wide text-primary">New request</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md text-on-surface">How can we help?</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Tell us what happened and we&apos;ll get back to you here. Adding the booking helps us sort it out faster.
          </p>
        </div>
      </div>
      <Card className="p-space-lg max-w-3xl">
        <NewTicketForm
          bookings={bookings}
          defaultBooking={prefill?.id}
          defaultCategory={TICKET_CATEGORIES.includes(wantedCategory as TicketCategory) ? wantedCategory : prefill ? "BOOKING_ISSUE" : undefined}
          supportPhone={settings.supportPhone}
        />
      </Card>
    </>
  );
}
