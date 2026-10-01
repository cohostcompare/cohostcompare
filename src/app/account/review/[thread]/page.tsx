import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { reviewable } from '@/lib/reviews';
import { currentUser } from '@/lib/supabase/server';
import ReviewForm from './ReviewForm';

export const metadata: Metadata = { title: 'Review a manager', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ thread: string }> }) {
  const { thread } = await params;
  const user = await currentUser();
  if (!user) redirect(`/signin?next=/account/review/${thread}`);
  const r = await reviewable(thread, user.id);
  if (!r) notFound();
  const name = r.t.manager_name;
  return (
    <main style={{ maxWidth: 640, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href={`/account/messages/${thread}`} className="hint">← Back to {name}</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,36px)', margin: 0 }}>{r.ok && r.existing ? 'Update your review' : `Review ${name}`}</h1>
      {!r.ok ? <p className="panel" style={{ margin: 0 }}>{r.reason}</p> : (
        <>
          <p style={{ margin: 0 }}>Your review helps other owners choose. It appears on {name}&apos;s profile with your first name and suburb, marked as a verified owner who hired them through CoHostCompare. {name} can post one public reply.</p>
          <ReviewForm thread={thread} name={name} rating={r.existing?.rating} body={r.existing?.body} />
          <p className="hint" style={{ margin: 0 }}>Please keep it honest, about your own experience, and free of personal details, links and abusive language. We remove reviews that break these guidelines, but never because a manager asks us to or pays us. You can update your review at any time.</p>
        </>
      )}
    </main>
  );
}
