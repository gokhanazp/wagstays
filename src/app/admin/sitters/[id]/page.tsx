import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatMoney, formatRating } from "@/lib/format";
import {
  BOOKING_STATUS_LABELS,
  SERVICE_LABELS,
  SERVICE_TYPES,
  UNIT_LABELS,
  type BookingStatus,
  type ServiceType,
} from "@/lib/constants";
import { BTN, Card, CardHeader, EmptyState, PageHeader, StatCard, StatusChip, TD, TH, Table, formatDate } from "@/components/ui";
import { ServiceRowForm, SitterForm, SpeciesForm } from "./_components/SitterForms";
import { RemoveContentButton, SitterContentForm } from "./_components/ModerationForms";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await db.sitterProfile.findUnique({ where: { id }, select: { displayName: true } });
  return { title: s?.displayName ?? "Sitter" };
}

export default async function AdminSitterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sitter = await db.sitterProfile.findUnique({
    where: { id },
    include: {
      city: { include: { neighbourhoods: { orderBy: { name: "asc" } } } },
      neighbourhood: true,
      user: { select: { id: true, email: true, phone: true, createdAt: true, suspended: true } },
      services: { include: { _count: { select: { bookings: true } } } },
      application: { select: { id: true, trackingCode: true } },
      species: { select: { kind: true } },
      photos: { orderBy: { sortOrder: "asc" } },
      tags: { orderBy: { sortOrder: "asc" } },
      skills: { orderBy: { sortOrder: "asc" } },
      _count: { select: { bookings: true, reviews: true, favorites: true } },
    },
  });
  if (!sitter) notFound();
  const tz = sitter.city.timeZone;

  const [bookings, reviews, earnings] = await Promise.all([
    db.booking.findMany({
      where: { sitterId: sitter.id, status: { not: "DRAFT" } },
      include: { owner: { select: { firstName: true, lastName: true } }, pet: { select: { name: true } }, service: { select: { type: true } } },
      orderBy: { startAt: "desc" },
      take: 8,
    }),
    db.review.findMany({ where: { sitterId: sitter.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.booking.aggregate({ where: { sitterId: sitter.id, status: "COMPLETED" }, _sum: { subtotalCents: true } }),
  ]);

  const services = [...sitter.services].sort(
    (a, b) => SERVICE_TYPES.indexOf(a.type as ServiceType) - SERVICE_TYPES.indexOf(b.type as ServiceType),
  );

  return (
    <>
      <Link className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href="/admin/sitters">
        <span className="material-symbols-outlined text-base">arrow_back</span>All sitters
      </Link>

      <div className="flex flex-col md:flex-row md:items-center gap-space-lg">
        <Image alt="" className="w-20 h-20 rounded-2xl object-cover shadow-[0_4px_16px_-2px_rgba(83,72,62,0.12)]" height={80} priority src={sitter.avatarUrl} width={80} />
        <div className="flex-1 min-w-0">
          <PageHeader
            actions={
              <>
                <StatusChip tone={sitter.status === "ACTIVE" ? "success" : "neutral"}>{sitter.status === "ACTIVE" ? "Active" : "Paused"}</StatusChip>
                <Link className={BTN.secondary} href={`/sitters/${sitter.slug}`} target="_blank">
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                  View as a customer
                </Link>
              </>
            }
            description={
              <>
                {sitter.headline} · {sitter.neighbourhood.name}, {sitter.city.name} · <span className="break-all">{sitter.user.email}</span>
                {sitter.application && (
                  <>
                    {" · "}
                    <Link className="text-primary hover:underline" href={`/admin/applications/${sitter.application.id}`}>
                      Application {sitter.application.trackingCode}
                    </Link>
                  </>
                )}
              </>
            }
            eyebrow={`Sitter since ${formatDate(sitter.createdAt, tz)}`}
            title={sitter.displayName}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <StatCard
          hint={sitter.reviewCount ? `${sitter.reviewCount} review${sitter.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
          icon="star"
          label="Rating"
          value={sitter.reviewCount ? formatRating(sitter.rating) : "—"}
        />
        <StatCard hint={`${sitter._count.bookings} total requests`} icon="task_alt" label="Completed" tone="secondary" value={sitter.completedBookings} />
        <StatCard hint="Completed, before fees" icon="payments" label="Earned" tone="tertiary" value={formatMoney(earnings._sum.subtotalCents ?? 0)} />
        <StatCard hint="Pet parents saved them" icon="favorite" label="Favourites" value={sitter._count.favorites} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-space-lg items-start">
        <Card>
          <CardHeader icon="tune" title="Admin settings" />
          <SitterForm
            neighbourhoods={sitter.city.neighbourhoods.map((n) => ({ id: n.id, name: n.name }))}
            sitter={{
              id: sitter.id,
              status: sitter.status,
              neighbourhoodId: sitter.neighbourhoodId,
              featured: sitter.featured,
              featuredBadge: sitter.featuredBadge,
              featuredBadgeIcon: sitter.featuredBadgeIcon,
              credential: sitter.credential,
              quote: sitter.quote,
              isSuperSitter: sitter.isSuperSitter,
              instantBook: sitter.instantBook,
              idVerified: sitter.idVerified,
              backgroundChecked: sitter.backgroundChecked,
              firstAidCertified: sitter.firstAidCertified,
              vetKnowledge: sitter.vetKnowledge,
              professionalTrainer: sitter.professionalTrainer,
            }}
          />
        </Card>

        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="pb-space-lg">
            <CardHeader icon="pets" title="Pets cared for" />
            <SpeciesForm
              kinds={sitter.species.map((s) => s.kind)}
              offersDogWalking={sitter.services.some((s) => s.type === "DOG_WALKING" && s.active)}
              sitterId={sitter.id}
            />
          </Card>

          <Card className="pb-space-sm">
            <CardHeader icon="sell" title="Services" />
            <div className="px-space-lg pt-space-xs">
              {services.length === 0 ? (
                <p className="py-space-md font-body-sm text-body-sm text-on-surface-variant">No services yet.</p>
              ) : (
                services.map((s) => (
                  <ServiceRowForm
                    key={s.id}
                    service={{
                      id: s.id,
                      type: s.type,
                      maxPetsPerBooking: s.maxPetsPerBooking,
                      additionalPetPriceCents: s.additionalPetPriceCents,
                      holidayPriceCents: s.holidayPriceCents,
                      puppyPriceCents: s.puppyPriceCents,
                      label: SERVICE_LABELS[s.type as ServiceType] ?? s.type,
                      unitLabel: `${UNIT_LABELS[s.unit] ?? s.unit}${s.durationMins ? ` (${s.durationMins} min)` : ""}`,
                      price: s.priceCents / 100,
                      active: s.active,
                      bookings: s._count.bookings,
                    }}
                  />
                ))
              )}
            </div>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader
              action={
                <Link className="font-label-md text-label-md text-primary hover:underline" href="/admin/reviews">
                  Moderate
                </Link>
              }
              icon="reviews"
              title="Recent reviews"
            />
            {reviews.length === 0 ? (
              <EmptyState icon="rate_review" title="No reviews yet" />
            ) : (
              <ul className="flex flex-col gap-space-md px-space-lg pt-space-md">
                {reviews.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 p-space-md rounded-xl bg-surface-container-low">
                    <div className="flex items-center justify-between gap-space-sm">
                      <span className="font-label-lg text-label-lg text-on-surface truncate">{r.authorName}</span>
                      <span className="inline-flex items-center gap-0.5 font-label-md text-label-md text-on-surface shrink-0">
                        <span className="material-symbols-outlined text-base text-[#F5A623]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        {r.rating}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">{r.body}</p>
                    <div className="flex items-center gap-space-sm font-body-sm text-body-sm text-outline">
                      {formatDate(r.createdAt, tz)}
                      {r.hidden && <StatusChip tone="danger">Hidden</StatusChip>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-space-lg items-start">
        <Card className="pb-space-lg">
          <CardHeader icon="edit_note" title="Profile content (moderation)" />
          <div className="pt-space-md">
            <SitterContentForm
              sitter={{
                id: sitter.id,
                displayName: sitter.displayName,
                headline: sitter.headline,
                bio: sitter.bio,
                about: sitter.about,
                residentPetName: sitter.residentPetName,
                locationNote: sitter.locationNote,
                serviceAreaNote: sitter.serviceAreaNote,
                homeTitle: sitter.homeTitle,
                homeNote: sitter.homeNote,
                otherPetsNote: sitter.otherPetsNote,
                yearsExperience: sitter.yearsExperience,
              }}
            />
          </div>
        </Card>

        <Card className="pb-space-lg">
          <CardHeader icon="photo_library" title="Photos, tags & skills" />
          <div className="px-space-lg pt-space-md flex flex-col gap-space-lg">
            <p className="font-body-sm text-body-sm text-on-surface-variant">Remove content that breaks our Terms. Each removal needs a reason and is emailed to the sitter.</p>
            <div className="flex items-center gap-space-md">
              <Image alt="Profile photo" className="w-16 h-16 rounded-2xl object-cover" height={64} src={sitter.avatarUrl} width={64} />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="font-label-lg text-label-lg text-on-surface">Profile photo</span>
                <RemoveContentButton label="Replace with placeholder" sitterId={sitter.id} target="avatar" />
              </div>
            </div>
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-md text-label-md text-on-surface-variant">Gallery ({sitter.photos.length})</span>
              {sitter.photos.length === 0 && <span className="font-body-sm text-body-sm text-on-surface-variant">No gallery photos.</span>}
              {sitter.photos.map((ph) => (
                <div className="flex items-start gap-space-md" key={ph.id}>
                  <Image alt={ph.caption ?? ""} className="w-16 h-16 rounded-xl object-cover shrink-0" height={64} src={ph.url} width={64} />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="font-body-sm text-body-sm text-on-surface truncate">{ph.caption ?? "No caption"}</span>
                    <RemoveContentButton sitterId={sitter.id} target="photo" targetId={ph.id} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-space-sm">
              <span className="font-label-md text-label-md text-on-surface-variant">Tags & skills</span>
              {sitter.tags.length + sitter.skills.length === 0 && <span className="font-body-sm text-body-sm text-on-surface-variant">None.</span>}
              {[...sitter.tags.map((x) => ({ id: x.id, label: x.label, target: "tag" as const })), ...sitter.skills.map((x) => ({ id: x.id, label: `${x.emoji ?? ""} ${x.label}`.trim(), target: "skill" as const }))].map((x) => (
                <div className="flex flex-wrap items-center justify-between gap-space-sm" key={x.id}>
                  <StatusChip tone={x.target === "tag" ? "primary" : "neutral"}>{x.label}</StatusChip>
                  <RemoveContentButton sitterId={sitter.id} target={x.target} targetId={x.id} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader icon="event_note" title="Recent bookings" />
        {bookings.length === 0 ? (
          <EmptyState icon="event_busy" text="Booking requests for this sitter will show up here." title="No bookings yet" />
        ) : (
          <div className="px-space-sm md:px-space-md pt-space-md pb-space-sm">
            <Table>
              <thead>
                <tr>
                  <th className={TH}>Date</th>
                  <th className={TH}>Pet parent</th>
                  <th className={TH}>Service</th>
                  <th className={TH}>Total</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const st = BOOKING_STATUS_LABELS[b.status as BookingStatus] ?? BOOKING_STATUS_LABELS.DRAFT;
                  return (
                    <tr key={b.id}>
                      <td className={`${TD} whitespace-nowrap`}>{formatDate(b.startAt, tz)}</td>
                      <td className={TD}>
                        {b.owner.firstName} {b.owner.lastName}
                        <span className="text-on-surface-variant">
                          {" "}
                          · {b.pet.name}
                          {b.petCount > 1 ? ` +${b.petCount - 1}` : ""}
                        </span>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>{SERVICE_LABELS[b.service.type as ServiceType] ?? b.service.type}</td>
                      <td className={`${TD} whitespace-nowrap`}>{formatMoney(b.totalCents, { exact: true })}</td>
                      <td className={TD}>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}
