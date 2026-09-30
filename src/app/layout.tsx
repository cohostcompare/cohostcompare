import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import Link from 'next/link';
import './globals.css';
import AccountMenu from '@/components/AccountMenu';
import SiteMenu, { NavLink } from '@/components/SiteMenu';
import { isAdminEmail } from '@/lib/admin';
import { adminClient, currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cohostcompare.com'),
  title: { default: 'CoHostCompare', template: '%s · CoHostCompare' },
  description: 'Compare every short-term rental manager for your property: fees side by side, every platform, verified ratings.',
  icons: { icon: '/favicon.svg' },
  openGraph: { type: 'website', siteName: 'CoHostCompare', locale: 'en_AU' },
  twitter: { card: 'summary_large_image' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  const isManager = user ? Boolean((await adminClient().from('manager_members').select('manager_id', { count: 'exact', head: true }).eq('user_id', user.id).then((r) => r.count, () => 0))) : false;
  let unread = 0;
  if (user) {
    try {
      const db = adminClient();
      const { data: ts } = await db.from('quote_request_managers').select('id, quote_requests!inner(owner_id)').eq('quote_requests.owner_id', user.id);
      const ids = (ts || []).map((t) => t.id);
      if (ids.length) unread = (await db.from('messages').select('id', { count: 'exact', head: true }).in('thread_id', ids).eq('read_by_owner', false).neq('sender', 'owner')).count ?? 0;
    } catch { /* badge is optional */ }
  }
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <div className="site-header">
          <header className="top wrap wide">
            <Link className="logo" href="/" aria-label="CoHostCompare home">
              <svg width="30" height="30" viewBox="0 0 34 34" aria-hidden="true"><path className="solid" d="M3 16 L12 8 L21 16 V28 H3 Z" /><path className="outline" d="M13 16 L22 8 L31 16 V28 H13 Z" /></svg>
              CoHostCompare
            </Link>
            <SiteMenu>
                <div className="menu-group owners">
                  <NavLink href="/" also={['/search', '/managers/']}>Compare managers</NavLink>
                  <NavLink href="/how-it-works">How it works</NavLink>
                  <NavLink href="/why-us">Why use us</NavLink>
                  <NavLink href="/rules"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>Ask about rules</NavLink>
                  {user ? <AccountMenu email={user.email || ''} unread={unread} /> : <><NavLink href="/signin" exact>Sign in</NavLink><Link className="btn primary small" href="/signin?mode=signup">Join free</Link></>}
                </div>
                <div className="menu-group managers">
                  <span className="menu-label">For managers</span>
                  <NavLink href="/managers" exact><span className="wide-only">For managers</span><span className="narrow-only">How it works for managers</span></NavLink>
                  <Link className="btn secondary small" href="/dashboard">{isManager ? 'Manager dashboard' : 'Manager portal'}</Link>
                </div>
                {isAdminEmail(user?.email) && <div className="menu-group admin"><Link className="admin-link" href="/admin">Admin</Link></div>}
            </SiteMenu>
          </header>
        </div>
        <div className="wrap">
          {children}
          <footer className="site">
            <span>© 2026 CoHostCompare · ABN 52 679 120 059</span>
            <span><Link href="/how-it-works">How it works</Link> · <Link href="/why-us">Why use us</Link> · <Link href="/rules">Ask about rules</Link> · <Link href="/earnings">Earnings estimate</Link> · <Link href="/areas">Areas</Link> · <Link href="/managers">For managers</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></span>
            <span>Made in Sydney · hello@cohostcompare.com</span>
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
