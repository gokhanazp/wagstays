import type messages from "../../messages/en";
import type { routing } from "./routing";

// Typed message keys: t("missing.key") is a compile error. English is the source of truth.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
