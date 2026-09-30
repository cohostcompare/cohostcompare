import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { adminClient, currentUser, userClient } from '@/lib/supabase/server';
import QuoteTable from '@/components/QuoteTable';
import type { Quote } from '@/lib/quotes';
import { acceptQuote } from '../actions';
import Composer from './Composer';

export const metadata: Metadata = { title: 'Conversation', robots: { index: false } };

type P = Promise<{ thread: string }>;

const WHO: Record<string, string> = { owner: 'You', system: 'CoHostCompare' };

export default async function Thread({ params }: { params: P }) {
  const { thread } = await params;
  const user = await currentUser();
  if (!user) redirect(`/signin?next=/account/messages/${thread}`);
  const s = await userClient();
  const { data: t } = await s
    .from('quote_request_managers')
    .select('id, manager_name, manager_slug, status, quote, quote_requests(address, postcode, bedrooms, property_type, created_at)')
    .eq('id', thread)
    .single();
  if (!t) notFound();
  const { data: msgs } = await s.from('messages').select('id, sender, body, created_at').eq('thread_id', thread).order('created_at');
  // Mark manager messages as read by the owner.
  await adminClient().from('messages').update({ read_by_owner: true }).eq('thread_id', thread).eq('read_by_owner', false);

  if (t.quote) await adminClient().from('quote_request_managers').update({ owner_seen_at: new Date().toISOString() }).eq('id', thread).is('owner_seen_at', null);
  const req = Array.isArray(t.quote_requests) ? t.quote_requests[0] : t.quote_requests;
  return (
    <main style={{ maxWidth: 760, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/account" className="hint">← All conversations</Link>
      <div>
        <h1 style={{ fontSize: 'clamp(26px,4vw,34px)', margin: 0 }}>{t.manager_name}</h1>
        <p className="hint" style={{ margin: '4px 0 0' }}>
          About {req?.address || `postcode ${req?.postcode}`} · {req?.property_type}, {req?.bedrooms} bed · <Link href={`/managers/${t.manager_slug}`}>View profile</Link>
        </p>
      </div>
      {t.quote && ['quoted', 'accepted'].includes(t.status) && (
        <section className="panel" style={{ display: 'grid', gap: 12 }} aria-label="Quote">
          <h2 style={{ fontSize: 20, margin: 0 }}>{t.manager_name}&apos;s quote</h2>
          <QuoteTable quotes={[{ name: t.manager_name, q: t.quote as Quote }]} />
          {(t.quote as Quote).note && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}><b>Their note:</b> {(t.quote as Quote).note}</p>}
          {t.status === 'accepted' ? (
            <div style={{ background: 'var(--tint)', borderRadius: 10, padding: '12px 14px' }}><b>You accepted this quote.</b> We&apos;ve emailed you both each other&apos;s contact details.</div>
          ) : (
            <form action={acceptQuote} style={{ display: 'grid', gap: 8 }}>
              <input type="hidden" name="thread" value={t.id} />
              <button className="btn primary" type="submit" style={{ justifySelf: 'start' }}>Accept this quote</button>
              <span className="hint">Accepting shares your name, email, phone and property address with {t.manager_name} so they can arrange next steps. It isn&apos;t a contract: you&apos;ll sign their management agreement directly with them.</span>
            </form>
          )}
        </section>
      )}
      <section className="panel" style={{ display: 'grid', gap: 14 }} aria-label="Messages">
        {(msgs || []).map((m) => (
          <div key={m.id} style={{ justifySelf: m.sender === 'owner' ? 'end' : 'start', maxWidth: '85%', display: 'grid', gap: 4 }}>
            <span className="hint" style={{ textAlign: m.sender === 'owner' ? 'right' : 'left' }}>
              {WHO[m.sender] || t.manager_name} · {new Date(m.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}
            </span>
            <div style={{
              padding: '10px 14px', borderRadius: 12, whiteSpace: 'pre-wrap',
              background: m.sender === 'owner' ? 'var(--brand)' : m.sender === 'system' ? 'var(--surface)' : 'var(--tint)',
              color: m.sender === 'owner' ? 'var(--on-brand)' : 'var(--ink)',
              border: m.sender === 'system' ? '1px dashed var(--line-strong)' : '0',
            }}>{m.body}</div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <Composer thread={t.id} />
        </div>
      </section>
      {t.status !== 'accepted' && <p className="hint" style={{ margin: 0 }}>Keep contact details in the conversation for now. They&apos;re shared automatically when you accept a quote.</p>}
    </main>
  );
}
