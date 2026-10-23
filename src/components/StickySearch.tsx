'use client';

import { useEffect, useState } from 'react';

/** Phones only: once the hero search scrolls out of view, a slim bar at the bottom takes people back to it. */
export default function StickySearch() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const box = document.querySelector('.hero-search');
    if (!box || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(box);
    return () => io.disconnect();
  }, []);
  if (!show) return null;
  const go = () => {
    const box = document.querySelector<HTMLElement>('.hero-search');
    box?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => box?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }), 450);
  };
  return (
    <div className="sticky-search" role="region" aria-label="Find managers">
      <button type="button" className="btn primary" onClick={go}>Find managers near my property</button>
    </div>
  );
}
