import type { Metadata } from 'next';
import Link from 'next/link';
import { searchDemand } from '@/lib/events';
import { requireManager } from '@/lib/managers';
import { foundingDeadlineText, isPro, PRO_FEATURES, PRO_PRICE } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';
import ProInterest from '../../ProInterest';

export const metadata: Metadata = { title: 'Insights', robots: { index: false } };
export const dynamic = 'force-dynamic';

type P = Promise<{ slug: string }>;

const median = (xs: number[]) => { const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b); if (!s.length) return null; const i = Math.floor(s.length / 2); return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };
const pct = (x: number) => `${Math.round(x * 10) / 10}%`;
const hours = (h: number) => (h < 1 ? 'under an hour' : h < 48 ? `${Math.round(h)} hours` : `${Math.round(h / 24)} days`);

function Compare({ label, you, them, better, fmt, n }: { label: string; you: number | null; them: number | null; better: 'low' | 'high'; fmt: (x: number) => string; n: number }) {
  let note = 'Not enough data yet';
  if (you != null && them != null) {
    const diff = you - them;
    const same = Math.abs(diff) < Math.abs(them) * 0.03;
    note = same ? 'About the same as the local median' : (diff < 0) === (better === 'low') ? 'Better than the local median' : 'Behind the local median';
  }
  return (
    <div className="panel" style={{ display: 'grid', gap: 4 }}>
      <span className="label">{label}</span>
      <div style={{ display: 'flex', gap: 18, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span><b style={{ fontFamily: 'var(--display)', fontSize: 28 }}>{you != null ? fmt(you) : '–'}</b> <span className="hint">you</span></span>
        <span><b style={{ fontSize: 18 }}>{them != null ? fmt(them) : '–'}</b> <span className="hint">median of {n} nearby</span></span>
      </div>
      <span className="hint">{note}</span>
    </div>
  );
}

export default async function Insights({ params }: { params: P }) {
  const { slug } = await params;
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/insights`);
  const db = adminClient();
  const { data: pro } = await db.from('managers').select('pro_until, pro_note, cities').eq('id', m.id).maybeSingle(); // needs 012
  const active = Boolean(pro && isPro(pro));

  if (!active) {
    return (
      <main style={{ maxWidth: 820, paddingBlock: '16px 64px', display: 'grid', gap: 18 }}>
        <Link href="/dashboard" className="hint">← Dashboard</Link>
        <span className="label">CoHostCompare Pro</span>
        <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: 0 }}>Insights for {m.name}</h1>
        <p className="lede" style={{ margin: 0 }}>Pro adds tools for your business. It never changes where you appear, your ratings or how owners compare quotes.</p>
        <ul className="ticks">{PRO_FEATURES.map((f) => <li key={f.title} className={f.live ? 'done' : ''}><b>{f.title}.</b> {f.body}{f.live ? '' : ' (coming soon)'}</li>)}</ul>
        <ProInterest managerId={m.id} />
        <p className="hint" style={{ margin: 0 }}>Managers who claim by {foundingDeadlineText()} get Pro free for three months. After that it&apos;s {PRO_PRICE}, and we&apos;ll always ask before charging anything. Running homes in several regions? See <Link href="/managers#pricing">Enterprise</Link>.</p>
      </main>
    );
  }

  // Peers: other published managers covering any of the same postcodes (or, failing that, the same regions).
  const cities = ((pro as { cities?: string[] } | null)?.cities) || [];
  const peerQ = db.from('managers').select('id, fee_min, fee_max').eq('published', true).neq('id', m.id);
  const { data: peers } = m.postcodes.length ? await peerQ.overlaps('postcodes', m.postcodes) : cities.length ? await peerQ.overlaps('cities', cities) : { data: [] };
  const ids = [m.id, ...(peers || []).map((p) => p.id)];
  const { data: stats } = await db.from('manager_stats').select('manager_id, property_count, avg_rating').in('manager_id', ids.slice(0, 300));
  const st = new Map((stats || []).map((s) => [s.manager_id, s]));
  const mine = st.get(m.id);
  const peerFees = (peers || []).filter((p) => p.fee_min != null).map((p) => (Number(p.fee_min) + Number(p.fee_max ?? p.fee_min)) / 2);
  const myFee = m.fee_min != null ? (Number(m.fee_min) + Number(m.fee_max ?? m.fee_min)) / 2 : null;
  const peerRatings = (peers || []).map((p) => Number(st.get(p.id)?.avg_rating)).filter((x) => x > 0);
  const peerHomes = (peers || []).map((p) => Number(st.get(p.id)?.property_count)).filter((x) => x > 0);
  const myHomes = Number(mine?.property_count) || 0;
  const homesRank = myHomes ? [...peerHomes, myHomes].sort((a, b) => b - a).indexOf(myHomes) + 1 : null;

  // Quote results.
  const { data: threads } = await db.from('quote_request_managers').select('request_id, status, quote, quoted_at, created_at').eq('manager_slug', m.slug);
  const got = threads || [];
  const quoted = got.filter((t) => t.quote);
  const won = got.filter((t) => t.status === 'accepted').length;
  const myHours = median(quoted.map((t) => (new Date(t.quoted_at).getTime() - new Date(t.created_at).getTime()) / 3600e3));
  const { data: allQuoted } = await db.from('quote_request_managers').select('manager_slug, request_id, quote, quoted_at, created_at').not('quoted_at', 'is', null).limit(5000);
  const siteHours = median((allQuoted || []).map((t) => (new Date(t.quoted_at).getTime() - new Date(t.created_at).getTime()) / 3600e3));
  // Other quotes on the same requests, shown only as a median of at least 3 so no single quote can be worked out.
  const reqIds = new Set(quoted.map((t) => t.request_id));
  const rivalFees = (allQuoted || []).filter((t) => reqIds.has(t.request_id) && t.manager_slug !== m.slug && t.quote).map((t) => Number((t.quote as { feePct: number }).feePct));
  const myQuoteFee = median(quoted.map((t) => Number((t.quote as { feePct: number }).feePct)));

  // Owner demand in their postcodes: last 30 days vs the 30 before.
  const d60 = await searchDemand(m.postcodes, 60);
  const d30 = await searchDemand(m.postcodes, 30);
  const demand = m.postcodes.map((pc) => ({ pc, suburb: d30.get(pc)?.suburb || d60.get(pc)?.suburb || null, now: d30.get(pc)?.count || 0, before: (d60.get(pc)?.count || 0) - (d30.get(pc)?.count || 0) }))
    .sort((a, b) => b.now - a.now);
  const totalNow = demand.reduce((s, x) => s + x.now, 0), totalBefore = demand.reduce((s, x) => s + x.before, 0);

  // Weekly search appearances and views, last 8 weeks.
  const since = new Date(Date.now() - 56 * 86400e3).toISOString().slice(0, 10);
  const { data: ev } = await db.from('manager_events').select('kind, day, count').eq('manager_id', m.id).gte('day', since);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = Date.now() - i * 7 * 86400e3, start = end - 7 * 86400e3;
    const inWeek = (ev || []).filter((e) => { const t = new Date(e.day).getTime(); return t >= start && t < end; });
    return { label: new Date(start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }), search: inWeek.filter((e) => e.kind === 'search').reduce((s, e) => s + e.count, 0), view: inWeek.filter((e) => e.kind === 'view').reduce((s, e) => s + e.count, 0) };
  }).reverse();
  const maxWeek = Math.max(1, ...weeks.map((w) => w.search));

  return (
    <main style={{ maxWidth: 920, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      <Link href="/dashboard" className="hint">← Dashboard</Link>
      <div>
        <span className="label">CoHostCompare Pro{pro?.pro_note === 'founding' ? ' · founding manager' : ''}</span>
        <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: 0 }}>Insights for {m.name}</h1>
        <p className="hint" style={{ margin: '4px 0 0' }}>Pro is free for you until {new Date(pro!.pro_until!).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}. Nothing here changes where you appear or what owners see.</p>
      </div>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Benchmarks</h2>
        <p className="hint" style={{ margin: 0 }}>Compared with {peers?.length ?? 0} other managers covering {m.postcodes.length ? 'at least one of your postcodes' : 'your regions'}. Add every postcode you cover in <Link href={`/dashboard/${m.slug}/edit`}>your profile</Link> for a sharper comparison.</p>
        <div className="dash-stats">
          <Compare label="Management fee (midpoint)" you={myFee} them={median(peerFees)} better="low" fmt={pct} n={peerFees.length} />
          <Compare label="Guest rating" you={Number(mine?.avg_rating) || null} them={median(peerRatings)} better="high" fmt={(x) => `${x.toFixed(2)} ★`} n={peerRatings.length} />
          <Compare label="Time to send a quote" you={myHours} them={siteHours} better="low" fmt={hours} n={(allQuoted || []).length} />
        </div>
        <p className="hint" style={{ margin: 0 }}>{homesRank ? `You run ${myHomes} Airbnb homes we track, the ${homesRank === 1 ? 'most' : `#${homesRank} most`} of ${peerHomes.length + 1} managers here.` : 'We don’t track any Airbnb homes for you yet, so ratings and home counts can’t be compared.'} Guest ratings and home counts are estimates from public listings.</p>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Owner demand in your postcodes</h2>
        {!m.postcodes.length ? (
          <p className="panel" style={{ margin: 0 }}>Add the postcodes you cover in <Link href={`/dashboard/${m.slug}/edit`}>your profile</Link> to see how many owners are searching there.</p>
        ) : (
          <>
            <p style={{ margin: 0 }}><b>{totalNow}</b> owner search{totalNow === 1 ? '' : 'es'} in the last 30 days{totalBefore ? `, ${totalNow >= totalBefore ? 'up' : 'down'} from ${totalBefore} the 30 days before` : ''}.</p>
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              {demand.slice(0, 15).map((d) => (
                <div key={d.pc} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: 16, padding: '10px 18px', borderTop: '1px solid var(--line)' }}>
                  <span>{d.suburb ? `${d.suburb} ` : ''}<span className="hint">{d.pc}</span></span>
                  <b>{d.now}</b>
                  <span className="hint" style={{ minWidth: 70, textAlign: 'right' }}>{d.before ? `${d.now >= d.before ? '▲' : '▼'} ${d.before} before` : d.now ? 'new' : ''}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Quote results</h2>
        <div className="dash-stats">
          <div className="panel"><b>{got.length}</b><span>quote requests received</span></div>
          <div className="panel"><b>{quoted.length}</b><span>quotes sent</span></div>
          <div className="panel"><b>{quoted.length ? `${Math.round((won / quoted.length) * 100)}%` : '–'}</b><span>of quotes accepted ({won})</span></div>
          <div className="panel"><b>{myQuoteFee != null ? pct(myQuoteFee) : '–'}</b><span>your typical quoted fee{rivalFees.length >= 3 ? `; others quoting the same owners: ${pct(median(rivalFees)!)}` : ''}</span></div>
        </div>
        <p className="hint" style={{ margin: 0 }}>Other managers&apos; quotes are only shown as a median of three or more, so no single quote can be identified.</p>
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Search appearances by week</h2>
        <div className="panel" style={{ display: 'grid', gap: 6 }}>
          {weeks.map((w) => (
            <div key={w.label} style={{ display: 'grid', gridTemplateColumns: '64px minmax(0,1fr) 90px', gap: 10, alignItems: 'center', fontSize: 14 }}>
              <span className="hint">{w.label}</span>
              <div className="meter"><span style={{ width: `${(w.search / maxWeek) * 100}%` }} /></div>
              <span>{w.search} · <span className="hint">{w.view} views</span></span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 6 }}>
        <b>Also in Pro</b>
        <ul className="ticks">{PRO_FEATURES.filter((f) => !f.live).map((f) => <li key={f.title}><b>{f.title}</b> (coming soon). {f.body}</li>)}<li className="done"><b>More photos.</b> Up to 24 photos on your profile.</li></ul>
      </section>
    </main>
  );
}
