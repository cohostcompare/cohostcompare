import type { Metadata } from 'next';
import Link from 'next/link';
import { PARTNER_TERMS_VERSION } from '@/lib/partners';

export const metadata: Metadata = { title: 'Partner agreement', description: 'The agreement for businesses that offer services to owners through CoHostCompare.', alternates: { canonical: '/partners/agreement' } };

const date = new Date(`${PARTNER_TERMS_VERSION}T12:00:00+10:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

export default function PartnerAgreement() {
  return (
    <main className="legal">
      <h1>Partner agreement</h1>
      <p className="hint">Version {PARTNER_TERMS_VERSION} · last updated {date}</p>

      <p>This agreement is between Ben Deeley (ABN 52 679 120 059), a sole trader based in Sydney trading as CoHostCompare (&ldquo;we&rdquo;, &ldquo;us&rdquo;), and the business that applies to list an offer for owners on cohostcompare.com (&ldquo;you&rdquo;, the &ldquo;partner&rdquo;). It starts when you accept it in your partner page, after we&apos;ve approved your application. Our general <Link href="/terms">terms of use</Link> and <Link href="/privacy">privacy policy</Link> also apply.</p>

      <h2>1. What we do</h2>
      <ul>
        <li>We show your offer to property owners in the partner offers on our owner setup guide, labelled as a partner offer, with your business name, logo, offer and any promo code.</li>
        <li>We tell owners whether we earn a referral fee from your offer.</li>
        <li>Owners who are interested click through to the link you give us. We count those clicks and show them to you in your partner page.</li>
        <li>We don&apos;t share owners&apos; names, contact details or property details with you. Owners contact you themselves.</li>
        <li>Partner offers never appear in manager search results or quote comparisons, and never affect which managers owners see.</li>
      </ul>

      <h2>2. Placement</h2>
      <p>We decide where and in what order offers appear, whether partner offers are shown at all, and which owners see them. We don&apos;t promise any number of views, clicks or customers, and partnership isn&apos;t exclusive: we may list other businesses in the same category.</p>

      <h2>3. Your offer</h2>
      <ul>
        <li>Your offer, promo code, prices and any claims you make must be accurate, current and not misleading, and must comply with the Australian Consumer Law.</li>
        <li>You must honour the offer as shown for any owner who takes it up while it&apos;s listed. Keep it up to date in your partner page, and pause or change it before it expires or if you can no longer provide it.</li>
        <li>You must hold any licences, registrations and insurance needed for your services, and provide them with due care and skill.</li>
        <li>You&apos;re responsible for your services and your dealings with owners. We aren&apos;t a party to any agreement between you and an owner.</li>
        <li>Handle any personal information owners give you in line with the Privacy Act 1988 (Cth), and don&apos;t add owners to marketing lists without their consent.</li>
        <li>Don&apos;t describe yourself as endorsed or recommended by CoHostCompare. You can say you&apos;re a CoHostCompare partner while your offer is listed.</li>
      </ul>

      <h2>4. Logos and content</h2>
      <p>You give us a non-exclusive, royalty-free licence to display your business name, logo and offer content on our site and in emails to owners while your offer is listed. You confirm you have the right to grant it. We may edit your offer for length, clarity, accuracy or style, and we&apos;ll tell you about any material change.</p>

      <h2>5. Fees</h2>
      <ul>
        <li>Applying and being listed are free unless your partner page shows agreed commercial terms.</li>
        <li>Any referral fee or other charge is set out in the commercial terms shown in your partner page when you accept this agreement. Changes to those terms only apply once you&apos;ve agreed to them in writing (email is fine).</li>
        <li>Unless the commercial terms say otherwise, referral fees are invoiced monthly in arrears and are payable within 14 days of the invoice. Amounts are in Australian dollars and include GST if we&apos;re registered for GST.</li>
        <li>Where a fee depends on owners taking up your offer, you agree to keep reasonable records (for example, promo code redemptions) and share them with us monthly or when we ask.</li>
      </ul>

      <h2>6. Removing offers and ending the agreement</h2>
      <ul>
        <li>You can pause your offer or end this agreement at any time by emailing hello@cohostcompare.com.</li>
        <li>We can pause or remove your offer, or end this agreement, at any time, including if owners complain, your offer becomes inaccurate, or we stop showing partner offers. We&apos;ll tell you why where we reasonably can.</li>
        <li>Fees for owners who took up your offer before it ended remain payable. Sections 3, 5, 7 and 8 continue after this agreement ends.</li>
      </ul>

      <h2>7. Liability</h2>
      <p>To the extent the law allows, we provide the listing as is, we aren&apos;t liable for any indirect or consequential loss or lost profits, and our total liability under this agreement is limited to the fees you&apos;ve paid us in the 12 months before the claim. You&apos;re responsible for, and will compensate us for, claims by owners or others that arise from your offer, your services or a breach of this agreement, except to the extent we caused them.</p>

      <h2>8. General</h2>
      <ul>
        <li>We may update this agreement. We&apos;ll email you at least 30 days before a change takes effect and ask you to accept the new version in your partner page. If you don&apos;t accept, we may stop showing your offer.</li>
        <li>Nothing in this agreement makes either of us the other&apos;s employee, agent or partner in a legal sense.</li>
        <li>This agreement is governed by the laws of New South Wales.</li>
        <li>Notices can be sent by email: to you at the email in your partner listing, and to us at <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a>.</li>
      </ul>
    </main>
  );
}
