import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sitter.meta");
  return { title: `${t("profile")}` };
}

export default async function SitterProfilePage() {
  const { profile: p } = await requireSitter();
  const t = await getTranslations("sitter");
  const [photos, skills, tags, settings, species, dogWalking] = await Promise.all([
    db.sitterPhoto.findMany({ where: { sitterId: p.id }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, url: true, caption: true } }),
    db.sitterSkill.findMany({ where: { sitterId: p.id }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, emoji: true } }),
    db.sitterTag.findMany({ where: { sitterId: p.id }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, icon: true } }),
    getPlatformSettings(),
    db.sitterSpecies.findMany({ where: { sitterId: p.id }, select: { kind: true } }),
    db.service.count({ where: { sitterId: p.id, type: "DOG_WALKING", active: true } }),
  ]);

  const badges = [
    { on: p.idVerified, icon: "badge", label: t("badges.idVerified") },
    { on: p.backgroundChecked, icon: "verified_user", label: t("badges.backgroundChecked") },
    { on: p.firstAidCertified, icon: "medical_services", label: t("badges.firstAid") },
    { on: p.vetKnowledge, icon: "stethoscope", label: t("badges.vetKnowledge") },
    { on: p.professionalTrainer, icon: "school", label: t("badges.trainer") },
    { on: p.isSuperSitter, icon: "workspace_premium", label: t("badges.superSitter") },
    { on: p.featured, icon: "star", label: t("badges.featured") },
  ];

  return (
    <>
      <PageHeader
        actions={
          <Link className={BTN.secondary} href={`/sitters/${p.slug}`}>
            <span className="material-symbols-outlined text-lg">visibility</span>{t("viewPublicProfile")}
          </Link>
        }
        description={t("profile.description")}
        eyebrow={t("eyebrow")}
        title={t("meta.profile")}
      />

      <Card className="pb-space-lg">
        <div className="scroll-mt-28" id="photos" />
        <CardHeader icon="photo_camera" title={t("profile.photos")} />
        <div className="px-space-lg pt-space-md grid grid-cols-1 md:grid-cols-2 gap-space-lg">
          <ImageUpload current={p.avatarUrl} hint={t("profile.avatarHint")} kind="avatar" title={t("profile.avatarTitle")} />
          <ImageUpload current={p.cardPhotoUrl} hint={t("profile.cardHint")} kind="card" title={t("profile.cardTitle")} />
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
          title={t("profile.gallery")}
        />
        <div className="px-space-lg pt-space-md">
          <GalleryManager photos={photos} />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-space-lg items-start">
        <Card className="pb-space-lg">
          <CardHeader icon="psychology" title={t("profile.skills")} />
          <p className="px-space-lg pt-space-xs font-body-sm text-body-sm text-on-surface-variant">{t("profile.skillsHint")}</p>
          <div className="px-space-lg pt-space-md">
            <SkillsManager skills={skills} />
          </div>
        </Card>
        <Card className="pb-space-lg">
          <CardHeader icon="sell" title={t("profile.cardTags")} />
          <p className="px-space-lg pt-space-xs font-body-sm text-body-sm text-on-surface-variant">{t("profile.cardTagsHint")}</p>
          <div className="px-space-lg pt-space-md">
            <TagsManager tags={tags} />
          </div>
        </Card>
      </div>

      <Card className="pb-space-lg">
        <div className="scroll-mt-28" id="verification" />
        <CardHeader icon="verified" title={t("profile.verification")} />
        <div className="px-space-lg pt-space-md flex flex-col gap-space-md">
          <p className="flex items-start gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-base text-primary">lock</span>
            {t("profile.verificationText", { email: settings.supportEmail })}
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
