import type { Metadata } from "next";
import { baseMetadata, RootDocument } from "@/app/_root/RootDocument";

export const metadata: Metadata = baseMetadata;

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument locale="en">{children}</RootDocument>;
}
