import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNotice from '@/components/AdminNotice';
import { requireAdmin } from '@/lib/admin';
import { TEST_SLUG } from '@/lib/data';
import { CATCHUP_FROM, unclaimedReach, requestEmailsOn } from '@/lib/outreach';
import { adminClient } from '@/lib/supabase/server';
import { addEmailAndNotify, cantReach, deleteRequest } from './actions';

export const metadata: Metadata = { title: 'Quote requests', robots: { index: false } };
export const dynamic = 'force-dynamic';

/*
 Every quote request, with each manager it went to. "Overdue" = a manager hasn't quoted, declined or
 messaged 48 hours after the request (the point we nudge them, or flag unclaimed ones in the daily email).
*/
const OVERDUE_HOURS = 48;

type SP = Promise<{ f?: string; d?: string; q?: string; done?: string; error?: string }>;
type T = { id: string; manager_slug: string; manager_name: string; status: string; created_at: string; accepted_at: string | null; quoted_at: string | null; manager_reminded_at: string | null; unclaimed_notified_at?: string | null };
type R = { id: string; created_at: string; owner_name: string; owner_email: string; owner_phone: string | null; address: string | null; suburb: string | null; postcode: string; property_type: string | null; bedrooms: number | null; source: string | null; quote_request_managers: T[] };

const STATUS: Record<string, [string, string]> = {
  sent: ['Waiting', 'st-wait'], viewed: ['Viewed, no quote', 'st-wait'], quoted: ['Quoted', 'st-quoted'], accepted: ['Accepted', 'st-won'], declined: ['Declined', 'st-lost'], withdrawn: ['Withdrawn', 'st-lost'],
};
const FILTERS: [string, string][] = [['', 'All'], ['waiting', 'Waiting for quotes'], ['unreached', 'Manager not told'], ['overdue', `Overdue (${OVERDUE_HOURS}h+)`], ['quoted', 'Has quotes'], ['accepted', 'Accepted'], ['test', 'Test requests']];

