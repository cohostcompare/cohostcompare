import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { stars } from '@/lib/reviews';
import { adminClient } from '@/lib/supabase/server';
import { setReviewStatus } from './actions';

export const metadata: Metadata = { title: 'Owner reviews', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminReviews() {
  await requireAdmin('/admin/reviews');
  const { data, error } = await adminClient().from('manager_reviews').select('id, created_at, manager_slug, rating, body, owner_first, suburb, status, hidden_reason, manager_reply').order('created_at', { ascending: false }).limit(200);
  return (
    <main style={{ maxWidth: 860, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <h1 style={{ fontSize: 34, margin: 0 }}>Owner reviews</h1>
      <p style={{ margin: 0 }}>Reviews publish straight away. Hide one only if it breaks the guidelines: not about the owner&apos;s own experience, personal details, links, abuse, or clearly fake. Never because a manager asks or pays. Hiding is reversible.</p>
      {error && <p className="panel" style={{ margin: 0 }}>Reviews start once database update 017 has been run in Supabase.</p>}
      {!error && !data?.length && <p className="panel" style={{ margin: 0 }}>No reviews yet.</p>}
      {(data || []).map((r) => (
        <article key={r.id} className="panel" style={{ display: 'grid', gap: 6, opacity: r.status === 'hidden' ? 0.7 : 1 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span className="stars" style={{ color: '#E8A317' }}>{stars(r.rating)}</span>
            <Link href={`/managers/${r.manager_slug}#owner-reviews`}><b>{r.manager_slug}</b></Link>
            <span className="hint">{r.owner_first}{r.suburb ? `, ${r.suburb}` : ''} · {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <b style={{ color: r.status === 'hidden' ? 'var(--signal)' : 'var(--brand)' }}>{r.status}</b>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.body}</p>
          {r.manager_reply && <p className="hint" style={{ margin: 0 }}>Manager reply: {r.manager_reply}</p>}
          {r.hidden_reason && <p className="hint" style={{ margin: 0 }}>Hidden because: {r.hidden_reason}</p>}
          <form action={setReviewStatus} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="hidden" name="id" value={r.id} />
            {r.status === 'published' ? (<>
              <input type="hidden" name="status" value="hidden" />
              <input name="reason" placeholder="Reason (kept on file)" style={{ maxWidth: 280 }} />
              <button className="linkish" type="submit">Hide</button>
            </>) : (<><input type="hidden" name="status" value="published" /><button className="linkish" type="submit">Show again</button></>)}
          </form>
        </article>
      ))}
    </main>
  );
}
