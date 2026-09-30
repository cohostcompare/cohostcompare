import type { Metadata } from 'next';
import AskRules from '@/components/AskRules';
import Photo from '@/components/Photo';
import { RULES, RULES_CHECKED } from '@/lib/rules';

export const metadata: Metadata = {
  title: 'Short-term rental rules by state',
  description: 'Plain-English guide to Airbnb and short-term rental rules in each Australian state: registration, night caps, levies and strata rules.',
};

export default function Rules() {
  return (
    <main style={{ maxWidth: 880, paddingBlock: '16px 64px', display: 'grid', gap: 24 }}>
      <Photo name="yarra" ratio="21 / 8" eager sizes="(max-width: 880px) 100vw, 880px" />
      <header style={{ display: 'grid', gap: 10 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>Rules by state</span>
        <h1 style={{ fontSize: 'clamp(32px,5vw,48px)', margin: 0 }}>Short-term rental rules in Australia</h1>
        <p className="lede">Registration, night caps, levies and strata rules, state by state, in plain English. Last checked {RULES_CHECKED}.</p>
        <p className="hint" style={{ margin: 0 }}>This is general information, not legal advice. Rules change and councils add their own, so check with your council, and your strata or owners corporation, before you list.</p>
      </header>

      <AskRules />

      <nav aria-label="States" className="chips">
        {RULES.map((r) => <a key={r.code} className="chip" href={`#${r.code}`} style={{ textDecoration: 'none' }}>{r.name}</a>)}
      </nav>

      {RULES.map((r) => (
        <section key={r.code} id={r.code} className="panel" style={{ display: 'grid', gap: 10, scrollMarginTop: 96 }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>{r.name}</h2>
          <p style={{ margin: 0, fontWeight: 500 }}>{r.summary}</p>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            {r.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
          {r.watch && <p className="hint" style={{ margin: 0 }}>{r.watch.join(' ')}</p>}
          <p className="hint" style={{ margin: 0 }}>Sources: {r.sources.map((s, i) => <span key={s.url}>{i ? '; ' : ''}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}</p>
        </section>
      ))}
    </main>
  );
}
