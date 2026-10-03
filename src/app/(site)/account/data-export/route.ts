import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { buildDataExport, exportCooldownSeconds } from "@/lib/privacy";
import { getCurrentUser } from "@/lib/session";

// PIPEDA access request, self-service: a JSON download of everything we hold about the signed-in user.
// Rate-limited to one export per minute per user (tracked through the audit log, so it works across instances).
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", "/account/settings");
    return NextResponse.redirect(url);
  }

  const wait = await exportCooldownSeconds(user.id);
  if (wait > 0) {
    return new NextResponse(`You just downloaded your data. Please wait ${wait} second${wait === 1 ? "" : "s"} and try again.`, {
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
