import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { myManagers } from '@/lib/managers';
import { eventTotals } from '@/lib/events';
import { planName, planOf, plansFor, PRO_FEATURES, PRO_PRICE, SUCCESS_FEE_TEXT } from '@/lib/pro';
import { adminClient, currentUser } from '@/lib/supabase/server';
import ProInterest from './ProInterest';

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
  if (managers.length) { const { recordActivity } = await import('@/lib/activity'); await recordActivity(user.id); }

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
  const events = await eventTotals(managers.map((m) => m.id));
  const { data: abns } = await db.from('managers').select('id, abn_verified_at').in('id', managers.map((m) => m.id)); // needs 009
  const verified = new Set((abns || []).filter((a) => a.abn_verified_at).map((a) => a.id));
  const since = Date.now() - 30 * 86400e3;
  const pro = await plansFor(managers.map((m) => m.id));
  const { data: freshReports } = await db.from('suburb_reports').select('id, area_label, manager_ids').overlaps('manager_ids', managers.map((m) => m.id)).gte('created_at', new Date(Date.now() - 21 * 86400e3).toISOString()); // needs 014

  return (
    <main style={{ maxWidth: 920, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      {sp.claimed && <div className="panel" style={{ background: 'var(--tint)' }}><b>You&apos;re in.</b> Start by adding your fees, services and logo so owners can compare you properly.</div>}
      {managers.map((m) => {
        const mine = (threads || []).filter((t) => t.manager_slug === m.slug);
        const open = mine.filter((t) => t.status === 'sent' || t.status === 'viewed').length;
        const g = (m.gated || {}) as Record<string, unknown>;
        const checks: [string, boolean][] = [
          ['A short tagline', Boolean(m.tagline)], ['An about section (a few sentences)', (m.about || '').length >= 80],
          ['Your management fee', m.fee_min != null], ['Minimum term and notice period', g.minTermMonths != null && g.noticeDays != null],
          ['The services you offer', m.services.length > 0], ['Every platform you list on', (m.platforms || []).length > 1],
          ['Your logo', Boolean(m.logo_url)], ['At least 3 photos of homes you manage', m.photos.length >= 3],
          ['A phone number for owners who accept your quote', Boolean(m.contact_phone)], ['Your ABN, for the Verified business badge', verified.has(m.id)],
        ];
        const score = Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100);
        const ev = events.get(m.id) || { view: 0, search: 0 };
        const recent = (threads || []).filter((t) => t.manager_slug === m.slug && new Date(t.created_at).getTime() >= since).length;
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
                <Link className="btn secondary" href={`/dashboard/${m.slug}/insights`}>Insights</Link>
                <Link className="btn secondary" href="/dashboard/reports">Reports</Link>
                <Link className="btn secondary" href={`/dashboard/${m.slug}/alerts`}>Alerts</Link>
                <Link className="btn secondary" href={`/dashboard/${m.slug}/team`}>Team</Link>
              </div>
            </div>
            <div className="dash-stats">
              <div className="panel"><b>{ev.search.toLocaleString('en-AU')}</b><span>times you appeared in owner searches</span></div>
              <div className="panel"><b>{ev.view.toLocaleString('en-AU')}</b><span>profile views</span></div>
              <div className="panel"><b>{recent}</b><span>quote requests</span></div>
              <div className="panel"><b>{score}%</b><span>profile complete</span></div>
            </div>
            <p className="hint" style={{ margin: '-4px 0 0' }}>Last 30 days. Views from you and your team aren&apos;t counted.</p>
            {(() => {
              const fresh = (freshReports || []).filter((r) => (r.manager_ids as string[]).includes(m.id));
              return fresh.length ? (
                <Link href="/dashboard/reports" className="panel" style={{ display: 'block', background: 'var(--tint)', color: 'inherit', textDecoration: 'none' }}>
                  <b>New regional report{fresh.length > 1 ? 's' : ''}:</b> {fresh.slice(0, 3).map((r) => r.area_label).join(', ')}{fresh.length > 3 ? ` and ${fresh.length - 3} more` : ''} →
                </Link>
              ) : null;
            })()}
            {(() => {
              const p = pro.get(m.id);
              const plan = planOf(p);
              if (plan !== 'free') return (
                <div className="panel" style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', borderColor: 'var(--brand)' }}>
                  <span><b>{planName(plan)}{p?.pro_note === 'founding' ? ' (founding manager)' : ''}</b>{p?.pro_until ? `${p.pro_note === 'founding' ? ' is free for you' : ''} until ${new Date(p.pro_until).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}: insights, regional reports, SMS alerts and more photos.</span>
                  <Link className="btn primary small" href={`/dashboard/${m.slug}/insights`}>Open insights</Link>
                </div>
              );
              return (
                <div className="panel" style={{ display: 'grid', gap: 8 }}>
                  <b>CoHostCompare Pro (optional)</b>
                  <span className="hint">Your profile, quote requests and replies stay free, with a {SUCCESS_FEE_TEXT} success fee only when an owner accepts your quote. Pro ({PRO_PRICE}) has no success fees and adds {PRO_FEATURES.filter((f) => f.title !== 'No success fees').map((f) => f.title.toLowerCase()).join(', ')}. It never changes where you appear or what owners see.</span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}><ProInterest managerId={m.id} /><Link href="/managers#pricing">See plans</Link></div>
                </div>
              );
            })()}
            {score < 100 && (
              <div className="panel" style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <b>Finish your profile</b>
                  <Link className="btn secondary small" href={`/dashboard/${m.slug}/edit`}>Edit profile</Link>
                </div>
                <div className="meter" aria-hidden="true"><span style={{ width: `${score}%` }} /></div>
                <p className="hint" style={{ margin: 0 }}>Owners compare fees, terms and photos first, so complete profiles get asked for more quotes.</p>
                <ul className="ticks">{checks.map(([label, ok]) => <li key={label} className={ok ? 'done' : ''}>{label}</li>)}</ul>
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
