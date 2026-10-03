import "server-only";
import type { EventHandler } from "./index";

// Push / email notifications — implemented by the PWA & push feature.
export const notificationHandlers: EventHandler[] = [];
