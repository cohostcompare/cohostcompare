'use client';

import { useEffect, useState } from 'react';
import { PHOTOS, src, type PhotoName } from '@/components/Photo';

const SLIDES: { name: PhotoName; place: string }[] = [
  { name: 'bondi', place: 'Bondi, Sydney' },
  { name: 'byron', place: 'Byron Bay' },
  { name: 'yarra', place: 'Melbourne' },
  { name: 'bluemountains', place: 'Blue Mountains' },
  { name: 'greatoceanroad', place: 'Great Ocean Road' },
];

/** Auto-rotating hero photos of launch areas. Pauses on hover and for people who prefer reduced motion. */
export default function HeroCarousel({ sizes }: { sizes: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [paused]);
  return (
    <div className="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Places we cover">
      {SLIDES.map((s, n) => {
        const p = PHOTOS[s.name];
        return (
          <figure key={s.name} className={`slide${n === i ? ' on' : ''}`} aria-hidden={n !== i}>
            <img src={src(p.id, 1200)} srcSet={[480, 800, 1200, 1800].map((w) => `${src(p.id, w)} ${w}w`).join(', ')} sizes={sizes}
              alt={p.alt} loading={n === 0 ? 'eager' : 'lazy'} decoding="async" />
          </figure>
        );
      })}
      <span className="place">{SLIDES[i].place}</span>
      <div className="dots">
        {SLIDES.map((s, n) => <button key={s.name} type="button" aria-label={`Show ${s.place}`} aria-current={n === i} onClick={() => { setI(n); setPaused(true); }} />)}
      </div>
    </div>
  );
}
