import Link from "next/link";
import { LogoMark, Wordmark } from "./Logo";
import { NewsletterForm } from "./NewsletterForm";

const SOCIAL = [
  { label: "Website", icon: "public" },
  { label: "Share", icon: "share" },
  { label: "Photos", icon: "photo_camera" },
];

const SERVICES = [
  { label: "Dog Walking", href: "/sitters?service=dog-walking" },
  { label: "Cat Visits", href: "/sitters?service=drop-in" },
  { label: "In-Home Boarding", href: "/sitters?service=boarding" },
  { label: "Doggy Day Care", href: "/sitters?service=day-care" },
  { label: "Pet Taxi", href: "/sitters" },
];

const TRUST = [
  { icon: "health_and_safety", label: "$5,000 Vet Care Coverage" },
  { icon: "verified_user", label: "Verified Sitters" },
  { icon: "support_agent", label: "24/7 Live Support" },
  { icon: "lock", label: "Secure Payments" },
];

export function Footer() {
  return (
    <footer className="w-full bg-surface-container-low mt-space-xl pt-space-xl pb-space-lg">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-xl pb-space-xl">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <LogoMark className="w-8 h-8" />
              <Wordmark className="!text-headline-sm" />
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Travel with peace of mind. Trusted, loving and verified sitters keep your furry family happy every moment you&apos;re away.
            </p>
            <div className="flex items-center gap-space-sm pt-space-xs">
              {SOCIAL.map((s) => (
                <a
                  key={s.icon}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container transition-all"
                  href="#"
                >
                  <span className="material-symbols-outlined text-lg">{s.icon}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-space-sm">
            <h3 className="font-title-md text-title-md text-on-surface">Our Services</h3>
            <ul className="flex flex-col gap-space-xs">
              {SERVICES.map((s) => (
                <li key={s.label} className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">
                  <Link href={s.href}>{s.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-space-sm">
            <h3 className="font-title-md text-title-md text-on-surface">Safety &amp; Standards</h3>
            <div className="flex flex-col gap-space-sm">
              {TRUST.map((t) => (
                <div key={t.icon} className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container">
                  <span className="material-symbols-outlined text-primary text-xl">{t.icon}</span>
                  <span className="font-label-md text-label-md text-on-surface">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-space-md">
            <div className="p-space-md rounded-2xl bg-surface-container flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-xl">mark_email_read</span>
                <span className="font-title-md text-title-md text-on-surface">The Monthly Wag</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Tips, care guides and exclusive offers — straight to your inbox.
              </p>
              <NewsletterForm />
            </div>
          </div>
        </div>
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex flex-col sm:flex-row items-center gap-space-md">
            <div className="flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-sm">language</span>
              <span>EN / $ CAD</span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-center">
              © 2026 WagStays Technologies Inc. All rights reserved.
            </span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-space-md font-label-sm text-label-sm text-on-surface-variant">
            <span className="cursor-pointer hover:text-on-surface">Terms of Service</span>
            <span className="cursor-pointer hover:text-on-surface">Privacy Policy</span>
            <span className="cursor-pointer hover:text-on-surface">PIPEDA Privacy Notice</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
