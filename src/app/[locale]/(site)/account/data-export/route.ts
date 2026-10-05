import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { localePrefix, routing, type Locale } from "@/i18n/routing";
import { audit } from "@/lib/audit";
import { buildDataExport, exportCooldownSeconds } from "@/lib/privacy";
import { getCurrentUser } from "@/lib/session";

// PIPEDA access request, self-service: a JSON download of everything we hold about the signed-in user.
// Rate-limited to one export per minute per user (tracked through the audit log, so it works across instances).
export async function GET(request: Request, { params }: RouteContext<"/[locale]/account/data-export">) {
  const { locale: raw } = await params;
  const locale: Locale = (routing.locales as readonly string[]).includes(raw) ? (raw as Locale) : routing.defaultLocale;
  const user = await getCurrentUser();
  if (!user) {
    const url = new URL(`${localePrefix(locale)}/login`, request.url);
    url.searchParams.set("next", "/account/settings");
    return NextResponse.redirect(url);
  }

  const wait = await exportCooldownSeconds(user.id);
  if (wait > 0) {
    const t = await getTranslations({ locale, namespace: "account.dataExport" });
    return new NextResponse(t("wait", { count: wait }), {
      status: 429,
      headers: { "Retry-After": String(wait), "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const data = await buildDataExport(user.id);
  await audit(user.id, "user.data_export", "User", user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="wagstays-data-${date}.json"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
