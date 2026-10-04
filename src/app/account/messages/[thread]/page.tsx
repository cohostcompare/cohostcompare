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
type SP = Promise<{ reviewed?: string }>;

const WHO: Record<string, string> = { owner: 'You', system: 'CoHostCompare' };

export default async function Thread({ params, searchParams }: { params: P; searchParams: SP }) {
  const { thread } = await params;
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/signin?next=/account/messages/${thread}`);
  const s = await userClient();
  const { data: t } = await s
    .from('quote_request_managers')
    .select('id, request_id, manager_name, manager_slug, status, quote, quote_requests(address, postcode, bedrooms, property_type, created_at)')
    .eq('id', thread)
    .single();
  if (!t) notFound();
  const { data: msgs } = await s.from('messages').select('id, sender, body, created_at').eq('thread_id', thread).order('created_at');
  // Mark manager messages as read by the owner.
  await adminClient().from('messages').update({ read_by_owner: true }).eq('thread_id', thread).eq('read_by_owner', false);

  if (t.quote) await adminClient().from('quote_request_managers').update({ owner_seen_at: new Date().toISOString() }).eq('id', thread).is('owner_seen_at', null);
  const req = Array.isArray(t.quote_requests) ? t.quote_requests[0] : t.quote_requests;
  const first = t.manager_name;
  const { data: others } = await adminClient().from('quote_request_managers').select('manager_name').eq('request_id', (t as { request_id?: string }).request_id || '').eq('status', 'accepted').neq('id', t.id).limit(1);
  const otherAccepted = others?.[0]?.manager_name || null;
  // Contact details show only once the introduction email has actually gone (its system note is the record).
  // Before that, a Free-plan manager may still be confirming (A$99 unlock), or an unclaimed manager is being reached by hand.
  const introduced = (msgs || []).some((m) => m.sender === 'system' && m.body.startsWith("We've introduced you both"));
  let contact: { email: string | null; phone: string | null } | null = null;
  let pending: 'confirming' | 'lapsed' | 'byhand' | null = null;
  if (t.status === 'accepted') {
    if (introduced) {
      const { memberEmails } = await import('@/lib/managers');
      const { data: mc } = await adminClient().from('managers').select('contact_phone').eq('slug', t.manager_slug).maybeSingle();
      contact = { email: (await memberEmails(t.manager_slug))[0] ?? null, phone: mc?.contact_phone ?? null };
    } else {
      const { data: fee } = await adminClient().from('success_fees').select('status').eq('thread_id', t.id).maybeSingle();
      pending = fee?.status === 'awaiting_unlock' ? 'confirming' : fee?.status === 'expired' ? 'lapsed' : 'byhand';
    }
  }
  // Review prompt once introduced (needs 017; hidden until then).
  let review: { can: boolean; done: boolean } = { can: false, done: false };
  if (t.status === 'accepted') {
    const { reviewable } = await import('@/lib/reviews');
    const r = await reviewable(t.id, user.id).catch(() => null);
    review = { can: Boolean(r?.ok), done: Boolean(r?.ok && r.existing) };
  }
  const quoted = Boolean(t.quote && ['quoted', 'accepted'].includes(t.status));
  const { data: mrow } = await adminClient().from('managers').select('claimed').eq('slug', t.manager_slug).maybeSingle();
  const slow = mrow ? !mrow.claimed : false;
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
      {sp.reviewed && <div className="panel" style={{ background: 'var(--tint)' }}><b>Thanks for your review.</b> It now shows on <Link href={`/managers/${t.manager_slug}`}>{t.manager_name}&apos;s profile</Link>.</div>}
      {review.can && !sp.reviewed && (
        <div className="panel" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span>{review.done ? <>You&apos;ve reviewed {t.manager_name}. You can update it any time.</> : <><b>How is it going with {t.manager_name}?</b> A short review helps other owners choose.</>}</span>
          <Link className={`btn ${review.done ? 'secondary' : 'primary'} small`} href={`/account/review/${t.id}`}>{review.done ? 'Update review' : `Review ${t.manager_name}`}</Link>
        </div>
      )}
      {quoted && (
        <section className="panel" style={{ display: 'grid', gap: 12 }} aria-label="Quote">
          <h2 style={{ fontSize: 20, margin: 0 }}>{t.manager_name}&apos;s quote</h2>
          <QuoteTable quotes={[{ name: t.manager_name, q: t.quote as Quote }]} />
          {(t.quote as Quote).note && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}><b>Their note:</b> {(t.quote as Quote).note}</p>}
          {t.status === 'accepted' ? (
            <div style={{ background: 'var(--tint)', borderRadius: 10, padding: '12px 14px' }}>
              <b>You accepted this quote.</b>{' '}
              {introduced ? <>We&apos;ve introduced you both by email so you can arrange next steps.</>
                : pending === 'confirming' ? <>We&apos;ve asked {first} to confirm they can take you on. As soon as they do, we&apos;ll email you both an introduction with each other&apos;s details. If you don&apos;t hear within 48 hours, you can accept another quote instead.</>
                : pending === 'lapsed' ? <>{first} hasn&apos;t confirmed within 48 hours. You can accept another manager&apos;s quote, or wait: if {first} confirms later, we&apos;ll still introduce you.</>
                : <>{first} isn&apos;t set up on CoHostCompare yet, so we&apos;re passing your details on ourselves and will introduce you by email within one business day.</>}
            </div>
          ) : (
            <div className="accept-box">
              <form action={acceptQuote} style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
                <input type="hidden" name="thread" value={t.id} />
                {otherAccepted && <label className="hint" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}><input type="checkbox" name="also" value="yes" required /> <span>You&apos;ve already accepted {otherAccepted}&apos;s quote for this property. Tick to accept {first}&apos;s as well; both managers will be introduced to you.</span></label>}
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
          <span className="hint">Ask about fees, availability or how they&apos;d run your place. {slow ? <>{t.manager_name} isn&apos;t on CoHostCompare yet, so we pass your messages on and it may take longer to hear back.</> : <>They get your message by email and reply here, and we email you when they do.</>}</span>
        </div>
        <div className="chat-log" tabIndex={0} role="log" aria-label="Messages">
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
        {t.status === 'accepted' && contact ? (
          <>
            <div className="intro-done">
              <b>You&apos;ve been introduced by email. Carry on the conversation directly with {t.manager_name}.</b>
              <span className="contact">{contact.email ? <><a href={`mailto:${contact.email}`}>{contact.email}</a></> : null}{contact.phone ? <> · <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a></> : null}</span>
              <span className="hint">They&apos;ll arrange the next steps with you there. This chat stays here as a record of what you discussed.</span>
            </div>
            <details className="chat-later"><summary>Still want to send a message here?</summary><Composer thread={t.id} name={t.manager_name} /></details>
          </>
        ) : ['declined', 'withdrawn'].includes(t.status) ? (
          <div className="intro-done">
            <b>{t.status === 'declined' ? `${t.manager_name} can’t take this on, so this conversation is closed.` : 'This request is closed, so this conversation is closed.'}</b>
            <span className="hint">{t.status === 'declined' ? 'Their reason is in the messages above. ' : ''}You can still request quotes from other managers.</span>
            <Link className="btn primary small" href="/" style={{ justifySelf: 'start' }}>Find other managers</Link>
          </div>
        ) : <Composer thread={t.id} name={t.manager_name} />}
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
