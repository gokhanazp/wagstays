import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getPlatformSettings } from "@/lib/settings";
import { LegalDocument, type LegalSection } from "../terms/_components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How WagStays collects, uses, shares and protects personal information.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const { supportEmail: email, supportPhone: phone } = await getPlatformSettings();

  const sections: LegalSection[] = [
    {
      id: "scope",
      title: "Who we are and what this covers",
      body: (
        <p>
          This Privacy Policy explains how <strong>WagStays Technologies Inc.</strong> (&quot;WagStays&quot;) handles personal information when you
          use our website and apps. We comply with Canada&apos;s <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA). Our{" "}
          <Link href="/pipeda">PIPEDA Privacy Notice</Link> summarises how we apply its ten fair information principles.
        </p>
      ),
    },
    {
      id: "collect",
      title: "Information we collect",
      body: (
        <>
          <p><strong>Information you give us</strong></p>
          <ul>
            <li>Account details: name, email, phone number, password and profile photo.</li>
            <li>Pet profiles: name, species, breed, age, care notes, vaccination and microchip details.</li>
            <li>Booking details: dates, addresses, emergency and veterinary contacts, and messages with Sitters.</li>
            <li>For Sitters: government-issued photo ID, Police Vulnerable Sector Check results, certifications, home photos and payout details.</li>
          </ul>
          <p><strong>Information collected automatically</strong></p>
          <ul>
            <li>Device and usage information, such as browser type, pages viewed and approximate location.</li>
            <li>GPS walk routes when a Sitter shares live updates during a booking.</li>
            <li>Cookies needed to keep you signed in and remember your preferences.</li>
          </ul>
          <p>Card numbers are handled by our payment processor; WagStays only stores the card brand and last four digits.</p>
        </>
      ),
    },
    {
      id: "use",
      title: "How we use it",
      body: (
        <ul>
          <li>To create and run your account, and to show Sitter profiles and search results.</li>
          <li>To process bookings, payments, refunds and WagPoints.</li>
          <li>To verify Sitters and keep the community safe, including fraud prevention.</li>
          <li>To provide customer support and send service messages about your bookings.</li>
          <li>With your consent, to send The Monthly Wag newsletter and offers. You can unsubscribe at any time.</li>
          <li>To improve the Platform using aggregated or de-identified data.</li>
        </ul>
      ),
    },
    {
      id: "share",
      title: "How we share it",
      body: (
        <>
          <p>We don&apos;t sell your personal information. We share it only as needed:</p>
          <ul>
            <li><strong>Between Owners and Sitters</strong> for a booking — for example a Sitter sees your first name, pet details and the meeting address.</li>
            <li><strong>Service providers</strong> who act on our behalf (hosting, payments, background checks, email) under contracts that protect your information.</li>
            <li><strong>Legal reasons</strong>, when required by law or to protect the safety of people or animals.</li>
            <li><strong>Business transfers</strong>, such as a merger, subject to this policy.</li>
          </ul>
        </>
      ),
    },
    {
      id: "transfers",
      title: "Storage and cross-border transfers",
      body: (
        <p>
          Some of our service providers may store or process information outside your province or outside Canada, including in the United
          States. When that happens, your information may be accessible to courts and authorities in those countries. We use contractual and
          technical safeguards to protect it.
        </p>
      ),
    },
    {
      id: "retention",
      title: "How long we keep it",
      body: (
        <p>
          We keep personal information only as long as needed for the purposes above or as required by law (for example tax records). Sitter
          verification documents are deleted or archived once they are no longer required. When you close your account, we delete or
          anonymise your information straight away, except where we must keep it (such as booking and payment records).
        </p>
      ),
    },
    {
      id: "security",
      title: "Security",
      body: (
        <p>
          We use safeguards appropriate to the sensitivity of the information, including encryption in transit, access controls and staff
          training. No system is perfectly secure; if a breach creates a real risk of significant harm, we will notify you and the Office of the
          Privacy Commissioner of Canada as required by law.
        </p>
      ),
    },
    {
      id: "rights",
      title: "Your choices and rights",
      body: (
        <ul>
          <li>
            Access and correct your information from your <Link href="/account/settings">account settings</Link>. You can{" "}
            <a href="/account/data-export">download a copy of your data</a> (a JSON file) at any time, or ask us for one.
          </li>
          <li>Withdraw consent to marketing at any time; some processing is needed to provide the service.</li>
          <li>
            Close your account yourself from <Link href="/account/settings">account settings</Link>. We delete your login, photos and contact
            details and anonymise the rest; past bookings and payments are kept without your name as a financial record, and reviews you
            wrote stay up as &quot;Former member&quot;.
          </li>
          <li>Complain to the Office of the Privacy Commissioner of Canada if you&apos;re not satisfied with our response.</li>
        </ul>
      ),
    },
    {
      id: "children",
      title: "Children",
      body: <p>WagStays is intended for adults. We don&apos;t knowingly collect personal information from anyone under 18.</p>,
    },
    {
      id: "contact",
      title: "Changes and contact",
      body: (
        <>
          <p>We&apos;ll post any changes here and update the date above. For material changes we&apos;ll also notify you by email or in the app.</p>
          <p>
            Questions or requests: our Privacy Officer at <a href={`mailto:${email}`}>{email}</a> or {phone}.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalDocument
      current="/privacy"
      intro={<p>Your trust matters — you&apos;re letting us into your home and your pet&apos;s life. Here&apos;s what we collect, why, and the choices you have.</p>}
      sections={sections}
      title="Privacy Policy"
    />
  );
}
