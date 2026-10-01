import type { Review } from '@/lib/reviews';
import { stars } from '@/lib/reviews';

const date = (d: string) => new Date(d).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'Australia/Sydney' });

/** Owner reviews on a manager profile. Renders nothing until there's at least one. */
export default function OwnerReviews({ name, reviews }: { name: string; reviews: Review[] }) {
  if (!reviews.length) return null;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  return (
    <section id="owner-reviews" className="panel owner-reviews" aria-label={`Owner reviews of ${name}`}>
      <h2 style={{ fontSize: 20, margin: 0 }}>Reviews from owners</h2>
      <div className="summary">
        <b>{avg.toFixed(1)}</b><span className="stars" aria-hidden="true">{stars(avg)}</span>
        <span className="hint">{reviews.length} review{reviews.length === 1 ? '' : 's'} from owners who hired {name} through CoHostCompare</span>
      </div>
      {reviews.map((r) => (
        <article key={r.id} className="owner-review">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span className="stars" aria-label={`${r.rating} out of 5 stars`}>{stars(r.rating)}</span>
            <b>{r.owner_first || 'Owner'}{r.suburb ? `, ${r.suburb}` : ''}</b>
            <span className="hint">{date(r.created_at)}</span>
            <span className="verified-owner">✓ Verified owner</span>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.body}</p>
          {r.manager_reply && <div className="reply"><b>Reply from {name}</b><p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{r.manager_reply}</p></div>}
        </article>
      ))}
      <p className="hint" style={{ margin: 0 }}>Only owners who accepted {name}&apos;s quote through CoHostCompare can leave a review. We don&apos;t remove reviews because a manager asks or pays, and reviews never change the order managers appear in.</p>
    </section>
  );
}