export default async function AdminRequests({ searchParams }: { searchParams: SP }) {
  await requireAdmin('/admin/requests');
  const sp = await searchParams;
  const f = FILTERS.some(([k]) => k === sp.f) ? sp.f! : '';
  const days = ['7', '30', '90', 'all'].includes(sp.d || '') ? sp.d! : '30';
  const q = (sp.q || '').trim().toLowerCase();
  const db = adminClient();
  let query = db.from('quote_requests').select('id, created_at, owner_name, owner_email, owner_phone, address, suburb, postcode, property_type, bedrooms, source, quote_request_managers(id, manager_slug, manager_name, status, created_at, accepted_at, quoted_at, manager_reminded_at, unclaimed_notified_at)').order('created_at', { ascending: false }).limit(1000);
  if (days !== 'all') query = query.gte('created_at', new Date(Date.now() - Number(days) * 86400e3).toISOString());
  const { data, error } = await query; // source needs 017
  const all = (data || []) as unknown as R[];
  const slugs = [...new Set(all.flatMap((r) => r.quote_request_managers.map((t) => t.manager_slug)))];
  const { data: ms } = slugs.length ? await db.from('managers').select('slug, claimed').in('slug', slugs) : { data: [] };
  const claimed = new Set((ms || []).filter((m) => m.claimed).map((m) => m.slug));
  const reach = await unclaimedReach(slugs.filter((s) => !claimed.has(s) && s !== TEST_SLUG));
  const emailsOn = requestEmailsOn();
  /** Why an unclaimed manager may not know about a request yet (null = they've been told, or it no longer matters). */
  const notTold = (t: T): { short: string; long: string } | null => {
    if (claimed.has(t.manager_slug) || t.manager_slug === TEST_SLUG || !['sent', 'viewed'].includes(t.status) || t.unclaimed_notified_at || t.created_at < CATCHUP_FROM) return null;
    const r = reach.get(t.manager_slug);
    if (r === 'no-email') return { short: 'Not told: no email on file', long: 'We have no contact email for this manager, so they don’t know about the request. Add one in Outreach and they’re told within a day, or contact them by hand.' };
    if (r === 'unsubscribed') return { short: 'Not told: unsubscribed', long: 'Every contact for this manager has unsubscribed from our emails. Phone them or use their website’s contact form.' };
    if (!emailsOn) return { short: 'Not told: request emails off', long: 'Request emails to unclaimed managers are switched off (REQUEST_EMAILS=0 in Vercel).' };
    return { short: 'Not told yet: retrying', long: 'The email didn’t go through. The 8am daily run retries it for 14 days.' };
  };

  const overdue = (t: T) => ['sent', 'viewed'].includes(t.status) && Date.now() - new Date(t.created_at).getTime() > OVERDUE_HOURS * 3600e3;
  const isTest = (r: R) => r.quote_request_managers.length > 0 && r.quote_request_managers.every((t) => t.manager_slug === TEST_SLUG);
  const counts = { all: 0, waiting: 0, overdue: 0, quoted: 0, accepted: 0, test: 0, overdueThreads: 0, unreached: 0, unreachedThreads: 0 };
  for (const r of all) {
    if (isTest(r)) { counts.test++; continue; }
    counts.all++;
    const ts = r.quote_request_managers;
    if (ts.some((t) => ['sent', 'viewed'].includes(t.status))) counts.waiting++;
    if (ts.some(overdue)) counts.overdue++;
    if (ts.some(notTold)) counts.unreached++;
    counts.unreachedThreads += ts.filter(notTold).length;
    counts.overdueThreads += ts.filter(overdue).length;
    if (ts.some((t) => ['quoted', 'accepted'].includes(t.status))) counts.quoted++;
    if (ts.some((t) => t.status === 'accepted')) counts.accepted++;
  }
  const rows = all.filter((r) => {
    if (f === 'test') return isTest(r);
    if (isTest(r)) return false;
    const ts = r.quote_request_managers;
    if (f === 'waiting' && !ts.some((t) => ['sent', 'viewed'].includes(t.status))) return false;
    if (f === 'overdue' && !ts.some(overdue)) return false;
    if (f === 'unreached' && !ts.some(notTold)) return false;
    if (f === 'quoted' && !ts.some((t) => ['quoted', 'accepted'].includes(t.status))) return false;
    if (f === 'accepted' && !ts.some((t) => t.status === 'accepted')) return false;
    if (q && ![r.owner_name, r.owner_email, r.address, r.suburb, r.postcode, ...ts.map((t) => t.manager_name)].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
  const when = (d: string) => new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' });
  const ago = (d: string) => { const h = Math.round((Date.now() - new Date(d).getTime()) / 3600e3); return h < 48 ? `${h}h` : `${Math.round(h / 24)} days`; };
  const link = (k: string, v: string) => { const p = new URLSearchParams({ ...(f ? { f } : {}), d: days, ...(q ? { q } : {}) }); if (v) p.set(k, v); else p.delete(k); return `/admin/requests?${p.toString()}`; };

  return (
    <main className="admin" style={{ maxWidth: 1100, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <h1 style={{ fontSize: 34, margin: 0 }}>Quote requests</h1>
      <section className="kpis">
        <Link href={link('f', '')} className={`kpi k-blue${f === '' ? ' on' : ''}`} aria-current={f === '' ? 'true' : undefined}><span>{f === '' ? '✓ Showing: all requests' : 'All requests'}</span><b>{counts.all}</b><small>{days === 'all' ? 'all time' : `last ${days} days`}</small></Link>
        <Link href={link('f', 'waiting')} className={`kpi k-amber${f === 'waiting' ? ' on' : ''}`} aria-current={f === 'waiting' ? 'true' : undefined}><span>{f === 'waiting' ? '✓ Showing: waiting for quotes' : 'Waiting for quotes'}</span><b>{counts.waiting}</b><small>at least one manager yet to reply</small></Link>
        <Link href={link('f', 'overdue')} className={`kpi ${counts.overdue ? 'k-alert' : 'k-teal'}${f === 'overdue' ? ' on' : ''}`} aria-current={f === 'overdue' ? 'true' : undefined}><span>{f === 'overdue' ? '✓ Showing: overdue' : 'Overdue'}</span><b>{counts.overdue}</b><small>{counts.overdueThreads} manager{counts.overdueThreads === 1 ? '' : 's'} {OVERDUE_HOURS}h+ without replying</small></Link>
        <Link href={link('f', 'unreached')} className={`kpi ${counts.unreached ? 'k-alert' : 'k-teal'}${f === 'unreached' ? ' on' : ''}`} aria-current={f === 'unreached' ? 'true' : undefined}><span>{f === 'unreached' ? '✓ Showing: manager not told' : 'Manager not told'}</span><b>{counts.unreached}</b><small>{counts.unreachedThreads} unclaimed manager{counts.unreachedThreads === 1 ? '' : 's'} we couldn&apos;t email</small></Link>
        <Link href={link('f', 'accepted')} className={`kpi k-green${f === 'accepted' ? ' on' : ''}`} aria-current={f === 'accepted' ? 'true' : undefined}><span>{f === 'accepted' ? '✓ Showing: accepted' : 'Accepted'}</span><b>{counts.accepted}</b><small>{counts.quoted} with at least one quote</small></Link>
      </section>
      <form className="panel" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="field" name="q" defaultValue={sp.q || ''} placeholder="Owner, email, suburb, postcode or manager" style={{ flex: '1 1 260px' }} />
        <select className="field" name="f" defaultValue={f} style={{ width: 'auto' }}>{FILTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select className="field" name="d" defaultValue={days} style={{ width: 'auto' }}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All time</option></select>
        <button className="btn secondary" type="submit">Filter</button>
      </form>
      <AdminNotice done={sp.done} error={sp.error} />
      {error && <p className="panel" style={{ margin: 0 }}>Couldn&apos;t load requests: {error.message}</p>}
      <p className="hint" style={{ margin: 0 }}>{rows.length} request{rows.length === 1 ? '' : 's'}. Overdue means a manager hasn&apos;t quoted, declined or replied {OVERDUE_HOURS} hours after the request. Claimed managers get a reminder email at that point; unclaimed ones appear in your daily email to chase by hand. &ldquo;Manager not told&rdquo; means an unclaimed manager couldn&apos;t be emailed about the request at all, with the reason on each one.</p>
      {rows.map((r) => (
        <article key={r.id} className={`panel req-card${r.quote_request_managers.some(overdue) ? ' late' : ''}`}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <b>{r.owner_name}</b>
            <span className="hint"><a href={`mailto:${r.owner_email}`}>{r.owner_email}</a>{r.owner_phone ? ` · ${r.owner_phone}` : ''}</span>
            <span className="hint" style={{ marginLeft: 'auto' }}>{when(r.created_at)} ({ago(r.created_at)} ago){r.source && r.source !== 'direct' ? ` · from ${r.source === 'ads' ? 'Google Ads' : r.source === 'google' ? 'Google search' : r.source}` : ''}</span>
            <Link href={`/admin/requests/${r.id}`} style={{ fontWeight: 600, fontSize: 14 }}>Open →</Link>
            <details className="req-del"><summary className="hint">Delete</summary>
              <form action={deleteRequest} className="req-del-pop">
                <input type="hidden" name="id" value={r.id} />
                <label className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="confirm" value="yes" required /> Permanently delete this request, its messages and quotes. Nobody is emailed.</label>
                <button className="btn secondary small" type="submit" style={{ color: 'var(--signal)' }}>Delete request</button>
              </form>
            </details>
          </div>
          <span className="hint">{r.address || `${r.suburb || ''} ${r.postcode}`} · {r.property_type}{r.bedrooms != null ? `, ${r.bedrooms === 0 ? 'studio' : `${r.bedrooms} bed`}` : ''}</span>
          <div className="req-threads">
            {r.quote_request_managers.map((t) => {
              const [label, cls] = STATUS[t.status] || [t.status, ''];
              const late = overdue(t);
              const nt = notTold(t);
              return (
                <div key={t.id} className="req-thread">
                  <Link href={`/managers/${t.manager_slug}`}><b>{t.manager_name}</b></Link>
                  <span className={`st ${late ? 'st-late' : cls}`}>{late ? `Overdue · ${ago(t.created_at)}` : label}</span>
                  {!claimed.has(t.manager_slug) && t.manager_slug !== TEST_SLUG && <span className="st st-lost" title="Not claimed: they can't see the request on CoHostCompare. Contact them by hand.">Unclaimed</span>}
                  {late && t.manager_reminded_at && <span className="hint" style={{ fontSize: 12 }}>reminded {ago(t.manager_reminded_at)} ago</span>}
                  {!claimed.has(t.manager_slug) && t.unclaimed_notified_at && <span className="hint" style={{ fontSize: 12 }}>emailed {ago(t.unclaimed_notified_at)} ago</span>}
                  {nt && (
                    <div className="req-why">
                      <span><b>{nt.short}.</b> {nt.long}</span>
                      <details className="req-fix">
                        <summary>Found an email? Send them the request</summary>
                        <form action={addEmailAndNotify} className="req-fix-form">
                          <input type="hidden" name="thread" value={t.id} />
                          <input className="field" type="email" name="email" required placeholder="info@business.com.au" aria-label={`Email for ${t.manager_name}`} />
                          <input className="field" type="url" name="source" required placeholder="Page where they publish it (https://…)" aria-label="Web page where the email is published" />
                          <button className="btn primary small" type="submit">Add and send request</button>
                        </form>
                      </details>
                      <details className="req-fix">
                        <summary>Can&apos;t reach them? Tell the owner</summary>
                        <form action={cantReach} className="req-fix-form">
                          <input type="hidden" name="thread" value={t.id} />
                          <label className="hint" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}><input type="checkbox" name="confirm" value="yes" required style={{ marginTop: 3 }} /> <span>Remove {t.manager_name} from this request and email the owner a link to add another manager. It can&apos;t be undone.</span></label>
                          <button className="btn secondary small" type="submit">Remove and tell the owner</button>
                        </form>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </main>
  );
}
