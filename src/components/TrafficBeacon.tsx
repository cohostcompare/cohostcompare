'use client';
import { useEffect } from 'react';

/** Tells /api/visit how this session arrived (ad, search, link...). Once per session, plus on any new ad click. */
export default function TrafficBeacon() {
  useEffect(() => {
    try {
      const q = location.search;
      const ad = /[?&](gclid|gbraid|wbraid|utm_source)=/.test(q);
      let seen = false;
      try { seen = sessionStorage.getItem('cc_v') === '1'; } catch { /* storage blocked */ }
      if (seen && !ad) return;
      fetch('/api/visit', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: location.pathname, q: q.replace(/^\?/, ''), ref: document.referrer }) }).catch(() => {});
      try { sessionStorage.setItem('cc_v', '1'); } catch { /* fine */ }
    } catch { /* never break the page */ }
  }, []);
  return null;
}
