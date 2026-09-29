'use client';

// Shown instead of a blank crash page if something on a page fails.
export default function PageError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ maxWidth: 560, paddingBlock: '48px 64px', display: 'grid', gap: 12 }}>
      <h1 style={{ fontSize: 30, margin: 0 }}>Something went wrong on this page</h1>
      <p style={{ color: 'var(--muted)', margin: 0 }}>Try again, or go back to the search. If it keeps happening, email hello@cohostcompare.com.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={reset}>Try again</button>
        <a className="btn secondary" href="/">Back to search</a>
      </div>
    </main>
  );
}
