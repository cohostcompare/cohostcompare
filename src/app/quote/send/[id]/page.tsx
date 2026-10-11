import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import EmailSignIn from '@/components/EmailSignIn';
import { adminClient, currentUser } from '@/lib/supabase/server';
import { sendRequest, type RequestFields } from '@/lib/quoteRequest';

export const metadata: Metadata = { title: 'Sending your request', robots: { index: false } };
export const dynamic = 'force-dynamic';

/**
 * Where the sign-in link lands for an owner who filled in the quote form before signing in (SQL 031).
 * Their session exists now, so the held request goes out and they land in their inbox.
 */
export default async function SendPending({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const here = `/quote/send/${id}`;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return <Problem title="That link isn't right" body="Start a new search and request quotes again." />;
  const db = adminClient();
  const { data: p } = await db.from('pending_requests').select('id, email, fields, sent_at, request_id, created_at').eq('id', id).maybeSingle();
  if (!p) return <Problem title="We couldn't find that request" body="It may have been sent already, or the link is old. Start a new search and request quotes again." />;
  if (p.sent_at) redirect(p.request_id ? `/account?sent=${(p.fields as RequestFields).managers.length}&r=${p.request_id}` : '/account');
  const user = await currentUser();
  if (!user?.email) {
    return (
      <main style={{ maxWidth: 480, paddingBlock: '24px 64px', display: 'grid', gap: 16 }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>One more step</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Your quote request is ready to go. Confirm your email and it&apos;s sent straight away.</p>
        <EmailSignIn next={here} />
      </main>
    );
  }
  if (user.email.toLowerCase() !== p.email.toLowerCase()) {
    return <Problem title="Signed in with a different email" body={`This request was started with ${p.email}, but you're signed in as ${user.email}. Sign out and open the link again, or start a new request.`} />;
  }
  if (Date.now() - new Date(p.created_at).getTime() > 14 * 86400e3) return <Problem title="That request has expired" body="It was started more than two weeks ago. Start a new search and request quotes again; it only takes a minute." />;
  // Claim it first so a link opened twice (or prefetched) sends once.
  const { data: claimed } = await db.from('pending_requests').update({ sent_at: new Date().toISOString() }).eq('id', id).is('sent_at', null).select('id');
  if (!claimed?.length) redirect('/account');
  const result = await sendRequest({ id: user.id, email: user.email }, p.fields as RequestFields);
  if (typeof result !== 'string') {
    await db.from('pending_requests').update({ sent_at: null }).eq('id', id);
    return <Problem title="We couldn't send it" body={result.error} />;
  }
  await db.from('pending_requests').update({ request_id: result }).eq('id', id);
  redirect(`/account?sent=${(p.fields as RequestFields).managers.length}&r=${result}`);
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <main style={{ maxWidth: 560, paddingBlock: '24px 64px', display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 30, margin: 0 }}>{title}</h1>
      <p style={{ margin: 0, color: 'var(--muted)' }}>{body}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link className="btn primary" href="/">Compare managers near you</Link>
        <Link className="btn secondary" href="/account">My inbox</Link>
      </div>
    </main>
  );
}
