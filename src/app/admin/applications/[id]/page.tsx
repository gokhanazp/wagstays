import { PetKindChips } from "@/components/PetKinds";
import { signedApplicationFileUrl } from "@/lib/application-files-server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getActiveCity } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import {
  APPLICATION_STATUS_LABELS,
  PET_SIZE_LABELS,
  PET_SIZES,
  SERVICE_LABELS,
  SERVICE_TYPES,
  UNIT_LABELS,
  type ApplicationStatus,
  type ServiceType,
} from "@/lib/constants";
import { EXPERIENCE_LABELS, HOME_TYPE_LABELS, SERVICE_UNIT_FOR, toZonedInput } from "@/lib/sitter-approval";
import { BTN, Card, CardHeader, PageHeader, StatusChip, formatDate, formatDateTime } from "@/components/ui";
import { DecisionPanel, MeetGreetForm, NotesForm, ViewProfileLinks } from "./_components/ApplicationActions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const app = await db.sitterApplication.findUnique({ where: { id }, select: { trackingCode: true } });
  return { title: app ? `Application ${app.trackingCode}` : "Application" };
}

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  "application.schedule_meet_greet": { label: "Meet & Greet scheduled", icon: "event" },
  "application.notes": { label: "Notes updated", icon: "edit_note" },
  "application.approve": { label: "Approved", icon: "verified" },
  "application.reject": { label: "Rejected", icon: "block" },
};

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const app = await db.sitterApplication.findUnique({
    where: { id },
    include: {
      services: true,
      user: { select: { id: true, email: true, role: true, createdAt: true } },
      sitterProfile: { select: { id: true, slug: true, displayName: true, status: true } },
      files: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!app) notFound();

  // Private files: short-lived signed links, generated on each page view (5 min).
  const signed = await Promise.all(app.files.map(async (f) => ({ ...f, url: await signedApplicationFileUrl(f.path) })));
  const idFile = signed.find((f) => f.kind === "ID_DOCUMENT");
  const bgFile = signed.find((f) => f.kind === "BACKGROUND_CHECK");
  const homePhotos = signed.filter((f) => f.kind === "HOME_PHOTO");

  const [city, logs, existingUser] = await Promise.all([
    getActiveCity(),
    db.auditLog.findMany({
      where: { entityType: "SitterApplication", entityId: app.id },
      include: { actor: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    app.user ? null : db.user.findUnique({ where: { email: app.email.toLowerCase() }, select: { id: true, role: true, createdAt: true } }),
  ]);
  const tz = city.timeZone;
  const hood = city.neighbourhoods.find((n) => n.slug === app.neighbourhood || n.name === app.neighbourhood);
  const st = APPLICATION_STATUS_LABELS[app.status as ApplicationStatus] ?? APPLICATION_STATUS_LABELS.IN_REVIEW;
  const decided = app.status === "APPROVED" || app.status === "REJECTED";
  const account = app.user ?? existingUser;

  const services = [...app.services].sort(
    (a, b) => SERVICE_TYPES.indexOf(a.type as ServiceType) - SERVICE_TYPES.indexOf(b.type as ServiceType),
  );
  const sizes = PET_SIZES.filter((s) => ({ SMALL: app.acceptsSmall, MEDIUM: app.acceptsMedium, LARGE: app.acceptsLarge, GIANT: app.acceptsGiant })[s]);
  const certs = [
    { on: app.certFirstAid, label: "Pet First Aid & CPR" },
    { on: app.certMedication, label: "Medication administration" },
    { on: app.certPuppy, label: "Puppy care" },
    { on: app.certBehaviour, label: "Behaviour / training" },
  ];
  const homeChecks = [
    { on: app.smokeFree, label: "Smoke-free home" },
    { on: app.noChildren, label: "No children at home" },
    { on: app.ownPets, label: "Has own pets" },
    { on: app.fencedYard, label: "Fenced yard" },
  ];

  // Timeline: key milestones + audit entries
  const timeline: { at: Date; icon: string; title: string; text?: string }[] = [
    { at: app.createdAt, icon: "send", title: "Application submitted", text: `Tracking code ${app.trackingCode}` },
    ...logs.map((l) => {
      const meta = ACTION_LABELS[l.action] ?? { label: l.action, icon: "history" };
      let text = `by ${l.actor.firstName} ${l.actor.lastName}`;
      try {
        const d = l.details ? JSON.parse(l.details) : null;
        if (l.action === "application.schedule_meet_greet" && d?.after?.meetGreetAt) text = `${formatDateTime(new Date(d.after.meetGreetAt), tz)} · ${text}`;
        if (l.action === "application.reject" && d?.after?.reason) text = `“${d.after.reason}” · ${text}`;
      } catch {}
      return { at: l.createdAt, icon: meta.icon, title: meta.label, text };
    }),
  ];
  if (app.meetGreetAt && !logs.some((l) => l.action === "application.schedule_meet_greet")) {
    timeline.push({ at: app.meetGreetAt, icon: "event", title: "Meet & Greet (booked by applicant)" });
  }
  if (app.reviewedAt && !logs.some((l) => l.action === "application.approve" || l.action === "application.reject")) {
    timeline.push({ at: app.reviewedAt, icon: app.status === "APPROVED" ? "verified" : "block", title: app.status === "APPROVED" ? "Approved" : "Decision recorded" });
  }
  timeline.sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <>
      <Link className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary w-fit" href="/admin/applications">
        <span className="material-symbols-outlined text-base">arrow_back</span>All applications
      </Link>
      <PageHeader
        actions={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
        description={
          <>
            {app.trackingCode} · Submitted {formatDate(app.createdAt, tz)} · {hood?.name ?? app.neighbourhood ?? "No neighbourhood"}, {city.name}
          </>
        }
        eyebrow="Sitter application"
        title={`${app.firstName} ${app.lastName}`}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-space-lg items-start">
        <div className="flex flex-col gap-space-lg min-w-0">
          <Card className="pb-space-lg">
            <CardHeader icon="person" title="Applicant" />
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-lg gap-y-space-md px-space-lg pt-space-md">
              <Item label="Email" value={<a className="text-primary hover:underline break-all" href={`mailto:${app.email}`}>{app.email}</a>} />
              <Item label="Phone" value={app.phone ? <a className="text-primary hover:underline" href={`tel:${app.phone}`}>{app.phone}</a> : "—"} />
              <Item label="Neighbourhood" value={hood?.name ?? app.neighbourhood ?? "—"} />
              <Item label="Experience" value={EXPERIENCE_LABELS[app.experience] ?? app.experience} />
              <Item
                label="WagStays account"
                value={
                  account
                    ? `${account.role === "ADMIN" ? "Admin" : account.role === "SITTER" ? "Sitter" : "Pet parent"} account since ${formatDate(account.createdAt, tz)}`
                    : "No account yet — one will be created on approval"
                }
              />
            </dl>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="sell" title="Services & rates" />
            <ul className="flex flex-col px-space-lg pt-space-md">
              {services.map((s) => {
                const u = SERVICE_UNIT_FOR[s.type as ServiceType];
                return (
                  <li key={s.id} className="flex items-center justify-between gap-space-md py-space-sm border-b border-[#EFE7DE] last:border-0">
                    <span className="font-label-lg text-label-lg text-on-surface">{SERVICE_LABELS[s.type as ServiceType] ?? s.type}</span>
                    <span className="font-body-md text-body-md text-on-surface whitespace-nowrap">
                      <strong className="font-title-md text-title-md">{formatMoney(s.priceCents)}</strong>
                      <span className="text-on-surface-variant"> / {UNIT_LABELS[u?.unit ?? ""] ?? "visit"}{u?.durationMins ? ` · ${u.durationMins} min` : ""}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            <Card className="pb-space-lg">
              <CardHeader icon="pets" title="Pets & dog sizes" />
              <div className="px-space-lg pt-space-md">
                <PetKindChips kinds={app.acceptedKinds.length ? app.acceptedKinds : ["DOG"]} size="sm" />
                {!app.acceptedKinds.length && (
                  <p className="pt-space-xs font-body-sm text-body-sm text-on-surface-variant">Not chosen (older application) — dogs will be used on approval.</p>
                )}
              </div>
              <div className={`flex flex-wrap gap-space-xs px-space-lg pt-space-md ${app.acceptedKinds.length && !app.acceptedKinds.includes("DOG") ? "hidden" : ""}`}>
                {sizes.length ? (
                  sizes.map((s) => (
                    <StatusChip key={s} tone="primary">
                      {PET_SIZE_LABELS[s].label} · {PET_SIZE_LABELS[s].range}
                    </StatusChip>
                  ))
                ) : (
                  <span className="font-body-sm text-body-sm text-on-surface-variant">None selected</span>
                )}
              </div>
            </Card>
            <Card className="pb-space-lg">
              <CardHeader icon="workspace_premium" title="Certifications" />
              <CheckList items={certs} />
            </Card>
          </div>

          <Card className="pb-space-lg">
            <CardHeader icon="home" title={`Home · ${HOME_TYPE_LABELS[app.homeType] ?? app.homeType}`} />
            <CheckList columns items={homeChecks} />
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="format_quote" title="Bio" />
            <p className="px-space-lg pt-space-md font-body-md text-body-md text-on-surface whitespace-pre-line leading-relaxed">{app.bio}</p>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="folder_open" title="Documents" />
            <ul className="flex flex-col gap-space-sm px-space-lg pt-space-md">
              <DocRow icon="badge" label="Government photo ID" name={idFile?.fileName ?? app.idDocumentName} url={idFile?.url} stored={!!idFile} />
              <DocRow icon="local_police" label="Police / vulnerable sector check" name={bgFile?.fileName ?? app.backgroundCheckName} url={bgFile?.url} stored={!!bgFile} />
            </ul>
            {homePhotos.length > 0 && (
              <div className="px-space-lg pt-space-md flex flex-col gap-space-sm">
                <span className="font-label-lg text-label-lg text-on-surface">Home photos ({homePhotos.length})</span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-space-sm">
                  {homePhotos.map((p) =>
                    p.url ? (
                      <a className="block aspect-square rounded-xl overflow-hidden bg-surface-container hover:opacity-90" href={p.url} key={p.id} rel="noreferrer" target="_blank">
                        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                        <img alt={p.fileName} className="w-full h-full object-cover" src={p.url} />
                      </a>
                    ) : null,
                  )}
                </div>
              </div>
            )}
            <p className="flex items-start gap-space-xs px-space-lg pt-space-md font-body-sm text-body-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-base">lock</span>
              Files are kept in private storage. Links expire 5 minutes after this page loads — refresh to get new ones.
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-space-lg min-w-0 xl:sticky xl:top-space-lg">
          <Card className="pb-space-lg">
            <CardHeader icon="gavel" title="Decision" />
            <div className="px-space-lg pt-space-md">
              <DecisionPanel applicationId={app.id} decided={decided} hasDocs={!!app.idDocumentName} name={`${app.firstName} ${app.lastName}`}>
                {app.status === "APPROVED" && (
                  <div className="flex flex-col gap-space-md">
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Approved {app.reviewedAt ? formatDateTime(app.reviewedAt, tz) : ""}.
                      {app.sitterProfile ? ` ${app.sitterProfile.displayName} is ${app.sitterProfile.status === "ACTIVE" ? "live" : "paused"}.` : ""}
                    </p>
                    {app.sitterProfile && <ViewProfileLinks sitterId={app.sitterProfile.id} slug={app.sitterProfile.slug} />}
                  </div>
                )}
                {app.status === "REJECTED" && (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Rejected {app.reviewedAt ? formatDateTime(app.reviewedAt, tz) : ""}. The reason is in the internal notes.
                  </p>
                )}
              </DecisionPanel>
            </div>
          </Card>

          {!decided && (
            <Card className="pb-space-lg">
              <CardHeader icon="handshake" title="Meet & Greet" />
              <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
                {app.meetGreetAt && (
                  <p className="font-body-sm text-body-sm text-on-surface">
                    Booked for <strong>{formatDateTime(app.meetGreetAt, tz)}</strong>
                  </p>
                )}
                <MeetGreetForm
                  applicationId={app.id}
                  defaultValue={app.meetGreetAt ? toZonedInput(app.meetGreetAt, tz) : ""}
                  hasExisting={!!app.meetGreetAt}
                />
              </div>
            </Card>
          )}

          <Card className="pb-space-lg">
            <CardHeader icon="sticky_note_2" title="Notes" />
            <div className="px-space-lg pt-space-md">
              <NotesForm applicationId={app.id} defaultValue={app.reviewNotes ?? ""} />
            </div>
          </Card>

          <Card className="pb-space-lg">
            <CardHeader icon="timeline" title="Timeline" />
            <ol className="flex flex-col px-space-lg pt-space-md">
              {timeline.map((t, i) => (
                <li key={i} className="flex gap-space-md">
                  <div className="flex flex-col items-center">
                    <span className="w-8 h-8 rounded-full bg-surface-container-low text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">{t.icon}</span>
                    </span>
                    {i < timeline.length - 1 && <span className="w-0.5 flex-1 bg-[#EFE7DE] my-1" />}
                  </div>
                  <div className="flex flex-col pb-space-md min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface">{t.title}</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{formatDateTime(t.at, tz)}</span>
                    {t.text && <span className="font-body-sm text-body-sm text-on-surface-variant break-words">{t.text}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="font-label-md text-label-md uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="font-body-md text-body-md text-on-surface">{value}</dd>
    </div>
  );
}

function CheckList({ items, columns }: { items: { on: boolean; label: string }[]; columns?: boolean }) {
  return (
    <ul className={`grid grid-cols-1 ${columns ? "sm:grid-cols-2" : ""} gap-space-sm px-space-lg pt-space-md`}>
      {items.map((c) => (
        <li key={c.label} className={`flex items-center gap-space-sm font-body-md text-body-md ${c.on ? "text-on-surface" : "text-outline"}`}>
          <span className={`material-symbols-outlined text-xl ${c.on ? "text-primary" : "text-outline-variant"}`}>{c.on ? "check_circle" : "radio_button_unchecked"}</span>
          {c.label}
        </li>
      ))}
    </ul>
  );
}

function DocRow({ icon, label, name, url, stored }: { icon: string; label: string; name: string | null; url?: string | null; stored?: boolean }) {
  return (
    <li className="flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-low">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${name ? "bg-[#EBF3EF] text-primary" : "bg-surface-container text-outline"}`}>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </span>
      <span className="flex flex-col min-w-0 flex-1">
        <span className="font-label-lg text-label-lg text-on-surface">{label}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{name ?? "Not provided"}</span>
      </span>
      {url ? (
        <a className={`${BTN.small} bg-primary text-on-primary hover:bg-primary-container`} href={url} rel="noreferrer" target="_blank">
          <span className="material-symbols-outlined text-base">visibility</span>
          View
        </a>
      ) : (
        <StatusChip tone={name ? (stored === false ? "neutral" : "success") : "warning"}>{name ? "Name only" : "Missing"}</StatusChip>
      )}
    </li>
  );
}
