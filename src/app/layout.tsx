import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { isAdminEmail } from '@/lib/admin';
import { adminClient, currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cohostcompare.com'),
  title: { default: 'CoHostCompare', template: '%s · CoHostCompare' },
  description: 'Compare every short-term rental manager for your property: fees side by side, every platform, verified ratings.',
  icons: { icon: '/favicon.svg' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser().catch(() => null);
  const isManager = user ? Boolean((await adminClient().from('manager_members').select('manager_id', { count: 'exact', head: true }).eq('user_id', user.id).then((r) => r.count, () => 0))) : false;
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Figtree:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        <div className="wrap">
          <header className="top">
            <Link className="logo" href="/" aria-label="CoHostCompare home">
              <svg width="30" height="30" viewBox="0 0 34 34" aria-hidden="true"><path className="solid" d="M3 16 L12 8 L21 16 V28 H3 Z" /><path className="outline" d="M13 16 L22 8 L31 16 V28 H13 Z" /></svg>
              CoHostCompare
            </Link>
            <details className="menu">
              <summary aria-label="Menu"><span /><span /><span /></summary>
              <nav className="menu-body" aria-label="Main">
                <div className="menu-group owners">
                  <Link href="/">Compare managers</Link>
                  <Link href="/how-it-works">How it works</Link>
                  <Link href="/why-cohostcompare">Why CoHostCompare</Link>
                  <Link href="/rules">Rules by state</Link>
                  {user ? <Link className="btn secondary small" href="/account">My inbox</Link> : <Link className="btn primary small" href="/signin">Sign in or sign up</Link>}
                </div>
                <div className="menu-group managers">
                  <span className="menu-label">For managers</span>
                  <Link href="/managers">How it works for managers</Link>
                  <Link className="btn secondary small" href="/dashboard">{isManager ? 'Manager dashboard' : 'Manager portal'}</Link>
                  {isAdminEmail(user?.email) && <Link className="admin-link" href="/admin">Admin</Link>}
                </div>
              </nav>
            </details>
          </header>
          {children}
          <footer className="site">
            <span>© 2026 CoHostCompare</span>
            <span><Link href="/how-it-works">How it works</Link> · <Link href="/why-cohostcompare">Why CoHostCompare</Link> · <Link href="/rules">Rules by state</Link> · <Link href="/managers">For managers</Link> · <Link href="/privacy">Privacy</Link></span>
            <span>Made in Sydney · hello@cohostcompare.com</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
