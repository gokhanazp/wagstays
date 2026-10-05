// Translator for the `booking` namespace usable outside React (client + server safe): the shared booking
// libs (price-details, availability-core, pets, holidays, booking-time, owner-readiness) take an optional
// `locale` and translate through this. English stays the default so existing callers are unchanged.

import { createTranslator } from "next-intl";
import en from "../../messages/en/booking.json";
import fr from "../../messages/fr/booking.json";

const make = (locale: "en" | "fr") => createTranslator({ locale, messages: { booking: locale === "fr" ? fr : en }, namespace: "booking" });

const cache = new Map<string, ReturnType<typeof make>>();

/** `t("price.badgeOne")` etc. — keys relative to the `booking` namespace. */
export function bookingT(locale: string = "en") {
  const l = locale === "fr" ? "fr" : "en";
  let t = cache.get(l);
  if (!t) cache.set(l, (t = make(l)));
  return t;
}
