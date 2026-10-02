import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';
import { setVisibility } from '../actions';

export const metadata: Metadata = { title: 'Manager audit', robots: { index: false } };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/*
 Checks that published profiles are businesses that manage short-term rentals FOR owners, not hotels,
 serviced-apartment operators or booking sites. Reads each manager's own website (25 at a time) and
 looks for owner-management wording vs hotel/booking wording. It only flags: Ben decides what to hide.
*/
const OWNER = /property management|holiday (rental|letting|home) management|short[- ]?(term|stay) (rental )?management|airbnb (property )?management|co-?host|list your (home|property)|for (home|property) ?owners|management fee|rental appraisal|earnings? (estimate|report)|we manage|manage your (home|property)|owner (portal|statement)/i;
const HOTEL = /\bhotels?\b|\bresort\b|serviced apartments?|book (now|your stay|direct)|check availability|best rate guarantee|our rooms/i;
const BATCH = 25;

type Row = { id: string; slug: string; name: string; website: string | null; claimed: boolean };
type Verdict = { kind: 'ok' | 'check' | 'nosite' | 'error'; note: string };

async function check(m: Row): Promise<Verdict> {
  if (!m.website) return { kind: 'nosite', note: 'No website on file' };
  const url = /^https?:\/\//.test(m.website) ? m.website : `https://${m.website}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { 'User-Agent': 'Mozilla/5.0 (CoHostCompare profile check; hello@cohostcompare.com)' }, redirect: 'follow', cache: 'no-store' });
    const html = (await r.text()).slice(0, 400000);
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const own = text.match(OWNER)?.[0], hotel = text.match(HOTEL)?.[0];
    if (own) return { kind: 'ok', note: `Mentions “${own.toLowerCase()}”${hotel ? ` (also “${hotel.toLowerCase()}”)` : ''}` };
    if (hotel) return { kind: 'check', note: `No owner-management wording found; mentions “${hotel.toLowerCase()}”` };
    return { kind: 'check', note: r.ok ? 'No owner-management wording found on the home page' : `Website returned ${r.status}` };
  } catch (e) {
    return { kind: 'error', note: /timeout|abort/i.test(String(e)) ? 'Website took too long to load' : 'Website didn’t load' };
  }
}

export default async function Audit({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  await requireAdmin('/admin/managers/audit');
  const from = Math.max(0, Number((await searchParams).from) || 0);
  const db = adminClient();
  const { count } = await db.from('managers').select('id', { count: 'exact', head: true }).eq('published', true);
  const { data } = await db.from('managers').select('id, slug, name, website, claimed').eq('published', true).order('name').range(from, from + BATCH - 1);
  const rows = (data || []) as Row[];
  const verdicts = await Promise.all(rows.map(check));
  const order = { check: 0, error: 1, nosite: 2, ok: 3 } as const;
  const list = rows.map((m, i) => ({ m, v: verdicts[i] })).sort((a, b) => order[a.v.kind] - order[b.v.kind]);
  const total = count ?? 0;
  const here = `/admin/managers/audit?from=${from}`;
  const label = { ok: ['Manages for owners', 'st-won'], check: ['Check this one', 'st-late'], error: ['Site didn’t load', 'st-wait'], nosite: ['No website', 'st-lost'] } as const;
  return (
    <main className="admin" style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin/managers" className="hint">← Managers</Link>
      <h1 style={{ fontSize: 34, margin: 0 }}>Manager audit</h1>
      <p style={{ margin: 0 }}>Checks each published manager&apos;s own website for wording about managing homes for owners, versus hotel or booking wording, so you can spot anything that isn&apos;t a short-term rental manager. It only flags; nothing is hidden unless you hide it. Showing {from + 1}–{Math.min(from + BATCH, total)} of {total}, flagged ones first.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {from > 0 && <Link className="btn secondary small" href={`/admin/managers/audit?from=${Math.max(0, from - BATCH)}`}>← Previous {BATCH}</Link>}
        {from + BATCH < total && <Link className="btn primary small" href={`/admin/managers/audit?from=${from + BATCH}`}>Next {BATCH} →</Link>}
      </div>
      {list.map(({ m, v }) => (
        <article key={m.id} className="panel" style={{ display: 'grid', gap: 6, borderLeft: v.kind === 'check' ? '5px solid var(--signal)' : undefined }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <Link href={`/managers/${m.slug}`}><b>{m.name}</b></Link>
            <span className={`st ${label[v.kind][1]}`}>{label[v.kind][0]}</span>
            {m.claimed && <span className="hint">Claimed</span>}
            <span className="hint" style={{ marginLeft: 'auto' }}>
              {m.website ? <a href={/^https?:\/\//.test(m.website) ? m.website : `https://${m.website}`} target="_blank" rel="noopener">{m.website.replace(/^https?:\/\//, '')} ↗</a> : <a href={`https://www.google.com/search?q=${encodeURIComponent(`${m.name} Airbnb management`)}`} target="_blank" rel="noopener">Search Google ↗</a>}
            </span>
          </div>
          <span className="hint">{v.note}</span>
          {v.kind !== 'ok' && (
            <form action={setVisibility} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input type="hidden" name="id" value={m.id} /><input type="hidden" name="q" value="" /><input type="hidden" name="back" value={here} />
              <input className="field" name="reason" placeholder="Reason, e.g. hotel, not a manager" required style={{ minHeight: 34, maxWidth: 280 }} />
              <button className="btn secondary small" type="submit">Hide profile</button>
            </form>
          )}
        </article>
      ))}
    </main>
  );
}
