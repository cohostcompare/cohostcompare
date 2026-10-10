'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The hover/tap readout for a WeekBars chart, rendered as plain text under the chart instead of inside the SVG,
 * so it never overlaps the bars or runs off the edge on phones. Reads data-label from the hovered bar group.
 */
export default function BarReadout({ idle }: { idle: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  useEffect(() => {
    const fig = ref.current?.closest('figure');
    const svg = fig?.querySelector('svg');
    if (!svg) return;
    const pick = (e: Event) => {
      const g = (e.target as Element).closest('.wb-bar') as HTMLElement | null;
      setText(g?.dataset.label || '');
    };
    const clear = () => setText('');
    svg.addEventListener('mouseover', pick); svg.addEventListener('mouseleave', clear);
    svg.addEventListener('touchstart', pick, { passive: true });
    return () => { svg.removeEventListener('mouseover', pick); svg.removeEventListener('mouseleave', clear); svg.removeEventListener('touchstart', pick); };
  }, []);
  return <div ref={ref} className={`wb-read${text ? ' on' : ''}`} aria-live="polite">{text || idle}</div>;
}
