import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { getPlatformSettings } from "@/lib/settings";
import { LegalDocument, type LegalSection } from "./_components/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use WagStays to find, book or work as a pet sitter in Canada.",
};

export default async function TermsPage() {
  const s = await getPlatformSettings();
  const email = s.supportEmail;

  const sections: LegalSection[] = [
    {
      id: "about",
      title: "About these terms",
      body: (
        <>
          <p>
            These Terms of Service (the &quot;Terms&quot;) form an agreement between you and <strong>WagStays Technologies Inc.</strong>{" "}
            (&quot;WagStays&quot;, &quot;we&quot;, &quot;us&quot;), a corporation based in Toronto, Ontario. They apply to our website, apps and
            related services (the &quot;Platform&quot;).
          </p>
          <p>By creating an account or making a booking you agree to these Terms and to our <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use the Platform.</p>
        </>
      ),
    },
    {
      id: "marketplace",
      title: "WagStays is a marketplace",
      body: (
        <>
          <p>
            WagStays connects pet parents (&quot;Owners&quot;) with independent pet care providers (&quot;Sitters&quot;). Sitters are independent
            contractors, not employees or agents of WagStays. Each booking is a contract directly between the Owner and the Sitter; WagStays
            provides the tools to find, book, pay and communicate.
          </p>
          <p>We verify Sitters as described on our site (for example government-issued photo ID and a Police Vulnerable Sector Check), but we don&apos;t guarantee the quality, safety or legality of any service.</p>
        </>
      ),
    },
    {
      id: "accounts",
      title: "Accounts and eligibility",
      body: (
        <ul>
          <li>You must be at least 18 years old and able to enter into a binding contract in your province or territory.</li>
          <li>Keep your account details accurate and your password confidential. You&apos;re responsible for activity on your account.</li>
          <li>One person, one account. We may suspend accounts that are fake, duplicated or used in breach of these Terms.</li>
        </ul>
      ),
    },
    {
      id: "bookings",
      title: "Bookings, payments and fees",
      body: (
        <>
          <p>
            Prices are set by Sitters and are shown in Canadian dollars <strong>before tax</strong>. Applicable sales tax (for example 13% HST in
            Ontario) appears as a separate line at checkout. Each booking also includes a WagStays service fee (currently{" "}
            {formatMoney(s.serviceFeeCents, { exact: true })}) and WagShield Protection (currently {formatMoney(s.wagShieldFeeCents, { exact: true })}).
          </p>
          <p>
            Payments are processed by our payment partner using Secure Hold Payments: your card is authorised when you book, charged once the
            Sitter accepts, and funds are released to the Sitter after the service is completed.
          </p>
          <p>WagPoints are promotional credits with no cash value. They can&apos;t be transferred or redeemed for cash and may expire.</p>
        </>
      ),
    },
    {
      id: "cancellations",
      title: "Cancellations and refunds",
      body: (
        <>
          <p>
            Owners may cancel a pending request at any time at no cost. Cancellation terms for confirmed bookings are shown before you pay. If a
            Sitter cancels a confirmed booking, you receive a full refund and any WagPoints used are returned.
          </p>
          <p>Nothing in these Terms limits any rights you have under the Ontario <em>Consumer Protection Act, 2002</em> or other applicable consumer protection law.</p>
        </>
      ),
    },
    {
      id: "conduct",
      title: "Your responsibilities",
      body: (
        <>
          <p>
            <strong>Owners</strong> agree to describe their pets honestly (including health, behaviour and vaccination status), keep pets
            licensed where required by local by-laws, and provide emergency and veterinary contacts.
          </p>
          <p>
            <strong>Sitters</strong> agree to provide services with reasonable care and skill, follow the Owner&apos;s care instructions, comply with
            local by-laws (for example leash and stoop-and-scoop rules) and keep their verification documents up to date.
          </p>
          <p>Everyone agrees not to:</p>
          <ul>
            <li>take payments or arrange bookings off the Platform for people met through WagStays;</li>
            <li>harass, discriminate against or threaten other users;</li>
            <li>post false, misleading or infringing content, including fake reviews;</li>
            <li>misuse messaging, for example by sending spam or sharing someone else&apos;s personal information.</li>
          </ul>
        </>
      ),
    },
    {
      id: "messaging",
      title: "Messages and reviews",
      body: (
        <p>
          Use WagStays messaging to discuss bookings. To protect the community, we may review messages that are reported to us or flagged by
          automated safety tools. Reviews must reflect a genuine experience. We may remove content that breaks these Terms.
        </p>
      ),
    },
    {
      id: "wagshield",
      title: "WagShield Protection",
      body: (
        <p>
          WagShield Protection may reimburse eligible veterinary costs up to {formatMoney(s.vetCoverageCents)} per booking, subject to the
          WagShield terms, exclusions and claim process published separately. WagShield is not an insurance policy and does not replace your
          own pet or liability insurance.
        </p>
      ),
    },
    {
      id: "liability",
      title: "Disclaimers and limitation of liability",
      body: (
        <>
          <p>
            The Platform is provided &quot;as is&quot;. To the extent permitted by law, WagStays is not liable for indirect or consequential losses,
            or for the acts or omissions of Owners and Sitters. Our total liability to you for any claim is limited to the fees you paid to
            WagStays for the booking concerned in the previous 12 months.
          </p>
          <p>Some jurisdictions do not allow these limits, so they may not apply to you.</p>
        </>
      ),
    },
    {
      id: "termination",
      title: "Suspension and termination",
      body: (
        <p>
          You can close your account at any time from your account settings or by contacting us. We may suspend or close accounts that breach
          these Terms, put pets or people at risk, or are required to be closed by law. Bookings already in progress will be handled fairly.
        </p>
      ),
    },
    {
      id: "law",
      title: "Governing law and disputes",
      body: (
        <p>
          These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada that apply there. Please contact us
          first so we can try to resolve any issue informally; otherwise disputes will be heard by the courts of Ontario, sitting in Toronto,
          unless your local consumer protection law gives you the right to bring a claim where you live.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes and contact",
      body: (
        <>
          <p>
            We may update these Terms from time to time. If a change is material, we will notify you by email or in the app at least 30 days
            before it takes effect.
          </p>
          <p>
            Questions? Email <a href={`mailto:${email}`}>{email}</a> or call {s.supportPhone}.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalDocument
      current="/terms"
      intro={<p>Please read these terms carefully. They explain how WagStays works, what we expect from Owners and Sitters, and your rights if something goes wrong.</p>}
      sections={sections}
      title="Terms of Service"
    />
  );
}
