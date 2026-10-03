import { listPushDevices } from "@/app/actions/push";
import { pushEnabled, vapidPublicKey } from "@/lib/push";
import { NotificationsCard } from "./NotificationsCard";

/** Server wrapper for Account Settings: hidden entirely when push isn't configured (no VAPID keys). */
export async function NotificationsSection() {
  const key = vapidPublicKey();
  if (!key || !pushEnabled()) return null;
  const devices = await listPushDevices();
  return <NotificationsCard devices={devices} vapidKey={key} />;
}
