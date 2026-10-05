'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Photos a manager supplied, as a carousel: equal tiles, a caption under each, prev/next arrows and a "3 of 7" counter,
 * so it's obvious there are more. Swipes and scrolls too (scroll-snap).
 */
export default function PhotoGallery({ photos, captions, name }: { photos: string[]; captions: Record<string, string>; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const [perView, setPerView] = useState(1);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const tile = el.firstElementChild as HTMLElement | null;
      if (tile) setPerView(Math.max(1, Math.round(el.clientWidth / (tile.offsetWidth + 10))));
      setAt(tile ? Math.round(el.scrollLeft / (tile.offsetWidth + 10)) : 0);
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => { el.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, [photos.length]);

  const go = (dir: 1 | -1) => {
    const el = track.current; const tile = el?.firstElementChild as HTMLElement | null;
    if (!el || !tile) return;
    el.scrollBy({ left: dir * (tile.offsetWidth + 10) * perView, behavior: 'smooth' });
  };
  const last = Math.max(0, photos.length - perView);
  const many = photos.length > perView;

  return (
    <section aria-label={`Homes managed by ${name}`} className="pg">
      <div className="pg-head">
        <p className="hint" style={{ margin: 0 }}>Homes {name} manages. Photos supplied by {name}.</p>
        {many && (
          <div className="pg-nav">
            <span className="hint" aria-live="polite">{Math.min(at + 1, photos.length)}–{Math.min(at + perView, photos.length)} of {photos.length}</span>
            <button type="button" className="pg-btn" onClick={() => go(-1)} disabled={at <= 0} aria-label="Previous photos">‹</button>
            <button type="button" className="pg-btn" onClick={() => go(1)} disabled={at >= last} aria-label="Next photos">›</button>
          </div>
        )}
      </div>
      <div ref={track} className="pg-track" tabIndex={0} role="region" aria-label={`Photos of homes managed by ${name}`}>
        {photos.map((p, i) => (
          <figure key={p}>
            <img src={p} alt={captions[p] ? `${captions[p]}, managed by ${name}` : `A home managed by ${name}`} loading={i < 3 ? 'eager' : 'lazy'} />
            {captions[p] && <figcaption>{captions[p]}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}
