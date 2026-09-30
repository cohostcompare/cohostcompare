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
        <li>Manager profiles combine information from public sources, including estimates derived from public listing data (data source: AirROI), with information managers add themselves. Figures such as ratings, home counts and nightly rates are estimates and may be out of date.</li>
        <li>Fees are shown only where a manager publishes or provides them. Quotes, revenue estimates and terms come from the manager, not from us. Check them directly with the manager before you sign anything.</li>
        <li>Our rules guide and rules question tool give general information, not legal, tax or financial advice. Answers to questions are generated automatically from our guide and may be incomplete. Always confirm the rules with your council, state government and strata or owners corporation.</li>
        <li>We present every manager on the same basis. Labels such as &ldquo;lowest fees&rdquo; are factual comparisons of the information provided, not recommendations. We don&apos;t sell placement. No manager can pay to appear higher in results, change their ratings or badges, or change how quotes are compared, and owners can&apos;t see which managers are on a paid plan.</li>
        <li>We may show offers from partner businesses, such as insurers or photographers, on pages about setting up a rental. They&apos;re always labelled as partner offers, we may be paid if you use them, and they never appear in manager results or quote comparisons.</li>
      </ul>

      <h2>3. Your account</h2>
      <p>You sign in with a one-time link sent to your email or with your Google account. Keep access to your email secure, and give accurate details. You must be at least 18 to use the site. We can suspend or close accounts that break these terms.</p>

      <h2>4. For property owners</h2>
      <ul>
        <li>The service is free for owners. There&apos;s no obligation to accept any quote.</li>
        <li>You can send a quote request to up to five managers who operate near the property. Only request quotes for a property you own or are authorised to act for.</li>
        <li>Your full contact details go to a manager only if you accept their quote. Accepting a quote isn&apos;t a contract: any agreement is made directly between you and the manager, on their terms.</li>
      </ul>

      <h2>5. For managers</h2>
      <ul>
        <li>Your profile, quote requests and replying to owners are free, with no lead fees. Paid plans are optional (see section 6).</li>
        <li>To claim a profile you must be authorised to act for that business. We may ask for evidence before approving a claim.</li>
        <li>Information you add must be accurate and not misleading, including fees, services and credentials. You must hold any licence your state requires for the services you offer.</li>
        <li>You must only upload logos and photos you own or have permission to use, and you give us a licence to display them on the site for as long as they&apos;re on your profile.</li>
        <li>Use owners&apos; details only to respond to their request and provide the services they ask about, and handle them in line with privacy law. Don&apos;t add owners to marketing lists without their consent.</li>
        <li>You can ask us to remove your business&apos;s profile at any time by emailing <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a>.</li>
      </ul>

      <h2 id="paid-plans">6. Paid plans for managers (Pro and Enterprise)</h2>
      <ul>
        <li><b>Optional.</b> Pro and Enterprise add tools for your business, such as benchmarks, owner demand, extra photos, suburb reports and integrations. The free features stay free if you don&apos;t subscribe.</li>
        <li><b>Neutral.</b> A paid plan never changes where you appear in results, your ratings or badges, or how quotes are compared, and owners can&apos;t see who has one.</li>
        <li><b>Founding offer.</b> If you claim your profile by 31 January 2027, you get Pro free for three months from the day your claim is approved. You don&apos;t need to give card details, and the free period ends automatically. We&apos;ll only charge you if you choose to subscribe.</li>
        <li><b>Prices and invoices.</b> Prices are shown on the site in Australian dollars and exclude GST unless stated. We&apos;ll send you a tax invoice for every payment. Enterprise pricing and terms may be set out in a written order form or agreement, which takes priority over these terms if they differ.</li>
        <li><b>Billing and renewal.</b> Paid plans are billed in advance, monthly or yearly, and renew automatically at the end of each period until you cancel. We&apos;ll confirm the price and billing period with you before your first charge.</li>
        <li><b>Cancelling.</b> You can cancel at any time from your dashboard or by emailing us. Cancelling stops the next renewal, and you keep the paid features until the end of the period you&apos;ve paid for. We don&apos;t refund part-periods unless the Australian Consumer Law requires it.</li>
        <li><b>Launch pricing.</b> If you subscribe while launch prices are shown on the site, your price for that plan is fixed for 12 months from your first payment.</li>
        <li><b>Changes.</b> We&apos;ll give you at least 30 days&apos; notice by email before a price rise or before removing a significant paid feature, and you can cancel before it takes effect. If we remove a significant feature you&apos;ve paid for in advance, we&apos;ll refund the unused part of that period on request.</li>
        <li><b>Unpaid accounts.</b> If a payment fails and isn&apos;t fixed within 14 days, we may move your account back to the free plan.</li>
        <li><b>Insights and reports.</b> Benchmarks, owner demand figures and suburb reports are estimates based on activity on our site and third-party data (data source: AirROI). They&apos;re for your own business use. Don&apos;t publish, resell or pass them on, except that you can share them within your business and with your own clients if you name CoHostCompare and AirROI as the sources. Other managers&apos; individual quotes are never shown.</li>
        <li><b>SMS alerts.</b> If you turn on text alerts, we&apos;ll text the mobile you give us about quote requests and accepted quotes only. You can turn them off at any time. Delivery depends on phone networks, so check your dashboard or email too.</li>
        <li><b>API and integrations (Enterprise).</b> Keep your API keys secure and use the API only for your own business. Owner information you receive through the API or integrations is covered by the same rules as in section 5, including privacy law. We may set usage limits, and we may suspend API access if it&apos;s misused or puts the site at risk.</li>
      </ul>

      <h2>7. Acceptable use</h2>
      <p>Don&apos;t misuse the site. That includes sending spam or abusive messages, impersonating others, scraping or copying data from the site, interfering with its security or operation, or using it for anything unlawful. We can remove content and restrict access where we reasonably believe these terms have been broken.</p>

      <h2>8. Our content</h2>
      <p>The site&apos;s design, text, comparison data and software belong to us or our licensors. You may use the site for your own purposes, but not reproduce or resell its content or data.</p>

      <h2>9. Liability</h2>
      <p>Nothing in these terms excludes rights you have under the Australian Consumer Law that can&apos;t be excluded. To the extent the law allows, we provide the site as is, we aren&apos;t liable for the acts or omissions of managers or owners, or for decisions made using information on the site, and our liability for any claim relating to the site is limited to resupplying the service or, for a paid plan, refunding the fees you paid for the period affected.</p>

      <h2>10. Changes and contact</h2>
      <p>We may update these terms, and we&apos;ll show the date of the latest change at the top. These terms are governed by the laws of New South Wales. Questions or complaints: <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a>.</p>
    </main>
  );
}
