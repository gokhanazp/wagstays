import type { Metadata } from "next";

// Private booking flow: also disallowed in robots.txt.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
