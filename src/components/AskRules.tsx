'use client';

import { useState } from 'react';

type Answer = { answer: string; sources: { label: string; url: string }[] } | { error: string };

const EXAMPLES = ['Can I rent my Bondi apartment on Airbnb all year?', 'Do I pay a levy on short stays in Melbourne?', 'Do I need to register my Perth house?'];

export default function AskRules() {
  const [q, setQ] = useState('');
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

  return (
    <section className="panel" style={{ display: 'grid', gap: 12, background: 'var(--tint)' }} aria-label="Ask about the rules">
      <h2 style={{ fontSize: 20, margin: 0 }}>Ask about the rules</h2>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label htmlFor="ask" className="sr-only">Your question</label>
        <input id="ask" className="field" value={q} onChange={(e) => setQ(e.target.value)} maxLength={400} placeholder="e.g. Can I rent my Bondi apartment on Airbnb all year?" style={{ flex: '1 1 320px', background: 'var(--panel)' }} />
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Ask'}</button>
      </form>
      {!res && !busy && (
        <div className="chips">{EXAMPLES.map((e) => <button key={e} type="button" className="chip" style={{ border: 0, cursor: 'pointer', background: 'var(--panel)' }} onClick={() => { setQ(e); ask(e); }}>{e}</button>)}</div>
      )}
      {res && 'error' in res && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{res.error}</p>}
      {res && 'answer' in res && (
        <div style={{ display: 'grid', gap: 8, background: 'var(--panel)', borderRadius: 10, padding: '12px 14px' }}>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{res.answer}</p>
          {res.sources.length > 0 && <p className="hint" style={{ margin: 0 }}>Sources: {res.sources.map((s, i) => <span key={s.url}>{i ? '; ' : ''}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}</p>}
          <p className="hint" style={{ margin: 0 }}>AI answer based on the guide on this page. General information, not legal advice: confirm with your council before you list.</p>
        </div>
      )}
    </section>
  );
}
