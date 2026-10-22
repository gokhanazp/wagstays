import { createTranslator } from "next-intl";
import commonEn from "../../../messages/en/mailCommon.json";
import commonFr from "../../../messages/fr/mailCommon.json";
import bookingEn from "../../../messages/en/mailBooking.json";
import bookingFr from "../../../messages/fr/mailBooking.json";
import miscEn from "../../../messages/en/mailMisc.json";
import miscFr from "../../../messages/fr/mailMisc.json";
import newsletterEn from "../../../messages/en/mailNewsletter.json";
import newsletterFr from "../../../messages/fr/mailNewsletter.json";

// Email copy lives in its own namespaces (messages/{en,fr}/mail*.json). They're deliberately NOT part of
// messages/*/index.ts, so they never ship to the browser; `npm run i18n:check` still verifies them.
const MESSAGES = {
  en: { mailCommon: commonEn, mailBooking: bookingEn, mailMisc: miscEn, mailNewsletter: newsletterEn },
  fr: { mailCommon: commonFr, mailBooking: bookingFr, mailMisc: miscFr, mailNewsletter: newsletterFr },
};
export type MailLocale = keyof typeof MESSAGES;
export const mailLocale = (l: string | null | undefined): MailLocale => (l === "fr" ? "fr" : "en");

export function mailT<NS extends "mailCommon" | "mailBooking" | "mailMisc" | "mailNewsletter">(locale: string | null | undefined, namespace: NS) {
  const l = mailLocale(locale);
  return createTranslator({ locale: l, messages: MESSAGES[l] as (typeof MESSAGES)["en"], namespace });
}
