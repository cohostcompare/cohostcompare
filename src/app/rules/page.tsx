import type { Metadata } from 'next';
import AskRules from '@/components/AskRules';
import Photo from '@/components/Photo';
import { RULES, RULES_CHECKED, RULES_STALE_DAYS, rulesAgeDays } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ask about short-stay rules',
  description: 'Plain-English guide to Airbnb and short-term rental rules in each Australian state: registration, night caps, levies and strata rules.',
};

type SP = Promise<{ q?: string }>;

export default async function Rules({ searchParams }: { searchParams: SP }) {
  const { q } = await searchParams;
  return (
    <main style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 24 }}>
      <section className="ask-hero">
        <Photo name="yarra" ratio="auto" eager sizes="(max-width: 880px) 100vw, 1000px" />
        <div className="ask-hero-body">
          <span className="label">Short-stay rules, answered</span>
          <h1>Ask anything about Airbnb and short-stay rules</h1>
          <p>Registration, night caps, levies, strata bans and council permits, in any state. Get a plain-English answer in seconds, with the official source.</p>
          <AskRules initial={(q || '').slice(0, 400)} />
        </div>
      </section>
      <header style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 'clamp(26px,4vw,34px)', margin: 0 }}>Or browse the rules by state</h2>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Every point is checked against official government and council sources, last on {RULES_CHECKED}. This is general information, not legal advice: rules change and councils add their own, so check with your council, and your strata or owners corporation, before you list.</p>
      </header>

      {rulesAgeDays() > RULES_STALE_DAYS && (
        <p role="note" style={{ margin: 0, border: '1px solid var(--signal)', borderRadius: 10, padding: '10px 14px' }}>
          <b>Heads up:</b> this guide was last checked {rulesAgeDays()} days ago and is due for review. Confirm anything important using the official sources linked under each state.
        </p>
      )}

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
          {r.watch && <p style={{ margin: 0, background: 'var(--tint)', borderRadius: 10, padding: '8px 12px', fontSize: 14 }}><b>Coming up:</b> {r.watch.join(' ')}</p>}
          <p className="hint" style={{ margin: 0 }}>Official sources: {r.sources.map((s, i) => <span key={s.url}>{i ? '; ' : ''}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}</p>
        </section>
      ))}
    </main>
  );
}
