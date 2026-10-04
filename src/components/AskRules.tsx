'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type Answer = { answer: string; sources: { label: string; url: string }[] } | { error: string };

const EXAMPLES = ['Can I rent my Bondi apartment on Airbnb all year?', 'Do I pay a levy on short stays in Melbourne?', 'Can my strata ban Airbnb?', 'Do I need to register my Perth house?'];

export default function AskRules({ initial = '' }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const asked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Answer | null>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (text.length < 8) { setRes({ error: 'Ask a full question, for example one of the suggestions below.' }); return; }
    setBusy(true); setRes(null);
    try {
      const r = await fetch('/api/ask-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: text }) });
      setRes(await r.json());
    } catch {
      setRes({ error: "We couldn't get an answer just now. Try again in a minute." });
    } finally { setBusy(false); }
  }

  useEffect(() => { if (initial && !asked.current) { asked.current = true; ask(initial); } }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ask" aria-label="Ask about short-stay rules">
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label htmlFor="ask" className="sr-only">Your question</label>
        <input id="ask" className="field" value={q} onChange={(e) => setQ(e.target.value)} maxLength={400} placeholder="e.g. What are the Airbnb rules for my apartment in Bondi?" style={{ flex: '1 1 320px', background: 'var(--panel)', minHeight: 54, fontSize: 17 }} />
        <button className="btn primary" type="submit" disabled={busy} style={{ minHeight: 54, paddingInline: 24 }}>{busy ? 'Checking…' : 'Get an answer'}</button>
      </form>
      {!res && !busy && (
        <div className="chips"><span className="try">Try:</span>{EXAMPLES.map((e) => <button key={e} type="button" className="chip" style={{ border: 0, cursor: 'pointer', background: 'var(--panel)', color: 'var(--ink)' }} onClick={() => { setQ(e); ask(e); }}>{e}</button>)}</div>
      )}
      {res && 'error' in res && <p role="alert" style={{ margin: 0, background: 'var(--panel)', color: 'var(--signal)', borderRadius: 10, padding: '10px 14px' }}>{res.error}</p>}
      {res && 'answer' in res && (
        <div aria-live="polite" style={{ display: 'grid', gap: 8, background: 'var(--panel)', color: 'var(--ink)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{res.answer}</p>
          {res.sources.length > 0 && <p className="hint" style={{ margin: 0 }}>Sources: {res.sources.map((s, i) => <span key={s.url}>{i ? '; ' : ''}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}</p>}
          <p className="hint" style={{ margin: 0 }}>Automated answer from our guide, which is checked against official sources every fortnight. General information, not legal advice: confirm with your council before you list.</p>
        </div>
      )}
    </div>
  );
}

/** Reads ?q= from the address bar so the page itself can be cached. */
export function AskFromUrl() {
  const sp = useSearchParams();
  return <AskRules initial={(sp.get('q') || '').slice(0, 400)} />;
}
