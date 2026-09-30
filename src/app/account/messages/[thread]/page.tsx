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
  const first = t.manager_name;
  const quoted = Boolean(t.quote && ['quoted', 'accepted'].includes(t.status));
  return (
    <main style={{ maxWidth: 760, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/account" className="hint">← Back to inbox</Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(26px,4vw,34px)', margin: 0 }}>{t.manager_name}</h1>
          <p className="hint" style={{ margin: '4px 0 0' }}>
            About {req?.address || `postcode ${req?.postcode}`} · {req?.property_type}, {req?.bedrooms} bed · <Link href={`/managers/${t.manager_slug}`}>View profile</Link>
          </p>
        </div>
        <a className="btn secondary small" href="#chat">💬 Message {first}</a>
      </div>
      {quoted && (
        <section className="panel" style={{ display: 'grid', gap: 12 }} aria-label="Quote">
          <h2 style={{ fontSize: 20, margin: 0 }}>{t.manager_name}&apos;s quote</h2>
          <QuoteTable quotes={[{ name: t.manager_name, q: t.quote as Quote }]} />
          {(t.quote as Quote).note && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}><b>Their note:</b> {(t.quote as Quote).note}</p>}
          {t.status === 'accepted' ? (
            <div style={{ background: 'var(--tint)', borderRadius: 10, padding: '12px 14px' }}><b>You accepted this quote.</b> We&apos;ve introduced you both by email so you can arrange next steps.</div>
          ) : (
            <div className="accept-box">
              <form action={acceptQuote}>
                <input type="hidden" name="thread" value={t.id} />
                <button className="btn primary" type="submit">Accept this quote</button>
              </form>
              <div>
                <b>What happens next</b>
                <ol className="next-steps">
                  <li>We introduce you and {first} by email, with each other&apos;s contact details. Your name, email, phone and property address are shared with {first} only.</li>
                  <li>{first} gets in touch to arrange a visit or a call and answer any questions.</li>
                  <li>If you&apos;re happy, you sign {first}&apos;s management agreement directly with them. Accepting here isn&apos;t a contract, and you can still say no.</li>
                </ol>
                <p className="hint" style={{ margin: 0 }}>Not sure yet? Ask {first} a question below first.</p>
              </div>
            </div>
          )}
        </section>
      )}
      <section id="chat" className="panel chat" aria-label={`Chat with ${t.manager_name}`}>
        <div className="chat-head">
          <h2>Chat with {t.manager_name}</h2>
          <span className="hint">Ask about fees, availability or how they&apos;d run your place. They get your message by email and reply here, and we email you when they do.</span>
        </div>
        <div className="chat-log">
          {(msgs || []).map((m) => m.sender === 'system' ? (
            <p key={m.id} className="chat-note">{systemText(m.body, t.manager_name)} · {new Date(m.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}</p>
          ) : (
            <div key={m.id} className={`bubble ${m.sender === 'owner' ? 'me' : 'them'}`}>
              <span className="who">{WHO[m.sender] || t.manager_name} · {new Date(m.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}</span>
              <div>{m.body}</div>
            </div>
          ))}
          {!(msgs || []).some((m) => m.sender !== 'system') && <p className="chat-note">No messages yet. Say hello or ask a question.</p>}
        </div>
        <Composer thread={t.id} name={t.manager_name} />
      </section>
      {t.status !== 'accepted' && <p className="hint" style={{ margin: 0 }}>Keep contact details in the chat for now. They&apos;re shared automatically when you accept a quote.</p>}
    </main>
  );
}

/** Older system notes, reworded for the chat. */
function systemText(body: string, name: string) {
  if (/^Quote request sent\./.test(body)) return `Your request was sent to ${name}`;
  return body;
}
