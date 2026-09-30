import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { myManagers } from '@/lib/managers';
import { adminClient, currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Manager dashboard', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ claimed?: string }>;

const STATUS: Record<string, [string, string]> = {
  sent: ['New', 'var(--signal)'], viewed: ['Needs your quote', 'var(--signal)'], quoted: ['Quote sent', 'var(--brand)'],
  accepted: ['Accepted', 'var(--brand)'], declined: ['Declined', 'var(--muted)'], withdrawn: ['Withdrawn', 'var(--muted)'],
};

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/dashboard');
  const sp = await searchParams;
  const managers = await myManagers(user.id);

  if (!managers.length) {
    return (
      <main style={{ maxWidth: 640, paddingBlock: '16px 64px', display: 'grid', gap: 14 }}>
        <span className="label">Manager portal</span>
        <h1 style={{ fontSize: 34, margin: 0 }}>You don&apos;t manage a profile yet</h1>
        <div className="panel" style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0 }}>Search for your business by an address you manage near, open your profile and click <b>Claim this page</b>. If you use an email address on your business&apos;s own domain, you&apos;re approved instantly.</p>
          <p style={{ margin: 0 }}>Not listed yet? <Link href="/managers">Tell us about your business</Link>.</p>
        </div>
      </main>
    );
  }

  const db = adminClient();
  const { data: threads } = await db
    .from('quote_request_managers')
    .select('id, manager_slug, status, created_at, messages(sender, read_by_manager), quote_requests(owner_name, suburb, state, postcode, property_type, bedrooms, start_timing)')
    .in('manager_slug', managers.map((m) => m.slug))
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <main style={{ maxWidth: 920, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      {sp.claimed && <div className="panel" style={{ background: 'var(--tint)' }}><b>You&apos;re in.</b> Start by adding your fees, services and logo so owners can compare you properly.</div>}
      {managers.map((m) => {
        const mine = (threads || []).filter((t) => t.manager_slug === m.slug);
        const open = mine.filter((t) => t.status === 'sent' || t.status === 'viewed').length;
        const missing = [m.fee_min == null && 'fees', !m.services.length && 'services', !m.logo_url && 'logo', !m.photos.length && 'photos'].filter(Boolean) as string[];
        return (
          <section key={m.id} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span className="label">Manager dashboard</span>
                <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: 0 }}>{m.name}</h1>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn primary" href={`/dashboard/${m.slug}/edit`}>Edit profile</Link>
                <Link className="btn secondary" href={`/managers/${m.slug}`}>View public profile</Link>
              </div>
            </div>
            {missing.length > 0 && (
              <div className="panel" style={{ borderColor: 'var(--signal)' }}>
                Your profile is missing <b>{missing.join(', ')}</b>. Profiles with fees and photos get more quote requests. <Link href={`/dashboard/${m.slug}/edit`}>Add them now</Link>
              </div>
            )}
            <div className="panel" style={{ display: 'grid', gap: 0, padding: 0, overflow: 'hidden' }}>
              <div style={{ background: 'var(--tint)', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <b>Quote requests</b><span className="hint">{open ? `${open} waiting for your quote` : `${mine.length} total`}</span>
              </div>
              {!mine.length ? (
                <p style={{ margin: 0, padding: '14px 18px', color: 'var(--muted)' }}>No quote requests yet. We&apos;ll email you when one arrives.</p>
              ) : mine.map((t) => {
                const r = (Array.isArray(t.quote_requests) ? t.quote_requests[0] : t.quote_requests) as Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
                const unread = (t.messages || []).filter((x: { sender: string; read_by_manager: boolean }) => x.sender === 'owner' && !x.read_by_manager).length;
                const [label, colour] = STATUS[t.status] || [t.status, 'var(--muted)'];
                return (
                  <Link key={t.id} href={`/dashboard/requests/${t.id}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '2px 12px', borderTop: '1px solid var(--line)', padding: '12px 18px', color: 'inherit', textDecoration: 'none' }}>
                    <b>{String(r?.owner_name || 'Owner').split(' ')[0]} · {r?.suburb || ''} {r?.state || ''} {r?.postcode}{unread ? <span style={{ color: 'var(--signal)' }}> · {unread} new message{unread === 1 ? '' : 's'}</span> : null}</b>
                    <span style={{ fontWeight: 700, color: colour, fontSize: 14 }}>{label}</span>
                    <span className="hint">{r?.property_type}, {Number(r?.bedrooms) === 0 ? 'studio' : `${r?.bedrooms} bed`} · {String(r?.start_timing || '').toLowerCase()}</span>
                    <span className="hint">{new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
