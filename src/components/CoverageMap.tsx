'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadMaps } from './PlacesInput';

export type CoverageArea = { slug: string; label: string; city: string; lat: number; lng: number };

/** Map of every area we compare managers in, grouped by city or holiday region. Each dot links to its area page. */
export default function CoverageMap({ areas, compact, hideList }: { areas: CoverageArea[]; compact?: boolean; hideList?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const groups = useMemo(() => [...new Set(areas.map((a) => a.city))], [areas]);
  const [group, setGroup] = useState<string>('All');
  const [more, setMore] = useState(false);
  const FEW = 8;
  const shown = group === 'All' ? areas : areas.filter((a) => a.city === group);

  useEffect(() => {
    if (!shown.length) return;
    let cancelled = false;
    loadMaps().then(async () => {
      const g = window.google.maps;
      const { Map, Circle, InfoWindow } = await g.importLibrary('maps'); // eslint-disable-line @typescript-eslint/no-explicit-any
      if (cancelled || !el.current) return;
      const map = new Map(el.current, {
        disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative', clickableIcons: false,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] }],
      });
      const bounds = new g.LatLngBounds();
      const info = new InfoWindow();
      for (const a of shown) {
        const c = new Circle({ map, center: { lat: a.lat, lng: a.lng }, radius: group === 'All' ? 9000 : 2500, fillColor: '#0F5E57', fillOpacity: 0.45, strokeColor: '#0F5E57', strokeOpacity: 0.9, strokeWeight: 1.5, clickable: true });
        c.addListener('click', () => {
          info.setContent(`<div style="font:14px system-ui"><b>${a.label}</b><br><a href="/areas/${a.slug}">Compare managers here →</a></div>`);
          info.setPosition({ lat: a.lat, lng: a.lng }); info.open({ map });
        });
        bounds.extend({ lat: a.lat, lng: a.lng });
      }
      map.fitBounds(bounds, 32);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [shown, group]);

  if (!areas.length) return null;
  return (
    <div className="cov-map">
      <div role="tablist" aria-label="Region" className="cov-tabs">
        {['All', ...groups].map((x) => (
          <button key={x} role="tab" type="button" aria-selected={group === x} className={`btn small ${group === x ? 'primary' : 'secondary'}`} onClick={() => { setGroup(x); setMore(false); }}>{x === 'All' ? 'All areas' : x}</button>
        ))}
      </div>
      {!failed && <div ref={el} className="cov-canvas" style={{ height: compact ? 300 : 380 }} role="img" aria-label={`Map of the ${shown.length} areas we cover${group === 'All' ? '' : ` in ${group}`}`} />}
      <div className="cov-list">
        <span className="hint">{shown.length} area{shown.length === 1 ? '' : 's'}{group === 'All' ? '' : ` in ${group}`}. More areas coming soon.</span>
        {!hideList && (
          <div className="chips">
            {(more ? shown : shown.slice(0, FEW)).map((a) => <Link key={a.slug} className="chip" href={`/areas/${a.slug}`}>{a.label}</Link>)}
            {shown.length > FEW && <button type="button" className="chip chip-more" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Show fewer' : `Show ${shown.length - FEW} more`}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
