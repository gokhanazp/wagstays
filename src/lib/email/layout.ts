import "server-only";
import { siteUrl } from "@/lib/seo/site";
import { emailUrl } from "./links";
import { mailT } from "./i18n";

// Branded HTML email layout (table-based, inline styles — matches the Supabase auth templates in
// scripts/supabase-email.mjs). Content strings are escaped here; pass trusted HTML only via `introHtml`.

const C = { bg: "#FFF8F4", card: "#FFFFFF", ink: "#221A12", muted: "#53483E", line: "#EFE7DE", button: "#A23E24", green: "#226150", soft: "#FBF2EC" };
const FONT = `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type EmailContent = {
  locale: string;
  /** hidden inbox preview line */
  preheader: string;
  title: string;
  /** greeting name; omitted → generic greeting; null → no greeting */
  name?: string | null;
  /** plain paragraphs (escaped) */
  paragraphs?: string[];
  /** label/value rows, e.g. dates, pets, total (escaped) */
  details?: { label: string; value: string }[];
  /** quoted block, e.g. a message preview (escaped, max ~300 chars) */
  quote?: string;
  button?: { label: string; url: string };
  secondaryButton?: { label: string; url: string };
  /** small print under the divider (escaped) */
  note?: string;
  /** footer: why they got it + manage/unsubscribe links (omit for security/account emails) */
  footer?: { manageUrl?: string; unsubscribeUrl?: string; reason?: string };
};

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const t = mailT(c.locale, "mailCommon");
  const greet = c.name === null ? "" : c.name ? t("hi", { name: c.name }) : t("hiNoName");
  const p = (s: string) => `<tr><td style="font-size:16px;line-height:26px;color:${C.muted};padding:0 0 14px">${esc(s)}</td></tr>`;
  const details = c.details?.length
    ? `<tr><td style="padding:4px 0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};border-radius:16px">${c.details
        .map(
          (d, i) =>
            `<tr><td style="padding:${i ? 0 : 14}px 16px ${i === c.details!.length - 1 ? 14 : 8}px;font-size:13px;line-height:20px;color:${C.muted};width:38%;vertical-align:top">${esc(d.label)}</td><td style="padding:${i ? 0 : 14}px 16px ${i === c.details!.length - 1 ? 14 : 8}px 0;font-size:14px;line-height:20px;color:${C.ink};font-weight:600;vertical-align:top">${esc(d.value)}</td></tr>`,
        )
        .join("")}</table></td></tr>`
    : "";
  const quote = c.quote
    ? `<tr><td style="padding:0 0 18px"><div style="border-left:4px solid ${C.green};background:${C.soft};border-radius:0 12px 12px 0;padding:12px 16px;font-size:15px;line-height:24px;color:${C.ink}">${esc(c.quote)}</div></td></tr>`
    : "";
  const btn = (b: { label: string; url: string }, primary: boolean) =>
    `<a href="${esc(b.url)}" style="display:inline-block;background:${primary ? C.button : C.card};color:${primary ? "#ffffff" : C.button};border:2px solid ${C.button};text-decoration:none;font-weight:700;font-size:16px;line-height:44px;padding:0 28px;border-radius:999px;margin:0 4px 8px;font-family:${FONT}">${esc(b.label)}</a>`;
  const buttons = c.button
    ? `<tr><td align="center" style="padding:6px 0 18px">${btn(c.button, true)}${c.secondaryButton ? btn(c.secondaryButton, false) : ""}</td></tr>
       <tr><td style="font-size:12px;line-height:18px;color:${C.muted};padding:0 0 4px">${esc(t("buttonFallback"))}</td></tr>
       <tr><td style="font-size:12px;line-height:18px;word-break:break-all;padding:0 0 18px"><a href="${esc(c.button.url)}" style="color:${C.green}">${esc(c.button.url)}</a></td></tr>`
    : "";
  const note = c.note ? `<tr><td style="border-top:1px solid ${C.line};padding:16px 0 0;font-size:13px;line-height:20px;color:${C.muted}">${esc(c.note)}</td></tr>` : "";
  const f = c.footer;
  const footerLinks = [
    `<a href="${emailUrl("/privacy", c.locale)}" style="color:${C.muted}">${esc(t("footer.privacy"))}</a>`,
    `<a href="${emailUrl("/account/support/new", c.locale)}" style="color:${C.muted}">${esc(t("footer.help"))}</a>`,
    ...(f?.manageUrl ? [`<a href="${esc(f.manageUrl)}" style="color:${C.muted}">${esc(t("footer.manage"))}</a>`] : []),
  ].join("&nbsp;·&nbsp;");
  const html = `<!doctype html><html lang="${c.locale === "fr" ? "fr-CA" : "en-CA"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden">${esc(c.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 24px"><a href="${emailUrl("/", c.locale)}" style="text-decoration:none"><img src="${siteUrl()}/brand/wagstays-logo-192.png" width="174" height="40" alt="WagStays" style="display:block;border:0;height:40px;width:174px"></a></td></tr>
<tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:24px;padding:32px 28px;font-family:${FONT};color:${C.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="font-size:24px;line-height:32px;font-weight:800;color:${C.ink};padding:0 0 14px">${esc(c.title)}</td></tr>
${greet ? p(greet) : ""}${(c.paragraphs ?? []).map(p).join("")}${details}${quote}${buttons}${note}
</table></td></tr>
<tr><td align="center" style="padding:24px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.muted}">
${f ? `${esc(f.reason ?? t("footer.why"))}<br>` : ""}${esc(t("footer.company"))}<br>${footerLinks}${f?.unsubscribeUrl ? `<br><a href="${esc(f.unsubscribeUrl)}" style="color:${C.muted}">${esc(t("footer.unsubscribe"))}</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    c.title,
    "",
    greet,
    ...(c.paragraphs ?? []),
    ...(c.details ?? []).map((d) => `${d.label}: ${d.value}`),
    c.quote ? `"${c.quote}"` : "",
    c.button ? `${c.button.label}: ${c.button.url}` : "",
    c.secondaryButton ? `${c.secondaryButton.label}: ${c.secondaryButton.url}` : "",
    c.note ?? "",
    "",
    "—",
    t("footer.company"),
    f?.unsubscribeUrl ? `${t("footer.unsubscribe")}: ${f.unsubscribeUrl}` : "",
  ]
    .filter((x, i, a) => x !== "" || a[i - 1] !== "")
    .join("\n");
  return { html, text };
}
