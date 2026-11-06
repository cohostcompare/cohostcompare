'use client';

/** Reports a quote-flow step (details, pick, form) once per browser session. Fire and forget; never throws. */
export function track(kind: 'details' | 'pick' | 'form') {
  try {
    const key = `cc_step_${kind}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* storage blocked: the server dedupes */ }
    fetch('/api/step', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) }).catch(() => {});
  } catch { /* fine */ }
}
