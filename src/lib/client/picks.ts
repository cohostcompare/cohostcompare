'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The owner's "managers to request quotes from" list, kept for this browser tab so it survives moving between
 * the results page and full profiles. It's tied to the searched location: a new address starts a fresh list.
 */
export const MAX_PICKS = 5;
export type Pick = { slug: string; name: string };
const KEY = 'cc-picks';
const EVT = 'cc-picks-change';

function read(area: string): Pick[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null') as { area: string; picks: Pick[] } | null;
    return v && v.area === area && Array.isArray(v.picks) ? v.picks.slice(0, MAX_PICKS) : [];
  } catch { return []; }
}

export function usePicks(area: string) {
  const [picks, setPicks] = useState<Pick[]>([]);
  useEffect(() => {
    const sync = () => setPicks(read(area));
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, [area]);
  const save = useCallback((next: Pick[]) => {
    setPicks(next);
    try { sessionStorage.setItem(KEY, JSON.stringify({ area, picks: next })); } catch { /* private mode: in-memory only */ }
    window.dispatchEvent(new Event(EVT));
  }, [area]);
  const toggle = useCallback((p: Pick) => {
    const base = picks;
    save(base.some((x) => x.slug === p.slug) ? base.filter((x) => x.slug !== p.slug) : base.length >= MAX_PICKS ? base : [...base, p]);
  }, [area, picks, save]);
  return { picks, toggle, has: (slug: string) => picks.some((x) => x.slug === slug), full: picks.length >= MAX_PICKS };
}

/** Area key from the search query: the searched point, else the postcode. */
export function areaKey(query: string) {
  const q = new URLSearchParams(query);
  return q.get('lat') && q.get('lng') ? `${q.get('lat')},${q.get('lng')}` : q.get('postcode') || 'any';
}

/** Removes a manager from the saved quote list, whatever the area (used by the quote form). */
export function removePick(slug: string) {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null') as { area: string; picks: Pick[] } | null;
    if (v) sessionStorage.setItem(KEY, JSON.stringify({ ...v, picks: (v.picks || []).filter((p) => p.slug !== slug) }));
    window.dispatchEvent(new Event(EVT));
  } catch { /* fine */ }
}
