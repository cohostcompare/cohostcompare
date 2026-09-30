import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';
import { setFeeStatus, setFlagStatus } from './actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Admin() {
  await requireAdmin('/admin');
  const db = adminClient();
  const count = async (table: string, f?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = db.from(table).select('*', { count: 'exact', head: true });
    if (f) q = f(q);
    return (await q).count ?? 0;
  };
  const [openClaims, managers, claimed, requests, owners] = await Promise.all([
    count('manager_claims', (q) => q.in('status', ['pending', 'info_requested', 'info_received'])),
    count('managers', (q) => q.eq('published', true)),
    count('managers', (q) => q.eq('claimed', true)),
    count('quote_requests'),
    count('waitlist'),
  ]);
  const { data: recent } = await db.from('quote_requests').select('id, created_at, owner_name, owner_email, address, quote_request_managers(manager_name)').order('created_at', { ascending: false }).limit(20);

  // Needs SQL 012; empty until then.
  const [{ data: interest }, { data: errors }, { data: inbound }] = await Promise.all([
    db.from('interest_signups').select('id, kind, email, name, area, note, created_at').order('created_at', { ascending: false }).limit(25),
    db.from('error_events').select('sig, route, message, count, last_seen_at').order('last_seen_at', { ascending: false }).limit(10),
    db.from('inbound_emails').select('email_id, from_email, subject, outcome, created_at').order('created_at', { ascending: false }).limit(10),
  ]);
  const [{ data: fees }, { data: flags }] = await Promise.all([
    db.from('success_fees').select('id, amount, status, created_at, managers(name)').in('status', ['owed', 'invoiced']).order('created_at', { ascending: false }).limit(50), // needs 015
    db.from('account_flags').select('id, user_id, reason, created_at, managers(name)').eq('status', 'open').order('created_at', { ascending: false }).limit(20),
  ]);
  const when = (d: string) => new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' });
  const tiles: [string, number, string?][] = [
    ['Claims to review', openClaims, '/admin/claims'], ['Published managers', managers, '/admin/managers'], ['Claimed profiles', claimed], ['Quote requests', requests], ['Waitlist sign-ups', owners], ['Listing data', -1, '/admin/data'], ['Manager outreach', -1, '/admin/outreach'],
  ];
  return (
    <main style={{ maxWidth: 960, paddingBlock: '16px 64px', display: 'grid', gap: 18 }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>Admin</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
        {tiles.map(([label, n, href]) => {
          const inner = <><div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: n < 0 ? 22 : 30, color: label === 'Claims to review' && n ? 'var(--signal)' : 'var(--ink)' }}>{n < 0 ? 'Open →' : n}</div><div className="hint">{label}</div></>;
          return href ? <Link key={label} href={href} className="panel" style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link> : <div key={label} className="panel">{inner}</div>;
        })}
      </div>
      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <b>Latest quote requests</b>
        {!recent?.length ? <span className="hint">None yet.</span> : recent.map((r) => (
          <div key={r.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 8, display: 'grid', gap: 2 }}>
            <span><b>{r.owner_name}</b> <span className="hint">{r.owner_email} · {new Date(r.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}</span></span>
            <span className="hint">{r.address} → {(r.quote_request_managers || []).map((m: { manager_name: string }) => m.manager_name).join(', ')}</span>
          </div>
        ))}
      </section>
      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <b>Success fees to invoice (Free plan, A$ ex GST)</b>
        {!fees?.length ? <span className="hint">None owed.</span> : fees.map((f) => (
          <div key={f.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span><b>{(f.managers as unknown as { name: string } | null)?.name}</b> · ${f.amount} · {f.status} <span className="hint">{when(f.created_at)}</span></span>
            {['invoiced', 'paid', 'waived'].filter((x) => x !== f.status).map((x) => (
              <form key={x} action={setFeeStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value={x} /><button className="linkish">Mark {x}</button></form>
            ))}
          </div>
        ))}
      </section>
      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <b>Possible shared logins (Free plan)</b>
        {!flags?.length ? <span className="hint">None flagged.</span> : flags.map((f) => (
          <div key={f.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 8, display: 'grid', gap: 4 }}>
            <span><b>{(f.managers as unknown as { name: string } | null)?.name}</b> <span className="hint">{when(f.created_at)}</span></span>
            <span className="hint">{f.reason}</span>
            <span style={{ display: 'flex', gap: 12 }}>
              <form action={setFlagStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="ok" /><button className="linkish">Looks fine</button></form>
              <form action={setFlagStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="actioned" /><button className="linkish">Contacted them</button></form>
            </span>
          </div>
        ))}
      </section>
      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <b>Interest sign-ups (Pro, suburb reports, partners)</b>
        {!interest?.length ? <span className="hint">None yet.</span> : interest.map((r) => (
          <div key={r.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
            <b>{r.kind === 'pro' ? 'Pro' : r.kind === 'report' ? 'Report' : 'Partner'}</b> {r.name ? `${r.name} · ` : ''}{r.email}{r.area ? ` · ${r.area}` : ''} <span className="hint">{when(r.created_at)}</span>
            {r.note && <div className="hint">{r.note}</div>}
          </div>
        ))}
      </section>
      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <b>Email replies received</b>
        {!inbound?.length ? <span className="hint">None yet. Reply tracking starts once INBOUND_DOMAIN is set up.</span> : inbound.map((r) => (
          <div key={r.email_id} style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>{r.from_email} · {r.subject} <span className="hint">{when(r.created_at)} · {r.outcome || 'processing'}</span></div>
        ))}
      </section>
      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <b>Recent site errors</b>
        {!errors?.length ? <span className="hint">None recorded.</span> : errors.map((r) => (
          <div key={r.sig} style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}><b>{r.route}</b> × {r.count} <span className="hint">last {when(r.last_seen_at)}</span><div className="hint" style={{ overflowWrap: 'anywhere' }}>{r.message}</div></div>
        ))}
      </section>
    </main>
  );
}
