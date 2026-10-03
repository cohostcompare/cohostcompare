import type { Metadata } from 'next';
import Link from 'next/link';
import { isAdminEmail, requireAdmin } from '@/lib/admin';
import { TEST_SLUG } from '@/lib/data';
import { adminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Owners', robots: { index: false } };
export const dynamic = 'force-dynamic';

type R = { id: string; created_at: string; owner_id: string; owner_name: string; owner_email: string; owner_phone: string | null; suburb: string | null; postcode: string; source: string | null; quote_request_managers: { status: string; manager_slug: string }[] };
type O = { id: string; name: string; email: string; phone: string | null; first: string; last: string; requests: number; managers: number; quotes: number; accepted: number; places: Set<string>; source: string | null };
const SRC: Record<string, string> = { ads: 'Google Ads', google: 'Google search', social: 'Social', referral: 'Other sites', email: 'Email', direct: 'Direct' };

/** Everyone who has sent a quote request, newest activity first. */
export default async function Owners({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin('/admin/owners');
  const q = ((await searchParams).q || '').trim().toLowerCase();
  const { data } = await adminClient().from('quote_requests').select('id, created_at, owner_id, owner_name, owner_email, owner_phone, suburb, postcode, source, quote_request_managers(status, manager_slug)').order('created_at', { ascending: false }).limit(3000);
  const { data: gs } = await adminClient().from('guide_signups').select('id, created_at, email, first_name, state, consent, step, downloads, source').order('created_at', { ascending: false }).limit(1000); // SQL 025
  const guides = (gs || []) as { id: string; created_at: string; email: string; first_name: string | null; state: string; consent: boolean; step: number; downloads: number; source: string | null }[];
  const owned = new Set(((data || []) as unknown as R[]).map((r) => r.owner_email.toLowerCase()));
  const by = new Map<string, O>();
  for (const r of (data || []) as unknown as R[]) {
    const ts = r.quote_request_managers || [];
    if (ts.length && ts.every((t) => t.manager_slug === TEST_SLUG)) continue;
    if (isAdminEmail(r.owner_email)) continue;
    const o = by.get(r.owner_id) || { id: r.owner_id, name: r.owner_name, email: r.owner_email, phone: r.owner_phone, first: r.created_at, last: r.created_at, requests: 0, managers: 0, quotes: 0, accepted: 0, places: new Set<string>(), source: null };
    o.requests++; o.managers += ts.length;
    o.quotes += ts.filter((t) => ['quoted', 'accepted'].includes(t.status)).length;
    o.accepted += ts.filter((t) => t.status === 'accepted').length;
    o.places.add(`${r.suburb || ''} ${r.postcode}`.trim());
    if (r.created_at < o.first) { o.first = r.created_at; o.source = r.source; }
    if (!o.source) o.source = r.source;
    by.set(r.owner_id, o);
  }
  const owners = [...by.values()].filter((o) => !q || `${o.name} ${o.email} ${[...o.places].join(' ')}`.toLowerCase().includes(q));
  const d = (x: string) => new Date(x).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' });
  return (
    <main className="admin" style={{ maxWidth: 1100, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <h1 style={{ fontSize: 34, margin: 0 }}>Owners</h1>
      <section className="kpis">
        <div className="kpi k-blue"><span>Owners</span><b>{by.size}</b><small>who have sent a quote request</small></div>
        <div className="kpi k-amber"><span>With a quote</span><b>{[...by.values()].filter((o) => o.quotes).length}</b><small>received at least one quote</small></div>
        <div className="kpi k-green"><span>Accepted</span><b>{[...by.values()].filter((o) => o.accepted).length}</b><small>accepted at least one quote</small></div>
        <div className="kpi k-purple"><span>Came back</span><b>{[...by.values()].filter((o) => o.requests > 1).length}</b><small>sent more than one request</small></div>
      </section>
      <form style={{ display: 'flex', gap: 8 }}><input className="field" name="q" defaultValue={q} placeholder="Name, email, suburb or postcode" style={{ maxWidth: 360 }} /><button className="btn secondary" type="submit">Search</button></form>
      <div className="cmp-wrap">
        <table className="cmp" style={{ minWidth: 860 }}>
          <thead><tr>{['Owner', 'Property', 'Requests', 'Managers', 'Quotes', 'Accepted', 'First came from', 'Last request'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>
            {owners.map((o) => (
              <tr key={o.id}>
                <th scope="row" style={{ position: 'static', width: 'auto' }}><b>{o.name}</b><div className="hint"><a href={`mailto:${o.email}`}>{o.email}</a>{o.phone ? ` · ${o.phone}` : ''}</div></th>
                <td>{[...o.places].join('; ')}</td>
                <td><Link href={`/admin/requests?d=all&q=${encodeURIComponent(o.email)}`}>{o.requests}</Link></td>
                <td>{o.managers}</td><td>{o.quotes}</td><td>{o.accepted}</td>
                <td>{o.source ? SRC[o.source] || o.source : <span className="hint">–</span>}</td>
                <td>{d(o.last)}<div className="hint">first {d(o.first)}</div></td>
              </tr>
            ))}
            {!owners.length && <tr><td colSpan={8} className="hint">No owners yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ margin: 0 }}>Admin and test requests aren&apos;t included. Owner details are for running the service only; see the privacy policy.</p>

      <section id="guide" style={{ display: 'grid', gap: 10, borderTop: '1px solid var(--line)', paddingTop: 18 }}>
        <h2 style={{ fontSize: 24, margin: 0 }}>Setup guide sign-ups</h2>
        <p className="hint" style={{ margin: 0 }}>{guides.length} sign-up{guides.length === 1 ? '' : 's'} · {guides.filter((g) => g.consent).length} said yes to setup tips · {guides.filter((g) => owned.has(g.email.toLowerCase())).length} went on to request quotes. Tips go out on days 3, 7 and 12, only to people who ticked the box.</p>
        <div className="cmp-wrap">
          <table className="cmp" style={{ minWidth: 720 }}>
            <thead><tr>{['Email', 'State', 'Tips', 'Downloads', 'Came from', 'Signed up'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
            <tbody>
              {guides.map((g) => (
                <tr key={g.id}>
                  <th scope="row" style={{ position: 'static', width: 'auto' }}><a href={`mailto:${g.email}`}>{g.email}</a>{g.first_name ? <div className="hint">{g.first_name}</div> : null}{owned.has(g.email.toLowerCase()) ? <div className="hint" style={{ color: 'var(--brand)', fontWeight: 600 }}>Requested quotes</div> : null}</th>
                  <td>{g.state.toUpperCase()}</td>
                  <td>{g.consent ? `Yes · ${g.step} of 3 sent` : 'No'}</td>
                  <td>{g.downloads}</td>
                  <td>{g.source || '–'}</td>
                  <td>{d(g.created_at)}</td>
                </tr>
              ))}
              {!guides.length && <tr><td colSpan={6} className="hint">No sign-ups yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
