import type { Metadata } from 'next';
import Link from 'next/link';
import { requireManager } from '@/lib/managers';
import { publishedReviews, stars } from '@/lib/reviews';
import { replyToReview } from './actions';

export const metadata: Metadata = { title: 'Owner reviews', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Reviews({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/reviews`);
  const reviews = await publishedReviews(m.slug);
  return (
    <main style={{ maxWidth: 720, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/dashboard" className="hint">← Dashboard</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,36px)', margin: 0 }}>Owner reviews of {m.name}</h1>
      <p style={{ margin: 0 }}>Owners who accept your quote through CoHostCompare can review you. Reviews show on your public profile once you have one, with the owner&apos;s first name and suburb. You can post one public reply to each, and edit it later. Keep replies professional, and leave out the owner&apos;s personal details.</p>
      {!reviews.length ? <p className="panel" style={{ margin: 0 }}>No reviews yet. Owners are invited to review you after they&apos;ve accepted your quote.</p> : reviews.map((r) => (
        <article key={r.id} className="panel owner-review" style={{ borderTop: 0 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span className="stars">{stars(r.rating)}</span><b>{r.owner_first || 'Owner'}{r.suburb ? `, ${r.suburb}` : ''}</b>
            <span className="hint">{new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.body}</p>
          <form action={replyToReview} style={{ display: 'grid', gap: 8 }}>
            <input type="hidden" name="slug" value={m.slug} /><input type="hidden" name="id" value={r.id} />
            <label style={{ display: 'grid', gap: 4 }}><span className="label">Your public reply</span>
              <textarea name="reply" rows={3} maxLength={2000} defaultValue={r.manager_reply || ''} placeholder="Thank the owner, or respond to any concerns." /></label>
            <button className="btn secondary small" type="submit" style={{ justifySelf: 'start' }}>{r.manager_reply ? 'Update reply' : 'Post reply'}</button>
          </form>
        </article>
      ))}
      <p className="hint" style={{ margin: 0 }}>Think a review breaks our guidelines (for example, it isn&apos;t about your service or includes personal details)? Email hello@cohostcompare.com. We don&apos;t remove honest reviews, and paid plans don&apos;t change this.</p>
    </main>
  );
}
