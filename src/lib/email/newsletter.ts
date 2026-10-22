import "server-only";
import { mailT } from "./i18n";
import { emailUrl, unsubscribeUrl } from "./links";
import { sendEmail } from "./send";

/** Confirmation sent right after someone subscribes to WagStays news (in the language they subscribed in). */
export async function sendNewsletterWelcome(subscriberId: string, to: string, locale: string) {
  const m = mailT(locale, "mailNewsletter");
  const token = { kind: "newsletter", subscriberId } as const;
  return sendEmail({
    to,
    kind: "newsletter.welcome",
    subject: m("welcome.subject"),
    locale,
    preheader: m("welcome.preheader"),
    title: m("welcome.title"),
    paragraphs: [m("welcome.p1"), m("welcome.p2")],
    button: { label: m("welcome.button"), url: emailUrl("/", locale) },
    footer: { reason: m("welcome.reason", { email: to }), unsubscribeUrl: unsubscribeUrl(token, locale) },
    unsubscribe: token,
    idempotencyKey: `newsletter.welcome:${subscriberId}`,
  });
}
