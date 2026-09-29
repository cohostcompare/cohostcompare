'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { loadMaps } from './PlacesInput';

type Area = { area: string; homes: number; lat: number; lng: number };

// Group suburbs into metro regions so national managers don't show as dots on a map of Australia.
const METROS = [
  { name: 'Sydney', lat: -33.87, lng: 151.21 }, { name: 'Melbourne', lat: -37.81, lng: 144.96 },
  { name: 'Brisbane', lat: -27.47, lng: 153.03 }, { name: 'Gold Coast', lat: -28.02, lng: 153.4 },
  { name: 'Perth', lat: -31.95, lng: 115.86 }, { name: 'Adelaide', lat: -34.93, lng: 138.6 },
  { name: 'Canberra', lat: -35.28, lng: 149.13 }, { name: 'Hobart', lat: -42.88, lng: 147.33 },
];
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180, x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return 6371 * Math.sqrt(x * x + y * y);
};
const regionOf = (p: { lat: number; lng: number }) => {
  const best = METROS.map((m) => ({ m, d: km(p, m) })).sort((a, b) => a.d - b.d)[0];
  return best.d < 120 ? best.m.name : 'Regional';
};

/** Map of the suburbs a manager operates in, one metro region at a time. */
export default function AreaMap({ areas, name, near }: { areas: Area[]; name: string; near?: { lat: number; lng: number } | null }) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  const regions = useMemo(() => {
    const g = new Map<string, Area[]>();
    for (const a of areas) { const r = regionOf(a); g.set(r, [...(g.get(r) || []), a]); }
    return [...g.entries()].map(([region, list]) => ({ region, list, homes: list.reduce((s, a) => s + a.homes, 0) })).sort((a, b) => b.homes - a.homes);
  }, [areas]);
  // Start on the owner's own city when we know it, otherwise the manager's biggest region.
  const initial = near ? regionOf(near) : regions[0]?.region;
  const [region, setRegion] = useState(regions.some((r) => r.region === initial) ? initial : regions[0]?.region);
  const current = regions.find((r) => r.region === region) || regions[0];

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    loadMaps()
      .then(async () => {
        const g = window.google.maps;
        const { Map, Circle, InfoWindow, Marker } = await g.importLibrary('maps').then(async (m: any) => ({ ...m, ...(await g.importLibrary('marker')) })); // eslint-disable-line @typescript-eslint/no-explicit-any
        if (cancelled || !el.current) return;
        const map = new Map(el.current, {
          disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative', clickableIcons: false,
          styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] }],
        });
        const bounds = new g.LatLngBounds();
        const info = new InfoWindow();
        const max = Math.max(...current.list.map((a) => a.homes));
        for (const a of current.list) {
          const c = new Circle({
            map, center: { lat: a.lat, lng: a.lng }, radius: 300 + 700 * Math.sqrt(a.homes / max),
            fillColor: '#0F5E57', fillOpacity: 0.4, strokeColor: '#0F5E57', strokeOpacity: 0.9, strokeWeight: 1.5, clickable: true,
          });
          c.addListener('click', () => { info.setContent(`<b>${a.area}</b><br>${a.homes} homes`); info.setPosition({ lat: a.lat, lng: a.lng }); info.open({ map }); });
          bounds.extend({ lat: a.lat, lng: a.lng });
        }
        if (near && regionOf(near) === current.region) {
          if (Marker) new Marker({ map, position: near, title: 'Your property' });
          bounds.extend(near);
        }
        map.fitBounds(bounds, 48);
        g.event.addListenerOnce(map, 'idle', () => { if (map.getZoom() > 14) map.setZoom(14); if (map.getZoom() < 10) map.setZoom(10); });
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [current, near]);

  if (!areas.length) return null;
  return (
    <section className="panel" style={{ display: 'grid', gap: 12, padding: 0, overflow: 'hidden' }} aria-label={`Where ${name} runs homes`}>
      {regions.length > 1 && (
        <div role="tablist" aria-label="Region" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '14px 18px 0' }}>
          {regions.map((r) => (
            <button key={r.region} role="tab" aria-selected={r.region === current?.region} type="button" onClick={() => setRegion(r.region)}
              className={`btn ${r.region === current?.region ? 'primary' : 'secondary'}`} style={{ minHeight: 34, padding: '0 12px', fontSize: 14 }}>
              {r.region} · {r.homes} homes
            </button>
          ))}
        </div>
      )}
      {!failed && <div ref={el} style={{ height: 320, width: '100%', background: 'var(--tint)' }} role="img" aria-label={`Map of suburbs in ${current?.region} where ${name} runs homes`} />}
      <div style={{ padding: '0 18px 16px', display: 'grid', gap: 8 }}>
        <div className="label">Where they run homes{regions.length > 1 ? ` in ${current?.region}` : ''}</div>
        <div className="chips">
          {[...(current?.list || [])].sort((a, b) => b.homes - a.homes).map((a) => <span className="chip" key={a.area}>{a.area} · {a.homes}</span>)}
        </div>
      </div>
    </section>
  );
}
