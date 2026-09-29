import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { adminClient, currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Manager dashboard', robots: { index: false } };

type SP = Promise<{ claimed?: string }>;

const STATUS: Record<string, string> = { sent: 'New', viewed: 'Viewed', quoted: 'Quoted', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn' };

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/dashboard');
  const sp = await searchParams;
  const db = adminClient();
  const { data: memberships } = await db.from('manager_members').select('managers(id, slug, name)').eq('user_id', user.id);
  const managers = (memberships || []).map((r) => (Array.isArray(r.managers) ? r.managers[0] : r.managers)).filter(Boolean) as { id: string; slug: string; name: string }[];

  if (!managers.length) {
    return (
      <main style={{ maxWidth: 640, paddingBlock: '16px 64px', display: 'grid', gap: 14 }}>
        <h1 style={{ fontSize: 34, margin: 0 }}>Manager dashboard</h1>
        <div className="panel">You don&apos;t manage a profile yet. Find your business in a search and click <b>Claim this page</b>, or <Link href="/managers">list your business</Link>.</div>
      </main>
    );
  }

  const slugs = managers.map((m) => m.slug);
  const { data: threads } = await db
    .from('quote_request_managers')
    .select('id, manager_slug, status, created_at, quote_requests(owner_name, suburb, state, postcode, property_type, bedrooms, currently_listed, services, start_timing)')
    .in('manager_slug', slugs)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <main style={{ maxWidth: 900, paddingBlock: '16px 64px', display: 'grid', gap: 18 }}>
      {sp.claimed && <div className="panel" style={{ background: 'var(--tint)' }}><b>You&apos;re in.</b> Your profile is now marked as claimed. Next, add your fees and services so owners can compare you properly.</div>}
      {managers.map((m) => {
        const mine = (threads || []).filter((t) => t.manager_slug === m.slug);
        return (
          <section key={m.id} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span className="label">Manager dashboard</span>
                <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: 0 }}>{m.name}</h1>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn secondary" href={`/managers/${m.slug}`}>View public profile</Link>
              </div>
            </div>
            <div className="panel" style={{ display: 'grid', gap: 6 }}>
              <b>Edit your profile</b>
              <span className="hint">Fees, contract terms, services, platforms, service areas, logo and photos. Coming in the next update. For now, reply to hello@cohostcompare.com with anything you&apos;d like changed and we&apos;ll update it for you.</span>
            </div>
            <div className="panel" style={{ display: 'grid', gap: 8, padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'var(--tint)', padding: '12px 18px' }}><b>Quote requests</b> <span className="hint">· {mine.length}</span></div>
              {!mine.length ? (
                <p style={{ margin: 0, padding: '4px 18px 16px', color: 'var(--muted)' }}>No quote requests yet. They&apos;ll appear here, and we&apos;ll email you when one arrives.</p>
              ) : mine.map((t) => {
                const r = (Array.isArray(t.quote_requests) ? t.quote_requests[0] : t.quote_requests) as Record<string, unknown> | null;
                return (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '2px 12px', borderTop: '1px solid var(--line)', padding: '10px 18px' }}>
                    <b>{String(r?.owner_name || 'Owner').split(' ')[0]} · {String(r?.suburb || '')} {String(r?.state || '')} {String(r?.postcode || '')}</b>
                    <span className="hint">{STATUS[t.status] || t.status} · {new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                    <span className="hint" style={{ gridColumn: '1 / -1' }}>{String(r?.property_type || '')}, {Number(r?.bedrooms) === 0 ? 'studio' : `${r?.bedrooms} bed`} · {String(r?.currently_listed || '')} · wants {((r?.services as string[]) || []).join(', ').toLowerCase()} · {String(r?.start_timing || '').toLowerCase()}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
