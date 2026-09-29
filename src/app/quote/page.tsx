import type { Metadata } from 'next';
import Link from 'next/link';
import { publicManager } from '@/lib/data';

export const metadata: Metadata = { title: 'Request quotes', robots: { index: false } };

type SP = Promise<{ managers?: string; postcode?: string; address?: string }>;

export default async function Quote({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const slugs = (sp.managers || '').split(',').filter(Boolean).slice(0, 5);
  const picked = (await Promise.all(slugs.map(publicManager))).filter(Boolean);

  return (
    <main style={{ maxWidth: 720, paddingBlock: '16px 64px' }}>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,40px)', marginBottom: 8 }}>Request quotes</h1>
      <p style={{ color: 'var(--muted)', marginTop: 0 }}>
        {picked.length ? <>Sending to {picked.map((m) => m!.name).join(', ')}.</> : 'Pick managers from the search results first.'}
        {sp.address && <> Property: {sp.address}.</>}
      </p>
      <div className="locked">
        <h2 style={{ fontSize: 20, margin: 0 }}>Coming next in the build</h2>
        <p style={{ color: 'var(--muted)' }}>This step will ask for your email (one-click sign-in, no password), then a short property form: bedrooms, property type, whether it&apos;s already listed and which services you want. Each manager replies with a quote in the same format so you can compare them side by side.</p>
        <Link className="btn secondary" href="/">Back to search</Link>
      </div>
    </main>
  );
}
