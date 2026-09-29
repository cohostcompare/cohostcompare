'use client';

import { useEffect, useRef, useState } from 'react';
import { loadMaps } from './PlacesInput';

type Area = { area: string; homes: number; lat: number; lng: number };

/** Map of the suburbs a manager operates in: one circle per suburb, sized by number of homes. */
export default function AreaMap({ areas, name }: { areas: Area[]; name: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!areas.length) return;
    let cancelled = false;
    loadMaps()
      .then(async () => {
        const g = window.google.maps;
        const { Map, Circle, InfoWindow } = await g.importLibrary('maps');
        if (cancelled || !el.current) return;
        const map = new Map(el.current, {
          disableDefaultUI: true, zoomControl: true, gestureHandling: 'cooperative', clickableIcons: false,
          styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }, { featureType: 'transit', stylers: [{ visibility: 'off' }] }],
        });
        const bounds = new g.LatLngBounds();
        const info = new InfoWindow();
        const max = Math.max(...areas.map((a) => a.homes));
        for (const a of areas) {
          const c = new Circle({
            map, center: { lat: a.lat, lng: a.lng }, radius: 350 + 900 * Math.sqrt(a.homes / max),
            fillColor: '#0F5E57', fillOpacity: 0.35, strokeColor: '#0F5E57', strokeOpacity: 0.8, strokeWeight: 1.5, clickable: true,
          });
          c.addListener('click', () => { info.setContent(`<b>${a.area}</b><br>${a.homes} homes`); info.setPosition({ lat: a.lat, lng: a.lng }); info.open({ map }); });
          bounds.extend({ lat: a.lat, lng: a.lng });
        }
        map.fitBounds(bounds, 40);
        if (areas.length === 1) map.setZoom(13);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [areas]);

  if (!areas.length) return null;
  return (
    <section className="panel" style={{ display: 'grid', gap: 12, padding: 0, overflow: 'hidden' }} aria-label={`Where ${name} runs homes`}>
      {!failed && <div ref={el} style={{ height: 300, width: '100%', background: 'var(--tint)' }} role="img" aria-label={`Map of suburbs where ${name} runs homes`} />}
      <div style={{ padding: '0 18px 16px', display: 'grid', gap: 8 }}>
        <div className="label">Where they run homes</div>
        <div className="chips">
          {[...areas].sort((a, b) => b.homes - a.homes).map((a) => <span className="chip" key={a.area}>{a.area} · {a.homes}</span>)}
        </div>
      </div>
    </section>
  );
}
