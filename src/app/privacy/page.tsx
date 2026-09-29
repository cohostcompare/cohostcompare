import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function Privacy() {
  return (
    <main style={{ maxWidth: 720, paddingBlock: '16px 48px' }}>
      <h1 style={{ fontSize: 'clamp(30px,5vw,40px)', marginBottom: 8 }}>Privacy policy</h1>

  <p className="hint">Last updated 29 September 2026</p>

  <p>CoHostCompare helps Australian property owners find and compare short-term rental managers. This policy explains what personal information we collect before launch, why, and what you can ask us to do with it. We handle personal information in line with the Australian Privacy Principles.</p>

  <h2>What we collect</h2>
  <ul>
    <li><b>Property owners on the waitlist:</b> your email address, your property&apos;s postcode, and where you&apos;re at (already hosting, ready to start, or thinking about buying).</li>
    <li><b>Managers on the waitlist:</b> your business name, work email, the postcodes you service, and roughly how many properties you manage.</li>
    <li><b>Technical details:</b> the website address you signed up from. We don&apos;t use advertising trackers.</li>
  </ul>

  <h2>Why we collect it</h2>
  <p>To tell you when CoHostCompare opens in your area, to set up managers&apos; profiles before launch, and to understand where demand is so we open in the right places first. We only email you about CoHostCompare.</p>

  <h2>Who we share it with</h2>
  <p>We don&apos;t sell your information or share it with managers or anyone else for marketing. It&apos;s stored with our service providers, who process it only for us: Supabase (database, hosted in Sydney), Vercel (website hosting) and Google Workspace (email).</p>

  <h2>How long we keep it</h2>
  <p>Until you ask us to remove it, or until we no longer need it for the purposes above.</p>

  <h2>Your choices</h2>
  <p>You can unsubscribe from any email, and you can ask us to show you, correct or delete the information we hold about you. Email us at <b>hello@cohostcompare.com</b> and we&apos;ll respond within 30 days.</p>

  <h2>Complaints</h2>
  <p>If you&apos;re unhappy with how we&apos;ve handled your information, email us first. If we don&apos;t resolve it, you can contact the Office of the Australian Information Commissioner at <a href="https://www.oaic.gov.au">oaic.gov.au</a>.</p>

  <h2>Changes</h2>
  <p>We&apos;ll update this page when the product launches and we start collecting more, such as enquiries between owners and managers. The date at the top shows when it last changed.</p>

  
    </main>
  );
}
