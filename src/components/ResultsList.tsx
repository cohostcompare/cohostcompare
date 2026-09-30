'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import QuoteBar from '@/components/QuoteBar';
import { areaKey, usePicks } from '@/lib/client/picks';
import type { NearbyManager } from '@/lib/types';

const pct = (v: number | null) => (v == null ? null : `${Math.round(v * 100)}%`);
const feeText = (m: NearbyManager) => (m.feeMin == null ? null : m.feeMin === m.feeMax || m.feeMax == null ? `${m.feeMin}%` : `${m.feeMin}–${m.feeMax}%`);

function Avatar({ m, size }: { m: NearbyManager; size?: number }) {
  return (
    <div className="av" aria-hidden="true" style={{ ...(size ? { width: size, height: size, fontSize: size / 3.2 } : {}), ...(m.logoUrl ? { background: '#fff', border: '1px solid var(--line)' } : m.tile ? { background: m.tile.bg, color: m.tile.fg } : {}) }}>
      {m.logoUrl ? <img src={m.logoUrl} alt="" style={{ objectFit: 'contain' }} /> : m.initials}
    </div>
  );
}

export default function ResultsList({ managers, query }: { managers: NearbyManager[]; query: string }) {
  const { picks, toggle, has, full } = usePicks(areaKey(query));
  const [open, setOpen] = useState<NearbyManager | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const addButton = (m: NearbyManager, extra = '') => {
    const on = has(m.slug);
    return (
      <button type="button" className={`btn ${on ? 'primary' : 'secondary'} add ${extra}`} aria-pressed={on}
        onClick={() => toggle({ slug: m.slug, name: m.name })} disabled={!on && full}>
        {on ? '✓ Added to quote' : full ? '5 already picked' : '+ Add to quote'}
      </button>
    );
  };

  return (
    <>
      <div className="results">
        {managers.map((m) => {
          const fee = feeText(m);
          return (
            <article key={m.slug} className={`card clickable${has(m.slug) ? ' selected' : ''}`}>
              <Avatar m={m} />
              <div style={{ minWidth: 0 }}>
                {/* The name link stretches over the whole card. A plain click opens a quick view here; ctrl/cmd-click opens the full profile in a new tab. */}
                <h2><Link className="stretch" href={`/managers/${m.slug}?${query}`} onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                  e.preventDefault(); setOpen(m);
                }}>{m.name}</Link></h2>
                {m.nearby > 0 && <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--brand)', fontSize: 14 }}>{m.nearby} home{m.nearby === 1 ? '' : 's'} managed near you{m.nearbyRating ? ` · ${m.nearbyRating.toFixed(2)} ★ nearby` : ''}</p>}
                <div className="meta">
                  {m.avgRating != null && <span><b>{m.avgRating.toFixed(2)} ★</b> from {m.reviewCount?.toLocaleString('en-AU')} reviews</span>}
                  {m.propertyCount != null && <span><b>{m.propertyCount}</b> homes tracked</span>}
                  {m.avgOccupancy != null && <span><b>{pct(m.avgOccupancy)}</b> nights booked</span>}
                </div>
                <div className="chips">{m.platforms.map((p) => <span className="chip" key={p}>{p}</span>)}{m.cities.map((c) => <span className="chip" key={c} style={{ background: 'transparent', border: '1px solid var(--line)' }}>{c}</span>)}</div>
              </div>
              <div className="side">
                <div className="fee">
                  {fee ? <><span className="n">{fee}</span><span className="s">management fee</span></> : <><span className="n" style={{ fontSize: 17 }}>Fee on request</span><span className="s">included in your quote</span></>}
                </div>
                {addButton(m, 'above')}
                <span className="more" aria-hidden="true">Quick look →</span>
              </div>
            </article>
          );
        })}
      </div>

      <dialog ref={dlg} className="drawer" aria-label={open ? `${open.name} quick look` : 'Manager quick look'}
        onClose={() => setOpen(null)} onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
        {open && (
          <div className="drawer-body">
            <div className="drawer-head">
              <Avatar m={open} size={52} />
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>{open.name}</h2>
                {open.tagline && <p className="hint" style={{ margin: '2px 0 0' }}>{open.tagline}</p>}
              </div>
              <button type="button" className="drawer-x" aria-label="Close" onClick={() => setOpen(null)}>×</button>
            </div>
            <div className="drawer-scroll">
              {open.nearby > 0 && <p style={{ margin: 0, background: 'var(--tint)', borderRadius: 10, padding: '10px 14px', fontWeight: 600 }}>{open.nearby} home{open.nearby === 1 ? '' : 's'} managed near you{open.nearbyRating ? ` · ${open.nearbyRating.toFixed(2)} ★ nearby` : ''}{open.nearestKm != null ? ` · closest about ${open.nearestKm} km away` : ''}</p>}
              <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))' }}>
                <div className="stat"><div className="n">{feeText(open) ?? '—'}</div><div className="t">{feeText(open) ? 'management fee' : 'fee in your quote'}</div></div>
                <div className="stat"><div className="n">{open.avgRating != null ? `${open.avgRating.toFixed(2)} ★` : '—'}</div><div className="t">guest rating</div></div>
                <div className="stat"><div className="n">{open.propertyCount ?? '—'}</div><div className="t">homes tracked</div></div>
                <div className="stat"><div className="n">{pct(open.avgOccupancy) ?? '—'}</div><div className="t">nights booked</div></div>
              </div>
              {(open.photos?.length ?? 0) > 0 && <div className="gallery">{open.photos!.slice(0, 3).map((p) => <img key={p} src={p} alt={`A home managed by ${open.name}`} loading="lazy" />)}</div>}
              {open.about && <p style={{ margin: 0 }}>{open.about}</p>}
              {open.platforms.length > 0 && <div><div className="label">Platforms</div><div className="chips" style={{ marginTop: 6 }}>{open.platforms.map((p) => <span className="chip" key={p}>{p}</span>)}</div></div>}
              {open.services.length > 0 && <div><div className="label">Services</div><div className="chips" style={{ marginTop: 6 }}>{open.services.map((s) => <span className="chip" key={s}>{s}</span>)}</div></div>}
              <p className="hint" style={{ margin: 0 }}>Estimates from public listings. Data source: AirROI (www.airroi.com).</p>
            </div>
            <div className="drawer-foot">
              {addButton(open)}
              <Link className="btn secondary" href={`/managers/${open.slug}?${query}`}>Full profile, map and terms</Link>
              <button type="button" className="linkish" onClick={() => setOpen(null)}>← Back to results</button>
            </div>
          </div>
        )}
      </dialog>

      <QuoteBar picks={picks} query={query} />
    </>
  );
}
