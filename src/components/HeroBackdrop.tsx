'use client';

import { useEffect, useState } from 'react';
import { PHOTOS, src, type PhotoName } from '@/components/Photo';

const ORDER: PhotoName[] = ['bondi', 'yarra', 'byron', 'greatoceanroad', 'bluemountains'];

/** Homepage background photos: cross-fades every 6 seconds, no controls or captions. Holds the first photo for reduced motion. */
export default function HeroBackdrop() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!document.hidden) setI((x) => (x + 1) % ORDER.length); }, 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hh-photo" aria-hidden="true">
      {ORDER.map((n, k) => {
        const id = PHOTOS[n].id;
        return <img key={n} className={k === i ? 'on' : undefined} src={src(id, 1400)} srcSet={[800, 1400, 2000].map((w) => `${src(id, w)} ${w}w`).join(', ')} sizes="(max-width: 880px) 100vw, 65vw" alt="" loading={k === 0 ? 'eager' : 'lazy'} fetchPriority={k === 0 ? 'high' : 'low'} />;
      })}
    </div>
  );
}
