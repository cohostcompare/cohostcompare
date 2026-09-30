import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { newBusinesses, sweepBudget } from '@/lib/jobs/data';
import { adminClient } from '@/lib/supabase/server';
import { addArea, addHotspots, addPresetAreas, runSeed, sweepMany, sweepNext } from './actions';

export const metadata: Metadata = { title: 'Data · Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type SP = Promise<{ done?: string; error?: string; find?: string }>;

export default async function AdminData({ searchParams }: { searchParams: SP }) {
  await requireAdmin('/admin/data');
  const sp = await searchParams;
  const db = adminClient();
  const [{ data: cells }, { count: listings }] = await Promise.all([
    db.from('sweep_cells').select('*').order('id'),
    db.from('str_listings').select('listing_id', { count: 'exact', head: true }),
  ]);
  const calls = (cells || []).reduce((s, c) => s + (c.calls_used || 0), 0);
  const open = (cells || []).filter((c) => !c.done).length;
  const budget = await sweepBudget().catch(() => null);
  const enabled = process.env.AIRROI_SWEEP_ENABLED === '1';
  const found = sp.find ? await newBusinesses(6).catch(() => null) : null;

  return (
    <main style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <div>
        <h1 style={{ fontSize: 34, margin: 0 }}>Listing data</h1>
        <p className="hint" style={{ margin: '4px 0 0' }}>{(listings ?? 0).toLocaleString('en-AU')} listings stored · {calls.toLocaleString('en-AU')} AirROI calls used (about US${(calls * 0.5).toFixed(2)} at US$0.50 a call) · {open} of {(cells || []).length} areas still to fetch</p>
      </div>
      {sp.error && <div role="alert" className="panel" style={{ borderColor: 'var(--signal)' }}>{sp.error}</div>}
      {sp.done && <div role="status" className="panel" style={{ background: 'var(--tint)' }}>{sp.done}</div>}

      <section className="panel" style={{ display: 'grid', gap: 10 }}>
        <b>Fetch listings</b>
        <p className="hint" style={{ margin: 0 }}>AirROI charges US$0.50 per call (10 listings). We fetch only professionally managed homes, at most 10 calls (US$5) per area. {enabled ? (budget?.budget ? <>Budget <b>US${budget.budget}</b>: <b>US${budget.spent.toFixed(2)}</b> spent, <b>US${budget.left.toFixed(2)}</b> left.</> : 'Set AIRROI_BUDGET_USD in Vercel to start.') : 'Fetching is switched off (AIRROI_SWEEP_ENABLED isn’t 1).'}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <form action={sweepMany}><button className="btn primary" type="submit" disabled={!enabled || !budget?.left}>Fetch remaining areas (keeps within budget)</button></form>
          <form action={addHotspots}><button className="btn secondary" type="submit">Add NSW and VIC holiday areas</button></form>
          <form action={addPresetAreas}><button className="btn secondary" type="submit">Add all Sydney and Melbourne areas</button></form>
          <form action={runSeed}><button className="btn secondary" type="submit">Update researched profiles</button></form>
          <Link className="btn secondary" href="/admin/data?find=1">Find businesses without a profile</Link>
        </div>
      </section>

      {found && (
        <section className="panel" style={{ display: 'grid', gap: 6 }}>
          <b>Businesses in the data without a profile ({found.length})</b>
          <p className="hint" style={{ margin: 0 }}>Ask Claude to research these and add the identifiable businesses. Individuals aren&apos;t given profiles unless they claim one.</p>
          {found.slice(0, 80).map((b) => (
            <div key={b.accounts.join()} style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}>
              <b>{b.name}</b> <span className="hint">· {b.listings} homes{b.avgRating ? ` · ${b.avgRating} ★` : ''} · {b.business ? 'business' : 'possibly an individual'} · {b.localities.join(', ')}</span>
            </div>
          ))}
        </section>
      )}

      <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--tint)' }}><b>Areas</b></div>
        {(cells || []).map((c) => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
            <span><b>{c.label}</b> <span className="hint">· {c.listings_seen} listings · {c.calls_used} calls · {c.done ? 'finished' : 'more to fetch'}</span></span>
            {!c.done && process.env.AIRROI_SWEEP_ENABLED === '1' && <form action={sweepNext}><input type="hidden" name="cell" value={c.id} /><button className="btn secondary small" type="submit">Fetch</button></form>}
          </div>
        ))}
        <form action={addArea} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
          <input className="field" name="label" placeholder="Area name, e.g. Byron Bay" style={{ maxWidth: 220 }} required />
          <input className="field" name="lat" placeholder="Latitude, e.g. -28.64" style={{ maxWidth: 170 }} required />
          <input className="field" name="lng" placeholder="Longitude, e.g. 153.61" style={{ maxWidth: 170 }} required />
          <input className="field" name="radius" placeholder="Radius (miles)" defaultValue="1.5" style={{ maxWidth: 130 }} />
          <button className="btn secondary" type="submit">Add area</button>
        </form>
      </section>
    </main>
  );
}
