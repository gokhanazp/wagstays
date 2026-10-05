import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/server";

export default async function AccountIndex() {
  redirect(await localizedPath("/account/bookings"));
}
