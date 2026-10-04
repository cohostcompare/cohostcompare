import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { TEST_SLUG } from '@/lib/data';
import { adminClient } from '@/lib/supabase/server';
import { DEVICES, SOURCES, sourceLabel, type Device, type Source } from '@/lib/traffic';

export const metadata: Metadata = { title: 'Ad results', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ d?: string; spend?: string }>;
type Row = { visits: number; searched: number; quoted: number; requests: number; accepted: number };
const blank = (): Row => ({ visits: 0, searched: 0, quoted: 0, requests: 0, accepted: 0 });
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '–');
const money = (n: number) => `A$${n.toLocaleString('en-AU', { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

export default async function AdResults({ searchParams }: { searchParams: SP }) {
  await requireAdmin('/admin/ads');
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.d)) ? Number(sp.d) : 30;
  const spend = Math.max(0, Number(sp.spend) || 0);
  const since = new Date(Date.now() - days * 86400e3).toISOString();
  const db = adminClient();

  const [{ data: ev, error }, { data: reqs }] = await Promise.all([
    db.from('funnel_events').select('sid, kind, source, campaign, device').gte('created_at', since).limit(50000),
    db.from('quote_requests').select('id, source, campaign, quote_request_managers(status, manager_slug)').gte('created_at', since).limit(5000),
  ]);
  // Requests that only went to the internal test profile are left out.
  const realReqs = (reqs || []).filter((r) => { const ms = (r.quote_request_managers as { manager_slug: string }[] | null) || []; return !(ms.length && ms.every((m) => m.manager_slug === TEST_SLUG)); });

  // People (sessions), not page loads: a session that searched three times counts once.
  const by = new Map<Source, Row>(SOURCES.map((s) => [s, blank()]));
  const camp = new Map<string, Row>();
  const sets = new Map<string, Set<string>>();
  const once = (key: string, sid: string) => { const s = sets.get(key) || new Set(); const n = !s.has(sid); s.add(sid); sets.set(key, s); return n; };
  // By device (SQL 027): sessions and sessions that sent a quote request, per source. Events before 027 have no device and sit under "unknown".
  type DevCol = Device | 'unknown';
  const DEV_COLS: DevCol[] = [...DEVICES, 'unknown'];
  const dev = new Map<Source, Record<DevCol, { visits: number; quoted: number }>>(SOURCES.map((s) => [s, Object.fromEntries(DEV_COLS.map((d) => [d, { visits: 0, quoted: 0 }])) as Record<DevCol, { visits: number; quoted: number }>]));
  const sidDevice = new Map<string, DevCol>();
  for (const e of ev || []) if (e.kind === 'visit' && !sidDevice.has(e.sid)) sidDevice.set(e.sid, (DEVICES.includes(e.device as Device) ? e.device : 'unknown') as DevCol);
  for (const e of ev || []) {
    const src = (SOURCES.includes(e.source as Source) ? e.source : 'direct') as Source;
    const f = e.kind === 'visit' ? 'visits' : e.kind === 'search' ? 'searched' : 'quoted';
    if (once(`${src}:${f}`, e.sid)) by.get(src)![f]++;
    if (src === 'ads') { const c = e.campaign || '(no campaign id)'; const r = camp.get(c) || blank(); if (once(`c:${c}:${f}`, e.sid)) r[f]++; camp.set(c, r); }
    if (f === 'visits' || f === 'quoted') {
      const d = sidDevice.get(e.sid) || (DEVICES.includes(e.device as Device) ? (e.device as Device) : 'unknown');
      if (once(`d:${src}:${d}:${f}`, e.sid)) dev.get(src)![d][f]++;
    }
  }
  for (const r of realReqs) {
    const src = (SOURCES.includes(r.source as Source) ? r.source : 'direct') as Source;
    const won = (r.quote_request_managers as { status: string }[] || []).some((t) => t.status === 'accepted');
    by.get(src)!.requests++; if (won) by.get(src)!.accepted++;
    if (src === 'ads') { const c = r.campaign || '(no campaign id)'; const x = camp.get(c) || blank(); x.requests++; if (won) x.accepted++; camp.set(c, x); }
  }
  const total = [...by.values()].reduce((t, r) => ({ visits: t.visits + r.visits, searched: t.searched + r.searched, quoted: t.quoted + r.quoted, requests: t.requests + r.requests, accepted: t.accepted + r.accepted }), blank());
  const ads = by.get('ads')!;

  const table = (rows: [string, Row][], first: string) => (
    <div style={{ overflowX: 'auto' }}>
      <table className="qt" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead><tr style={{ textAlign: 'left' }}>{[first, 'Visitors', 'Searched', '% searched', 'Quote requests', '% requested', 'Accepted a quote'].map((h) => <th key={h} style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(([k, r]) => (
          <tr key={k}>{[k, r.visits, r.searched, pct(r.searched, r.visits), r.requests, pct(r.requests, r.visits), r.accepted].map((v, i) => <td key={i} style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)', fontWeight: i === 0 ? 600 : 400 }}>{v}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );

  return (
    <main style={{ maxWidth: 960, paddingBlock: '16px 64px', display: 'grid', gap: 18 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <h1 style={{ fontSize: 34, margin: 0 }}>Ad results</h1>
      <p style={{ margin: 0 }}>What each source of visitors produces: people who visited, searched an address, sent a quote request and went on to accept a quote. Your own admin visits aren&apos;t counted.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[7, 30, 90].map((d) => <Link key={d} className={`chip${d === days ? ' on' : ''}`} style={d === days ? { background: 'var(--brand)', color: '#fff' } : undefined} href={`/admin/ads?d=${d}${spend ? `&spend=${spend}` : ''}`}>Last {d} days</Link>)}
      </div>
      {error && <div className="panel" style={{ background: 'var(--tint)' }}>Tracking starts once database update 017 has been run in Supabase.</div>}

      <section className="dash-stats" aria-label="Google Ads at a glance">
        <div className="panel"><b>{ads.visits}</b><span>visitors from Google Ads</span></div>
        <div className="panel"><b>{ads.searched}</b><span>searched an address ({pct(ads.searched, ads.visits)})</span></div>
        <div className="panel"><b>{ads.requests}</b><span>quote requests ({pct(ads.requests, ads.visits)})</span></div>
        <div className="panel"><b>{ads.accepted}</b><span>accepted a quote</span></div>
      </section>

      <form className="panel" method="get" style={{ display: 'grid', gap: 10 }}>
        <input type="hidden" name="d" value={days} />
        <b>Cost per result</b>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>Google Ads spend for the last {days} days (from Google Ads, A$)
          <input name="spend" inputMode="decimal" defaultValue={spend || ''} placeholder="e.g. 250" style={{ maxWidth: 140 }} />
          <button className="btn secondary small" type="submit">Work it out</button>
        </label>
        {spend > 0 && (
          <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
            <div className="stat"><div className="n">{ads.visits ? money(spend / ads.visits) : '–'}</div><div className="t">per visitor</div></div>
            <div className="stat"><div className="n">{ads.requests ? money(spend / ads.requests) : '–'}</div><div className="t">per quote request</div></div>
            <div className="stat"><div className="n">{ads.accepted ? money(spend / ads.accepted) : '–'}</div><div className="t">per accepted quote</div></div>
          </div>
        )}
        <span className="hint">Each accepted quote is worth up to A$99 (a client confirmation on the Free plan), and a manager who upgrades to Pro is worth A$99 a month.</span>
      </form>

      <section className="panel" style={{ display: 'grid', gap: 10 }}>
        <b>All sources</b>
        {table([...SOURCES.map((s) => [sourceLabel[s], by.get(s)!] as [string, Row]).filter(([, r]) => r.visits || r.requests), ['Total', total]], 'Source')}
        <span className="hint">Visitors are browser sessions. Quote requests count each request once, by where that owner first came from in the 30 days before. Accepted counts requests where the owner has accepted at least one quote so far, so recent weeks fill in over time.</span>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 10 }}>
        <b>Visitors by device and source</b>
        <div style={{ overflowX: 'auto' }}>
          <table className="qt" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th rowSpan={2} style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>Source</th>
                {DEV_COLS.map((d) => <th key={d} colSpan={2} style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)', textTransform: 'capitalize' }}>{d}</th>)}
              </tr>
              <tr style={{ textAlign: 'left' }}>
                {DEV_COLS.flatMap((d) => [<th key={`${d}v`} className="hint" style={{ padding: '2px 8px 6px', borderBottom: '1px solid var(--line)', fontWeight: 500 }}>Visitors</th>, <th key={`${d}q`} className="hint" style={{ padding: '2px 8px 6px', borderBottom: '1px solid var(--line)', fontWeight: 500 }}>Requests</th>])}
              </tr>
            </thead>
            <tbody>
              {SOURCES.filter((s) => DEV_COLS.some((d) => dev.get(s)![d].visits || dev.get(s)![d].quoted)).map((s) => (
                <tr key={s}>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)', fontWeight: 600 }}>{sourceLabel[s]}</td>
                  {DEV_COLS.flatMap((d) => [<td key={`${d}v`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>{dev.get(s)![d].visits}</td>, <td key={`${d}q`} style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>{dev.get(s)![d].quoted}</td>])}
                </tr>
              ))}
              <tr>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>Total</td>
                {DEV_COLS.flatMap((d) => [<td key={`${d}v`} style={{ padding: '6px 8px' }}>{SOURCES.reduce((n, s) => n + dev.get(s)![d].visits, 0)}</td>, <td key={`${d}q`} style={{ padding: '6px 8px' }}>{SOURCES.reduce((n, s) => n + dev.get(s)![d].quoted, 0)}</td>])}
              </tr>
            </tbody>
          </table>
        </div>
        <span className="hint">Device comes from the browser&apos;s user agent (iPads in desktop mode count as desktop). Requests here are sessions that sent a quote request. &ldquo;Unknown&rdquo; is visits recorded before device tracking (update 027).</span>
      </section>

      {camp.size > 0 && (
        <section className="panel" style={{ display: 'grid', gap: 10 }}>
          <b>Google Ads by campaign</b>
          {table([...camp.entries()].sort((a, b) => b[1].visits - a[1].visits), 'Campaign id')}
          <span className="hint">Google sends a campaign id with each click. Match it to the campaign in Google Ads (Campaigns → add the &quot;Campaign ID&quot; column).</span>
        </section>
      )}
    </main>
  );
}
