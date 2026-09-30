import type { Metadata } from 'next';
import Link from 'next/link';
import { SOCIAL } from '@/lib/social';

export const metadata: Metadata = {
  title: 'About CoHostCompare',
  description: 'Who runs CoHostCompare, how it makes money, and how to contact us. An independent Australian business, ABN 52 679 120 059.',
  alternates: { canonical: '/about' },
};

export default function About() {
  return (
    <main className="legal">
      <span className="label" style={{ color: 'var(--brand)' }}>About us</span>
      <h1>An independent way to compare short-term rental managers</h1>
      <p>CoHostCompare helps Australian property owners find and compare the managers who run short-stay homes near them, then request quotes from up to five in one standard format. It&apos;s free for owners, and no manager can pay to rank higher or change their rating.</p>

      <h2>Who we are</h2>
      <p>CoHostCompare was founded in 2026 by Ben Deeley in Sydney. Ben built it after seeing how hard it is for owners to compare managers: fees are hidden behind sales calls, and every manager describes their service differently.</p>
      <p>We&apos;re not a property manager, real estate agent or booking platform, and we don&apos;t manage any homes ourselves.</p>

      <h2>Business details</h2>
      <ul>
        <li>Trading name: CoHostCompare</li>
        <li>Run by Ben Deeley, sole trader, ABN 52 679 120 059 (<a href="https://abr.business.gov.au/ABN/View?abn=52679120059">check it on the ABN Lookup</a>)</li>
        <li>Based in Sydney, NSW. We work online and don&apos;t have a shopfront.</li>
        <li>Email: <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a></li>
      </ul>

      <h2>How we make money</h2>
      <p>Owners never pay. Managers can list, receive quote requests and reply for free, and can choose paid plans with extra tools for their business. Payments never affect where a manager appears, their ratings or how quotes are compared. <Link href="/managers#pricing">See manager pricing</Link>.</p>

      <h2>Where our information comes from</h2>
      <p>Manager figures come from public listing data (data source: AirROI) and from managers&apos; own websites, measured the same way for everyone. Our rules guide uses official government and council sources only. <Link href="/managers#why-listed">How we build manager profiles</Link>.</p>

      {SOCIAL.length > 0 && (
        <>
          <h2>Find us elsewhere</h2>
          <ul>{SOCIAL.map((s) => <li key={s.url}><a href={s.url} rel="me noopener">{s.name}</a></li>)}</ul>
        </>
      )}
    </main>
  );
}
