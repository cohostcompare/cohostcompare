import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ maxWidth: 640, paddingBlock: '48px 80px', display: 'grid', gap: 14 }}>
      <span className="label" style={{ color: 'var(--brand)' }}>Page not found</span>
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', margin: 0 }}>We couldn&apos;t find that page</h1>
      <p className="lede">It may have moved, or the manager may no longer be listed.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn primary" href="/">Compare managers near you</Link>
        <Link className="btn secondary" href="/rules">Ask about the rules</Link>
      </div>
    </main>
  );
}
