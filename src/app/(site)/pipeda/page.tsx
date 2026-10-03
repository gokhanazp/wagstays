import type { Metadata } from "next";
import Link from "next/link";
import { getPlatformSettings } from "@/lib/settings";
import { LegalDocument, type LegalSection } from "../terms/_components/LegalDocument";

export const metadata: Metadata = {
  title: "PIPEDA Privacy Notice",
  description: "How WagStays applies the ten fair information principles of Canada's PIPEDA.",
  alternates: { canonical: "/pipeda" },
};

export default async function PipedaPage() {
  const { supportEmail: email, supportPhone: phone } = await getPlatformSettings();

  const sections: LegalSection[] = [
    {
      id: "accountability",
      title: "Accountability",
      body: (
        <p>
          WagStays Technologies Inc. is responsible for personal information under its control and has designated a Privacy Officer who is
          accountable for our compliance. Service providers who process information for us are bound by contract to protect it.
        </p>
      ),
    },
    {
      id: "purposes",
      title: "Identifying purposes",
      body: (
        <p>
          We explain why we collect personal information at or before the time we collect it — to run accounts, process bookings and payments,
          verify Sitters, keep the community safe and provide support. Details are in our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      ),
    },
    {
      id: "consent",
      title: "Consent",
      body: (
        <p>
          We obtain meaningful consent for the collection, use and disclosure of personal information. We ask for express consent for sensitive
          information, such as Sitter background checks, and for marketing. You may withdraw consent at any time, subject to legal or contractual
          restrictions; we&apos;ll explain the consequences, for example that a booking can&apos;t proceed without a meeting address.
        </p>
      ),
    },
    {
      id: "limiting-collection",
      title: "Limiting collection",
      body: <p>We collect only the information needed for the purposes we have identified, and we collect it by fair and lawful means.</p>,
    },
    {
      id: "limiting-use",
      title: "Limiting use, disclosure and retention",
      body: (
        <p>
          We use and disclose personal information only for the purposes it was collected for, unless you consent or the law requires
          otherwise. We keep it only as long as necessary and securely destroy or anonymise it afterwards.
        </p>
      ),
    },
    {
      id: "accuracy",
      title: "Accuracy",
      body: <p>We keep personal information as accurate, complete and up to date as needed. You can update most details yourself from your account settings.</p>,
    },
    {
      id: "safeguards",
      title: "Safeguards",
      body: (
        <p>
          We protect personal information with security safeguards appropriate to its sensitivity — physical, organisational and technical
          measures such as encryption in transit, role-based access and staff confidentiality obligations.
        </p>
      ),
    },
    {
      id: "openness",
      title: "Openness",
      body: <p>Our privacy policies and practices are available on this site in plain language, and we&apos;ll answer questions about them on request.</p>,
    },
    {
      id: "access",
      title: "Individual access",
      body: (
        <>
          <p>
            Signed-in members can <a href="/account/data-export">download a copy of their data</a> and close their account at any time from{" "}
            <Link href="/account/settings">account settings</Link>. Closing an account deletes your login, photos and contact details and
            anonymises the rest; booking and payment records are kept without your name, as the law requires.
          </p>
          <p>
            You can also make a written request: we&apos;ll tell you whether we hold personal information about you, how it has been used and to
            whom it has been disclosed, and give you access to it — normally within 30 days and at no cost. You can challenge its accuracy and
            ask for corrections.
          </p>
        </>
      ),
    },
    {
      id: "challenging",
      title: "Challenging compliance",
      body: (
        <p>
          You can raise any concern about our compliance with these principles with our Privacy Officer (below). If you&apos;re not satisfied with
          our response, you may contact the{" "}
          <a href="https://www.priv.gc.ca" rel="noopener noreferrer" target="_blank">
            Office of the Privacy Commissioner of Canada
          </a>
          .
        </p>
      ),
    },
    {
      id: "privacy-officer",
      title: "Contact our Privacy Officer",
      body: (
        <div className="bg-surface-container-lowest rounded-2xl border border-[#EFE7DE] p-space-lg flex flex-col gap-space-xs">
          <strong className="font-title-md text-title-md">Privacy Officer, WagStays Technologies Inc.</strong>
          <span>Toronto, Ontario, Canada</span>
          <span>
            Email: <a href={`mailto:${email}?subject=Privacy%20request`}>{email}</a>
          </span>
          <span>Phone: {phone}</span>
          <span className="font-body-sm text-body-sm">Please include &quot;Privacy request&quot; in the subject line and the email address on your account.</span>
        </div>
      ),
    },
  ];

  return (
    <LegalDocument
      current="/pipeda"
      intro={
        <p>
          The <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA) sets out ten fair information principles. This
          notice summarises how WagStays applies each of them.
        </p>
      }
      sections={sections}
      title="PIPEDA Privacy Notice"
    />
  );
}
