import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Privacy policy', description: 'How CoHostCompare collects, uses and protects personal information.' };

export default function Privacy() {
  return (
    <main className="legal">
      <h1>Privacy policy</h1>
      <p className="hint">Last updated 30 September 2026</p>

      <p>CoHostCompare helps Australian property owners compare short-term rental managers and request quotes from them. It is run by Ben Deeley, a sole trader based in Sydney, trading as CoHostCompare (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what personal information we collect, why, who we share it with, and your choices. We handle personal information in line with the Australian Privacy Principles in the <i>Privacy Act 1988</i> (Cth).</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Your account:</b> your email address, used to sign you in with a one-time email link. We don&apos;t store passwords.</li>
        <li><b>Quote requests (owners):</b> your name, email, phone number (optional), the property&apos;s address and location, property type, bedrooms, what help you want, timing and any notes you add.</li>
        <li><b>Messages and quotes:</b> messages between you and managers, and the quotes managers send.</li>
        <li><b>Managers:</b> the name, email and phone of people who claim or run a manager profile, and anything they add to it (fees, services, logo and photos).</li>
        <li><b>Questions about the rules:</b> the questions you type into our rules tool. Don&apos;t include personal details in them.</li>
        <li><b>Technical information:</b> basic, cookie-free visit statistics (pages viewed, device type, country), and security logs such as IP addresses. We use a sign-in cookie to keep you signed in. We don&apos;t use advertising trackers.</li>
        <li><b>Waitlist:</b> if you joined our waitlist, the details you gave then.</li>
      </ul>

      <h2>Information about managers from public sources</h2>
      <p>Manager profiles are built from public information about businesses, including their websites and estimates derived from public short-term rental listings (data source: AirROI). We only create profiles for identifiable businesses, not private individuals. Figures are shown as estimates and are aggregated across a manager&apos;s homes; we never show individual listings or guests. A manager can claim their profile to correct it, or ask us to remove it by emailing <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a>.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To run the service: show managers near an address, send your quote requests, deliver quotes and messages, and email you about them.</li>
        <li>To send reminders about requests and quotes you have open. You can ask us to stop these.</li>
        <li>To keep the service safe, fix problems and understand, in aggregate, how it&apos;s used.</li>
        <li>To respond to you when you contact us.</li>
      </ul>
      <p>We don&apos;t sell personal information, and we don&apos;t use it for third-party advertising.</p>

      <h2>What managers see</h2>
      <p>When you request a quote, each manager you chose sees your first name, your suburb and postcode, and your property details. Your full name, email, phone number and street address are shared with a manager only if you accept their quote. Anything you write in a message is seen by that manager.</p>

      <h2>Who else we share it with</h2>
      <p>We use trusted service providers who process information only on our behalf:</p>
      <ul>
        <li>Supabase: database and sign-in (hosted in Sydney, Australia).</li>
        <li>Vercel: website hosting and visit statistics (servers may be outside Australia, including the United States).</li>
        <li>Resend and Google Workspace: sending and receiving email (United States).</li>
        <li>Google Maps: address search and maps. Google receives what you type into the address box.</li>
        <li>Anthropic: answers questions typed into our rules tool (United States). Questions aren&apos;t linked to your account.</li>
      </ul>
      <p>Where information is stored or processed overseas, we take reasonable steps to make sure it&apos;s handled consistently with the Australian Privacy Principles. We may also disclose information where the law requires it.</p>

      <h2>How long we keep it</h2>
      <p>We keep your account, requests and messages while your account is open, and for up to two years after your last activity so both you and the manager can refer back to them. You can ask us to delete them sooner.</p>

      <h2>Security</h2>
      <p>Information is stored with access controls and encrypted connections. No system is perfectly secure, so if we become aware of a data breach likely to cause serious harm, we&apos;ll tell affected people and the Office of the Australian Information Commissioner as required by law.</p>

      <h2>Your choices</h2>
      <p>You can ask us to show you, correct or delete the personal information we hold about you, or to stop sending you reminders. Email <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a> and we&apos;ll respond within 30 days.</p>

      <h2>Complaints</h2>
      <p>If you&apos;re unhappy with how we&apos;ve handled your information, email us first. If we don&apos;t resolve it, you can contact the Office of the Australian Information Commissioner at <a href="https://www.oaic.gov.au">oaic.gov.au</a>.</p>

      <h2>Changes</h2>
      <p>We&apos;ll update this page when our practices change. The date at the top shows when it last changed. See also our <Link href="/terms">terms of use</Link>.</p>
    </main>
  );
}
