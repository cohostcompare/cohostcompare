import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RulesTrust from '@/components/RulesTrust';
import GuideSignup from '@/components/GuideSignup';
import AskRules from '@/components/AskRules';
import JsonLd from '@/components/JsonLd';
import { areas } from '@/lib/areas';
import { RULES, RULES_CHECKED, RULES_CHECKED_ISO, RULES_STALE_DAYS, rulesAgeDays } from '@/lib/rules';
import { article, breadcrumbs, faqPage, metaDescription } from '@/lib/seo';

export const revalidate = 3600;
type P = Promise<{ state: string }>;

const find = (s: string) => RULES.find((r) => r.code === s.toLowerCase());

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const r = find((await params).state);
  if (!r) return {};
  const title = `Airbnb rules in ${r.name} (${r.code.toUpperCase()}) explained`;
  return {
    title,
    description: metaDescription(`${r.summary} Checked against official sources on ${RULES_CHECKED}.`),
    alternates: { canonical: `/rules/${r.code}` },
    openGraph: { title, url: `/rules/${r.code}` },
  };
}

export default async function StateRules({ params }: { params: P }) {
  const r = find((await params).state);
  if (!r) notFound();
  const local = r.code === 'nsw' || r.code === 'vic' ? (await areas().catch(() => [])).filter((a) => (r.code === 'vic') === /^(mel|vic)-/.test(a.id)) : [];
  const title = `Short-term rental rules in ${r.name}`;
  return (
    <main style={{ maxWidth: 820, paddingBlock: '16px 64px', display: 'grid', gap: 20 }}>
      <JsonLd data={[
        breadcrumbs([['Home', '/'], ['Rules', '/rules'], [r.name, `/rules/${r.code}`]]),
        article({ title, description: r.summary, path: `/rules/${r.code}`, published: '2026-09-01', modified: RULES_CHECKED_ISO }),
        ...(r.faqs?.length ? [faqPage(r.faqs)] : []),
      ]} />
      <nav className="hint" aria-label="Breadcrumb"><Link href="/rules">Rules</Link> › {r.name}</nav>
      <header style={{ display: 'grid', gap: 8 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>{r.code.toUpperCase()} · checked {RULES_CHECKED}</span>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: 0 }}>{title}</h1>
        <p className="lede" style={{ margin: 0 }}>{r.summary}</p>
        <RulesTrust />
      </header>

      {rulesAgeDays() > RULES_STALE_DAYS && (
        <p role="note" style={{ margin: 0, border: '1px solid var(--signal)', borderRadius: 10, padding: '10px 14px' }}>
          <b>Heads up:</b> this page was last checked {rulesAgeDays()} days ago and is due for review. Confirm anything important with the official sources below.
        </p>
      )}

      <section className="panel" style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>What you need to know</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
          {r.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
        {r.watch && <p style={{ margin: 0, background: 'var(--tint)', borderRadius: 10, padding: '8px 12px', fontSize: 14 }}><b>Coming up:</b> {r.watch.join(' ')}</p>}
      </section>

      {r.faqs?.length ? (
        <section className="panel" style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Common questions</h2>
          {r.faqs.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
        </section>
      ) : null}

      <section className="panel" style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Official sources</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
          {r.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}
        </ul>
        <p className="hint" style={{ margin: 0 }}>General information, not legal advice. Councils add their own rules, and strata or owners corporations can too, so check with them before you list.</p>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 10, background: 'var(--tint)' }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Ask about your suburb or situation</h2>
        <AskRules initial="" />
      </section>

      <GuideSignup compact />

      {local.length > 0 && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Compare managers in {r.name}</h2>
          <p style={{ margin: 0 }}>A good local manager knows these rules and handles registration, levies and guest rules for you. Compare the managers in your area:</p>
          <div className="chips">{local.map((a) => <Link key={a.slug} className="chip" href={`/areas/${a.slug}`}>{a.label}</Link>)}</div>
        </section>
      )}

      <nav aria-label="Other states" style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Other states and territories</h2>
        <div className="chips">{RULES.filter((x) => x.code !== r.code).map((x) => <Link key={x.code} className="chip" href={`/rules/${x.code}`}>{x.name}</Link>)}</div>
      </nav>
    </main>
  );
}
