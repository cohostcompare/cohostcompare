import type { Metadata } from 'next';
import Link from 'next/link';
import EmailSignIn from '@/components/EmailSignIn';
import { publicManager } from '@/lib/data';
import { currentUser } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import QuoteForm from './QuoteForm';

export const metadata: Metadata = { title: 'Request quotes', robots: { index: false } };

type SP = Promise<{ managers?: string; postcode?: string; street?: string; suburb?: string; state?: string; lat?: string; lng?: string }>;

export default async function Quote({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const slugs = (sp.managers || '').split(',').filter(Boolean).slice(0, 5);
  const picked = await (await import('@/lib/reach')).withReach((await Promise.all(slugs.map(publicManager))).filter((m): m is NonNullable<typeof m> => Boolean(m)));
  const user = await currentUser();
  const reqs = await (await import('@/lib/requirementsServer')).requirementsFor(picked.map((m) => m.slug));
  // Remember an unsent request so we can send one gentle reminder (SQL 022; never for admins).
  if (user?.email && picked.length && !isAdminEmail(user.email)) {
    const q = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== 'managers') as [string, string][]).toString();
    const db = (await import('@/lib/supabase/server')).adminClient();
    const slugs = picked.map((m) => m.slug).join(',');
    const { data: prev } = await db.from('quote_drafts').select('managers, reminded_at').eq('user_id', user.id).maybeSingle();
    // Same managers and reminded in the last 30 days: keep it as reminded (one reminder means one).
    const keep = prev && prev.managers === slugs && prev.reminded_at && Date.now() - new Date(prev.reminded_at).getTime() < 30 * 86400e3;
    const now = new Date().toISOString();
    await db.from('quote_drafts').upsert({ user_id: user.id, email: user.email, managers: slugs, names: picked.map((m) => m.name).join(', '), query: q, updated_at: now, done: false, ...(keep ? {} : { reminded_at: null, created_at: now }) }).then(() => {}, () => {});
  }
  const here = `/quote?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()}`;

  return (
    <main style={{ maxWidth: 720, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,40px)', margin: 0 }}>Request quotes</h1>
      {picked.length ? (
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Describe your property once and each manager replies with a quote in the same format, so you can compare them side by side.
        </p>
      ) : (
        <div className="panel">Pick managers from your search results first. <Link href="/">Start a search</Link></div>
      )}
      {picked.length > 0 && (user?.email ? (
        <QuoteForm managers={picked.map((m) => ({ slug: m.slug, name: m.name, claimed: m.claimed, slowReply: m.slowReply, requirements: reqs.get(m.slug) ?? null }))} initial={{ street: sp.street || '', suburb: sp.suburb || '', state: sp.state || '', postcode: sp.postcode || '', lat: sp.lat ? Number(sp.lat) : null, lng: sp.lng ? Number(sp.lng) : null }} email={user.email} fresh={isAdminEmail(user.email)} />
      ) : (
        <EmailSignIn next={here} intro="First, confirm your email. We'll send a one-click link that brings you straight back here. This also unlocks full fees and contract terms on every profile." />
      ))}
    </main>
  );
}
