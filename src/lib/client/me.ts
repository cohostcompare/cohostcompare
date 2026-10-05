'use client';

import { useEffect, useState } from 'react';

export type Me = { email: string | null; isAdmin?: boolean; isManager?: boolean; managers?: { slug: string; name: string }[]; unread?: number; todos?: { id: string; label: string; manager: string }[]; ask?: boolean };

// One request per page load, shared by every component that asks.
let cache: Me | null = null;
let inflight: Promise<Me> | null = null;
const listeners = new Set<(m: Me) => void>();

export function fetchMe(): Promise<Me> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { email: null }))
      .catch(() => ({ email: null }))
      .then((m: Me) => { cache = m; listeners.forEach((l) => l(m)); return m; });
  }
  return inflight;
}

/** Who's signed in (null while loading, { email: null } when nobody). */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(cache);
  useEffect(() => {
    if (cache) { setMe(cache); return; }
    listeners.add(setMe);
    fetchMe();
    return () => { listeners.delete(setMe); };
  }, []);
  return me;
}

/** Forget what we know (after sign-out or sign-in). */
export function resetMe() { cache = null; inflight = null; }
