import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

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

  const tiles: [string, number, string?][] = [
    ['Claims to review', openClaims, '/admin/claims'], ['Published managers', managers, '/admin/managers'], ['Claimed profiles', claimed], ['Quote requests', requests], ['Waitlist sign-ups', owners],
  ];
  return (
    <main style={{ maxWidth: 960, paddingBlock: '16px 64px', display: 'grid', gap: 18 }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>Admin</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
        {tiles.map(([label, n, href]) => {
          const inner = <><div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 30, color: label === 'Claims to review' && n ? 'var(--signal)' : 'var(--ink)' }}>{n}</div><div className="hint">{label}</div></>;
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
    </main>
  );
}
