"use server";

import { verifyApplicationFiles } from "@/lib/application-files-server";
import { randomInt } from "node:crypto";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { SERVICE_TYPES, type ServiceType } from "@/lib/constants";
import { SERVICE_PRICE_RULES } from "@/lib/sitter-application";
import { formatMoney } from "@/lib/format";
import { PET_KINDS, normalizeKinds } from "@/lib/pets";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";

export type ApplicationState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const fileName = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => v || undefined);

type ErrorsT = Awaited<ReturnType<typeof getTranslations<"apply.errors">>>;

const applicationSchema = (t: ErrorsT) =>
  z.object({
    firstName: z.string().trim().min(1, t("firstName")).max(60),
    lastName: z.string().trim().min(1, t("lastName")).max(60),
    email: z.string().trim().toLowerCase().pipe(z.email(t("email"))),
    phone: z
      .string()
      .trim()
      .refine((v) => /^\+?1?\D*(\d\D*){10}$/.test(v), t("phone")),
    neighbourhood: z.string({ error: t("neighbourhood") }).trim().min(1, t("neighbourhood")),
    experience: z.enum(["1-3", "3-6", "6+", "VET"], { error: t("experience") }),
    acceptsSmall: checkbox,
    acceptsMedium: checkbox,
    acceptsLarge: checkbox,
    acceptsGiant: checkbox,
    acceptedKinds: z
      .array(z.enum(PET_KINDS, { error: t("kindInvalid") }))
      .min(1, t("kindMin"))
      .transform((v) => normalizeKinds(v)),
    certFirstAid: checkbox,
    certMedication: checkbox,
    certPuppy: checkbox,
    certBehaviour: checkbox,
    homeType: z.enum(["HOUSE_WITH_YARD", "APARTMENT", "CONDO_BALCONY"], { error: t("homeType") }),
    smokeFree: checkbox,
    noChildren: checkbox,
    ownPets: checkbox,
    fencedYard: checkbox,
    bio: z.string().trim().min(80, t("bioMin")).max(500, t("bioMax")),
    idDocumentName: fileName.refine((v) => !!v, t("idDocument")),
    backgroundCheckName: fileName,
    agreeTerms: checkbox.refine((v) => v, t("agreeTerms")),
    agreeAccuracy: checkbox.refine((v) => v, t("agreeAccuracy")),
  });

export async function submitApplication(_: ApplicationState, formData: FormData): Promise<ApplicationState> {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;

  const [t, locale] = await Promise.all([getTranslations("apply.errors"), getLocale()]);
  const parsed = applicationSchema(t).safeParse({ ...raw, acceptedKinds: formData.getAll("acceptedKinds").filter((v) => typeof v === "string") });
  const fieldErrors: Record<string, string[] | undefined> = parsed.success
    ? {}
    : { ...z.flattenError(parsed.error).fieldErrors };

  // Services: toggles + prices
  const services: { type: ServiceType; priceCents: number }[] = [];
  for (const type of SERVICE_TYPES) {
    if (raw[`service_${type}`] !== "on") continue;
    const rule = SERVICE_PRICE_RULES[type];
    const price = Number(raw[`price_${type}`]);
    if (!Number.isFinite(price) || price < rule.min || price > rule.max) {
      fieldErrors[`price_${type}`] = [t("rateRange", { min: formatMoney(rule.min * 100, { locale }), max: formatMoney(rule.max * 100, { locale }) })];
      continue;
    }
    services.push({ type, priceCents: Math.round(price * 100) });
  }
  if (parsed.success && services.some((s) => s.type === "DOG_WALKING") && !parsed.data.acceptedKinds.includes("DOG")) {
    fieldErrors.acceptedKinds = [t("dogWalkingNeedsDog")];
  }
  if (parsed.success && parsed.data.acceptedKinds.includes("DOG") && !(parsed.data.acceptsSmall || parsed.data.acceptsMedium || parsed.data.acceptsLarge || parsed.data.acceptsGiant)) {
    fieldErrors.acceptedKinds = [t("dogSize")];
  }
  if (services.length === 0 && !SERVICE_TYPES.some((t) => fieldErrors[`price_${t}`])) {
    fieldErrors.services = [t("noService")];
  }

  // Neighbourhood (submitted as its id) must belong to an active city
  const hood = parsed.success
    ? await db.neighbourhood.findFirst({ where: { id: parsed.data.neighbourhood, city: { isActive: true } }, select: { id: true, name: true } })
    : null;
  if (parsed.success && !hood) fieldErrors.neighbourhood = [t("neighbourhood")];

  // Uploaded documents must really exist in the private bucket
  const uploads = await verifyApplicationFiles(formData);
  if (parsed.success && parsed.data.idDocumentName && !uploads.idOk) {
    fieldErrors.idDocumentName = [t("idMissing")];
  }

  if (!parsed.success || Object.keys(fieldErrors).length > 0) {
    return { error: t("fixFields"), fieldErrors };
  }

  const { agreeTerms: _t, agreeAccuracy: _a, ...data } = parsed.data;
  void _t;
  void _a;
  const user = await getCurrentUser();
  if (user?.suspended) return { error: t("suspended") };

  let trackingCode = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `WS-${randomInt(10000, 100000)}`;
    try {
      await db.sitterApplication.create({
        data: {
          ...data,
          neighbourhood: hood!.name,
          neighbourhoodId: hood!.id,
          trackingCode: code,
          userId: user?.id ?? null,
          services: { create: services },
          backgroundCheckName: uploads.backgroundOk ? data.backgroundCheckName : null,
          files: { create: uploads.files },
        },
      });
      trackingCode = code;
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  if (!trackingCode) return { error: t("saveFailed") };

  redirect(await localizedPath(`/become-a-sitter/submitted?code=${encodeURIComponent(trackingCode)}`));
}
