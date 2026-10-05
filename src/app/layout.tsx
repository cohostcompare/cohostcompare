import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Link from 'next/link';
import './globals.css';
import GoogleTag from '@/components/GoogleTag';
import TrafficBeacon from '@/components/TrafficBeacon';
import NavProgress from '@/components/NavProgress';
import { Suspense } from 'react';
import { ORG_JSONLD, SOCIAL } from '@/lib/social';
import SiteMenu, { NavLink, NavMore } from '@/components/SiteMenu';
import { AdminSlot, FeedbackSlot, ManagerSlot, OwnerSlot } from '@/components/UserNav';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cohostcompare.com'),
  title: { default: 'CoHostCompare', template: '%s · CoHostCompare' },
  description: 'Compare the Airbnb and short-term rental managers who cover your property in Australia: fees, guest ratings and homes nearby, side by side. Free for owners, no paid rankings.',
  icons: { icon: '/favicon.svg' },
  openGraph: { type: 'website', siteName: 'CoHostCompare', locale: 'en_AU' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        <meta name="color-scheme" content="light" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <Suspense fallback={null}><NavProgress /></Suspense>
        <div className="site-header">
          <header className="top wrap wide">
            <Link className="logo" href="/" aria-label="CoHostCompare home">
              <svg width="30" height="30" viewBox="0 0 34 34" aria-hidden="true"><path className="solid" d="M3 16 L12 8 L21 16 V28 H3 Z" /><path className="outline" d="M13 16 L22 8 L31 16 V28 H13 Z" /></svg>
              CoHostCompare
            </Link>
            <SiteMenu>
                <div className="menu-group owners">
                  <NavLink href="/" also={['/search', '/managers/']}>Compare managers</NavLink>
                  <NavLink href="/earnings" highlight><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.7 0-2.8.8-2.8 2s1 1.7 2.8 2 2.8.8 2.8 2-1.1 2-2.8 2c-1.3 0-2.4-.5-2.9-1.3M12 6.5V8m0 8v1.5" /></svg>What could I earn?</NavLink>
                  <NavMore label="How it works" items={[{ href: '/how-it-works', label: 'How it works' }, { href: '/why-us', label: 'Why use us' }, { href: '/setup', label: 'Setting up your rental' }, { href: '/areas', label: 'Browse by area' }]} />
                  <NavLink href="/rules"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" /><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /><path d="M9 8h7M9 12h5" /></svg>Rules in my area</NavLink>
                  <OwnerSlot />
                </div>
                <div className="menu-group managers">
                  <span className="menu-label">For managers</span>
                  <NavLink href="/managers" exact><span className="wide-only">For managers</span><span className="narrow-only">How it works for managers</span></NavLink>
                  <ManagerSlot />
                </div>
                <AdminSlot />
            </SiteMenu>
          </header>
        </div>
        <div className="wrap">
          {children}
          <footer className="site">
            <span>© 2026 CoHostCompare · ABN 52 679 120 059</span>
            <span><Link href="/how-it-works">How it works</Link> · <Link href="/why-us">Why use us</Link> · <Link href="/setup">Setting up your rental</Link> · <Link href="/rules">Rules in my area</Link> · <Link href="/guides">Guides</Link> · <Link href="/earnings">What could I earn?</Link> · <Link href="/areas">Areas</Link> · <Link href="/directory">All managers</Link> · <Link href="/managers">For managers</Link> · <Link href="/partners">Partner with us</Link> · <Link href="/about">About</Link> · <Link href="/facts">Market facts</Link> · <Link href="/feedback">Feedback</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
            <span>Made in Sydney · hello@cohostcompare.com{SOCIAL.map((x) => <span key={x.url}> · <a href={x.url} rel="me noopener">{x.name}</a></span>)}</span>
          </footer>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }} />
        <Analytics />
        <GoogleTag />
        <TrafficBeacon />
        <FeedbackSlot />
      </body>
    </html>
  );
}
