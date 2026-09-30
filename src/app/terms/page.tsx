import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms of use', description: 'The terms for using CoHostCompare, for property owners and short-term rental managers.' };

export default function Terms() {
  return (
    <main className="legal">
      <h1>Terms of use</h1>
      <p className="hint">Last updated 30 September 2026</p>

      <p>These terms apply when you use cohostcompare.com. CoHostCompare is run by Ben Deeley (ABN 52 679 120 059), a sole trader based in Sydney, trading as CoHostCompare (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using the site you agree to these terms. Our <Link href="/privacy">privacy policy</Link> explains how we handle personal information.</p>

      <h2>1. What CoHostCompare is</h2>
      <p>CoHostCompare is a comparison and introduction service. It helps property owners find short-term rental managers who operate near their property, compare them, and request quotes. We aren&apos;t a property manager, real estate agent or booking platform. We aren&apos;t a party to any agreement between an owner and a manager, and we don&apos;t guarantee any manager&apos;s services, availability or results.</p>

      <h2>2. Information on the site</h2>
      <ul>
        <li>Manager profiles combine information from public sources, including estimates derived from public listing data (data source: AirROI), with information managers add themselves. Figures such as ratings, home counts, occupancy and nightly rates are estimates and may be out of date.</li>
        <li>Fees are shown only where a manager publishes or provides them. Quotes, revenue estimates and terms come from the manager, not from us. Check them directly with the manager before you sign anything.</li>
        <li>Our rules guide and rules question tool give general information, not legal, tax or financial advice. Answers to questions are generated automatically from our guide and may be incomplete. Always confirm the rules with your council, state government and strata or owners corporation.</li>
        <li>We present every manager on the same basis. Labels such as &ldquo;lowest fees&rdquo; are factual comparisons of the information provided, not recommendations. If we ever show paid or featured placements, they&apos;ll be clearly labelled and won&apos;t change a manager&apos;s ratings or the quote comparison.</li>
      </ul>

      <h2>3. Your account</h2>
      <p>You sign in with a one-time link sent to your email. Keep access to your email secure, and give accurate details. You must be at least 18 to use the site. We can suspend or close accounts that break these terms.</p>

      <h2>4. For property owners</h2>
      <ul>
        <li>The service is free for owners. There&apos;s no obligation to accept any quote.</li>
        <li>You can send a quote request to up to five managers who operate near the property. Only request quotes for a property you own or are authorised to act for.</li>
        <li>Your full contact details go to a manager only if you accept their quote. Accepting a quote isn&apos;t a contract: any agreement is made directly between you and the manager, on their terms.</li>
      </ul>

      <h2>5. For managers</h2>
      <ul>
        <li>Listing and replying to quote requests is free during our launch period. We&apos;ll give you at least 30 days&apos; notice before introducing any paid features, and they&apos;ll be optional.</li>
        <li>To claim a profile you must be authorised to act for that business. We may ask for evidence before approving a claim.</li>
        <li>Information you add must be accurate and not misleading, including fees, services and credentials. You must hold any licence your state requires for the services you offer.</li>
        <li>You must only upload logos and photos you own or have permission to use, and you give us a licence to display them on the site for as long as they&apos;re on your profile.</li>
        <li>Use owners&apos; details only to respond to their request and provide the services they ask about, and handle them in line with privacy law. Don&apos;t add owners to marketing lists without their consent.</li>
        <li>You can ask us to remove your business&apos;s profile at any time by emailing <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a>.</li>
      </ul>

      <h2>6. Acceptable use</h2>
      <p>Don&apos;t misuse the site. That includes sending spam or abusive messages, impersonating others, scraping or copying data from the site, interfering with its security or operation, or using it for anything unlawful. We can remove content and restrict access where we reasonably believe these terms have been broken.</p>

      <h2>7. Our content</h2>
      <p>The site&apos;s design, text, comparison data and software belong to us or our licensors. You may use the site for your own purposes, but not reproduce or resell its content or data.</p>

      <h2>8. Liability</h2>
      <p>Nothing in these terms excludes rights you have under the Australian Consumer Law that can&apos;t be excluded. To the extent the law allows, we provide the site as is, we aren&apos;t liable for the acts or omissions of managers or owners, or for decisions made using information on the site, and our liability for any claim relating to the site is limited to resupplying the service.</p>

      <h2>9. Changes and contact</h2>
      <p>We may update these terms, and we&apos;ll show the date of the latest change at the top. These terms are governed by the laws of New South Wales. Questions or complaints: <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a>.</p>
    </main>
  );
}
