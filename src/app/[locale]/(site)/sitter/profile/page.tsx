import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { BTN, Card, CardHeader, PageHeader, StatusChip } from "@/components/ui";
import { requireSitter } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/settings";
import { MAX_PHOTOS } from "@/lib/sitter";
import { GalleryManager } from "./_components/GalleryManager";
import { ImageUpload } from "./_components/ImageUpload";
import { ProfileForm } from "./_components/ProfileForm";
import { SkillsManager, TagsManager } from "./_components/SkillsTags";

export const metadata: Metadata = { title: "My Profile | WagStays" };

export default async function SitterProfilePage() {
  const { profile: p } = await requireSitter();
  const [photos, skills, tags, settings, species, dogWalking] = await Promise.all([
    db.sitterPhoto.findMany({ where: { sitterId: p.id }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, url: true, caption: true } }),
    db.sitterSkill.findMany({ where: { sitterId: p.id }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, emoji: true } }),
    db.sitterTag.findMany({ where: { sitterId: p.id }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, icon: true } }),
    getPlatformSettings(),
    db.sitterSpecies.findMany({ where: { sitterId: p.id }, select: { kind: true } }),
    db.service.count({ where: { sitterId: p.id, type: "DOG_WALKING", active: true } }),
  ]);

  const badges = [
    { on: p.idVerified, icon: "badge", label: "Government ID verified" },
    { on: p.backgroundChecked, icon: "verified_user", label: "Police Vulnerable Sector Check" },
    { on: p.firstAidCertified, icon: "medical_services", label: "Pet First Aid & CPR" },
    { on: p.vetKnowledge, icon: "stethoscope", label: "Veterinary knowledge" },
    { on: p.professionalTrainer, icon: "school", label: "Professional trainer" },
    { on: p.isSuperSitter, icon: "workspace_premium", label: "Super Sitter" },
    { on: p.featured, icon: "star", label: "Featured on the home page" },
  ];

  return (
    <>
      <PageHeader
        actions={
          <Link className={BTN.secondary} href={`/sitters/${p.slug}`}>
            <span className="material-symbols-outlined text-lg">visibility</span>View public profile
          </Link>
        }
        description="This is what pet parents see when they find you. A warm, detailed profile gets more requests."
        eyebrow="Sitter Dashboard"
        title="My Profile"
      />

      <Card className="pb-space-lg">
        <div className="scroll-mt-28" id="photos" />
        <CardHeader icon="photo_camera" title="Profile photos" />
        <div className="px-space-lg pt-space-md grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          <ImageUpload current={p.avatarUrl} hint="A friendly, well-lit headshot. Square works best." kind="avatar" title="Profile photo" />
          <ImageUpload current={p.cardPhotoUrl} hint="Tall photo used on search and home page cards." kind="card" title="Card photo" />
        </div>
      </Card>

      <ProfileForm
        values={{
          headline: p.headline,
          bio: p.bio,
          about: p.about ?? "",
          residentPetName: p.residentPetName ?? "",
          locationNote: p.locationNote ?? "",
          serviceAreaNote: p.serviceAreaNote ?? "",
          serviceRadiusKm: p.serviceRadiusKm,
          yearsExperience: p.yearsExperience,
          homeType: p.homeType ?? "HOUSE_WITH_YARD",
          homeTitle: p.homeTitle ?? "",
          homeNote: p.homeNote ?? "",
          hasYard: p.hasYard,
          smokeFree: p.smokeFree,
          hasChildren: p.hasChildren,
          hasOtherPets: p.hasOtherPets,
          otherPetsNote: p.otherPetsNote ?? "",
          acceptsSmall: p.acceptsSmall,
          acceptsMedium: p.acceptsMedium,
          acceptsLarge: p.acceptsLarge,
          acceptsGiant: p.acceptsGiant,
          kinds: species.map((s) => s.kind),
          offersDogWalking: dogWalking > 0,
        }}
      />

      <Card className="pb-space-lg">
        <div className="scroll-mt-28" id="gallery" />
        <CardHeader
          action={<span className="font-label-md text-label-md text-on-surface-variant">{photos.length}/{MAX_PHOTOS}</span>}
          icon="photo_library"
          title="Photo gallery"
        />
        <div className="px-space-lg pt-space-md">
          <GalleryManager photos={photos} />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">
        <Card className="pb-space-lg">
          <CardHeader icon="psychology" title="Skills" />
          <p className="px-space-lg pt-space-xs font-body-sm text-body-sm text-on-surface-variant">Shown as pills in the About section of your profile.</p>
          <div className="px-space-lg pt-space-md">
            <SkillsManager skills={skills} />
          </div>
        </Card>
        <Card className="pb-space-lg">
          <CardHeader icon="sell" title="Card tags" />
          <p className="px-space-lg pt-space-xs font-body-sm text-body-sm text-on-surface-variant">Short feature chips on your search card, e.g. “Large Yard”.</p>
          <div className="px-space-lg pt-space-md">
            <TagsManager tags={tags} />
          </div>
        </Card>
      </div>

      <Card className="pb-space-lg">
        <div className="scroll-mt-28" id="verification" />
        <CardHeader icon="verified" title="Verification & badges" />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
          <p className="flex items-start gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-base text-primary">lock</span>
            Verified by WagStays — these are set by our trust &amp; safety team after reviewing your documents and can&apos;t be changed here.
            Questions? Email {settings.supportEmail}.
          </p>
          <div className="flex flex-wrap gap-space-xs">
            {badges.map((b) => (
              <StatusChip icon={b.on ? b.icon : "radio_button_unchecked"} key={b.label} tone={b.on ? "success" : "neutral"}>
                {b.label}
              </StatusChip>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
