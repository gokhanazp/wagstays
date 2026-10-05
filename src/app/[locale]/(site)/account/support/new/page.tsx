import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";
import { TICKET_CATEGORIES, type TicketCategory } from "@/lib/support";
import { Card } from "@/components/ui";
import { bookingDate, bookingRef } from "../../_lib";
import type { ServiceType } from "@/lib/constants";
import { NewTicketForm, type BookingOption } from "../_components/NewTicketForm";
import { bookingPets, petNames } from "@/lib/pets";

export async function generateMetadata() {
  const t = await getTranslations("account.meta");
  return { title: t("newTicket") };
}

export default async function NewTicketPage({ searchParams }: PageProps<"/[locale]/account/support/new">) {
  const user = await requireUser();
  const sp = await searchParams;
  const [t, tc, locale] = await Promise.all([getTranslations("account.support"), getTranslations("common"), getLocale()]);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const wantedBooking = one(sp.booking)?.slice(0, 64);
  const wantedCategory = one(sp.category)?.toUpperCase();

  const select = {
    id: true,
    ownerId: true,
    startAt: true,
    owner: { select: { firstName: true } },
    pet: { select: { id: true, name: true } },
    pets: { select: { pet: { select: { id: true, name: true } } } },
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
    const names = petNames(bookingPets(b).map((p) => p.name), locale);
    const service = tc(`enums.service.${b.service.type as ServiceType}`);
    return {
      value: b.id,
      label: asOwner
        ? t("new.forWith", { service, pets: names, name: b.sitter.displayName.split(" ")[0] })
        : t("new.forOwner", { service, pets: names, name: b.owner.firstName }),
      hint: `${bookingRef(b.id)} · ${bookingDate(b.startAt, b.sitter.city.timeZone, locale)}${asOwner ? "" : t("new.asSitter")}`,
    };
  });

  return (
    <>
      <div className="flex flex-col gap-space-sm">
        <Link className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href="/account/support">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {tc("nav.helpSupport")}
        </Link>
        <div className="flex flex-col gap-1">
          <span className="font-label-md text-label-md uppercase tracking-wide text-primary">{t("list.newRequest")}</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-md md:text-headline-md text-on-surface">{t("new.title")}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            {t("new.intro")}
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
