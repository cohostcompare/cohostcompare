import type { Metadata } from 'next';
import Link from 'next/link';
import { myManagers, requireThread } from '@/lib/managers';
import { FREE_ACCEPTS_PER_MONTH, planOf, plansFor, PRO_PRICE, SUCCESS_FEE_TEXT, UNLOCK_HOURS } from '@/lib/pro';
import { startPro, unlockClient } from '@/app/dashboard/billing/actions';
import { adminClient } from '@/lib/supabase/server';
import { declineRequest } from '../actions';
import { ManagerComposer, QuoteForm } from './Forms';

export const metadata: Metadata = { title: 'Quote request', robots: { index: false } };
export const dynamic = 'force-dynamic';

type P = Promise<{ thread: string }>;
const WHO: Record<string, string> = { manager: 'You', system: 'CoHostCompare' };

export default async function ManagerThread({ params, searchParams }: { params: P; searchParams: Promise<{ unlocked?: string; billing?: string }> }) {
  const { thread: id } = await params;
  const sp = await searchParams;
  const { user, thread: t, req } = await requireThread(id);
  const db = adminClient();
  const { data: msgs } = await db.from('messages').select('id, sender, body, created_at').eq('thread_id', t.id).order('created_at');
  await db.from('messages').update({ read_by_manager: true }).eq('thread_id', t.id).eq('read_by_manager', false);
  if (t.status === 'sent') await db.from('quote_request_managers').update({ status: 'viewed' }).eq('id', t.id);
  const m = (await myManagers(user.id)).find((x) => x.slug === t.manager_slug)!;
  const g = (m.gated || {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const defaults = { feePct: m.fee_min ?? undefined, gst: String(m.fee_note || '').includes('GST'), setupFee: g.setupFee ?? undefined, minTermMonths: g.minTermMonths ?? undefined, noticeDays: g.noticeDays ?? undefined, cleaning: g.cleaningPassedOn === true ? 'guests' : g.cleaningPassedOn === false ? 'owner' : undefined, linenIncluded: g.linenIncluded, included: g.inclusions || [] };
  const plan = planOf((await plansFor([m.id])).get(m.id));
  const { data: tpl } = await db.from('managers').select('quote_templates').eq('id', m.id).maybeSingle(); // needs 015
  const { data: fee } = await db.from('success_fees').select('status, expires_at').eq('thread_id', t.id).maybeSingle(); // needs 015/016
  const accepted = t.status === 'accepted';
  const locked = accepted && Boolean(fee && ['awaiting_unlock', 'expired'].includes(fee.status));
  const closed = ['accepted', 'declined', 'withdrawn'].includes(t.status);
  const first = String(req.owner_name || 'Owner').split(' ')[0];

  return (
    <main style={{ maxWidth: 860, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/dashboard" className="hint">← All quote requests</Link>
      <div>
        <span className="label">Quote request for {t.manager_name}</span>
        <h1 style={{ fontSize: 'clamp(26px,4vw,34px)', margin: '2px 0 0' }}>{first} · {req.suburb || ''} {req.state || ''} {req.postcode}</h1>
      </div>

      {(() => { const people = (msgs || []).filter((x) => x.sender !== 'system'); return people[people.length - 1]?.sender === 'owner' ? <a href="#chat" className="panel" style={{ display: 'block', borderColor: 'var(--signal)', color: 'inherit', textDecoration: 'none' }}><b>{first} is waiting for your reply.</b> Jump to the chat ↓</a> : null; })()}
      {sp.unlocked && <div className="panel" style={{ background: 'var(--tint)' }}><b>Thanks, payment received.</b> We&apos;ve emailed you and {first} an introduction. It can take a minute to show here.</div>}
      {sp.billing === 'soon' && <div className="panel">Card payments are being switched on. Please try again shortly, or email hello@cohostcompare.com.</div>}
      <section className="panel" style={{ display: 'grid', gap: 10 }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '10px 20px', margin: 0 }}>
          <div><dt className="label">Property</dt><dd style={{ margin: 0 }}>{req.property_type}, {Number(req.bedrooms) === 0 ? 'studio' : `${req.bedrooms} bedrooms`}</dd></div>
          <div><dt className="label">Listed now</dt><dd style={{ margin: 0 }}>{req.currently_listed}</dd></div>
          <div><dt className="label">Wants help with</dt><dd style={{ margin: 0 }}>{(req.services || []).join(', ')}</dd></div>
          <div><dt className="label">Timing</dt><dd style={{ margin: 0 }}>{req.start_timing}</dd></div>
          {req.situation && <div><dt className="label">Owner</dt><dd style={{ margin: 0 }}>{String(req.situation).replace(/^I own the property/, 'Owns the property').replace(/^I’m buying it now|^I'm buying it now/, 'Buying it now').replace(/^I’m planning to buy a property|^I'm planning to buy a property/, 'Planning to buy')}</dd></div>}
          <div><dt className="label">Received</dt><dd style={{ margin: 0 }}>{new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
        </dl>
        {req.notes && <p style={{ margin: 0 }}><b>Owner&apos;s note:</b> {req.notes}</p>}
        {locked ? (
          <div style={{ background: 'var(--tint)', borderRadius: 10, padding: '14px 16px', display: 'grid', gap: 10 }}>
            <b>{first} accepted your quote. Confirm this client to get their details.</b>
            <span>You&apos;ve used the {FREE_ACCEPTS_PER_MONTH} free clients included in the Free plan this month. Confirm this one for {SUCCESS_FEE_TEXT} and we&apos;ll send you and {first} an introduction by email with their full name, email, phone and address. Or start Pro ({PRO_PRICE}) and every client you win is confirmed at no extra cost, including this one.</span>
            {fee?.status === 'expired' ? <span className="hint">The {UNLOCK_HOURS}-hour window has passed, so {first} has been told they can choose another manager. You can still confirm, and we&apos;ll introduce you.</span> : fee?.expires_at ? <span className="hint">Please confirm by {new Date(fee.expires_at).toLocaleString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}.</span> : null}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <form action={unlockClient}><input type="hidden" name="thread" value={t.id} /><button className="btn primary">Confirm for {SUCCESS_FEE_TEXT}</button></form>
              <form action={startPro}><input type="hidden" name="slug" value={t.manager_slug} /><button className="btn secondary">Start Pro instead</button></form>
            </div>
          </div>
        ) : accepted ? (
          <div style={{ background: 'var(--tint)', borderRadius: 10, padding: '12px 14px' }}>
            <b>{first} accepted your quote.</b> Their details: {req.owner_name}, <a href={`mailto:${req.owner_email}`}>{req.owner_email}</a>{req.owner_phone ? `, ${req.owner_phone}` : ''}{req.street ? `. Property: ${req.street}, ${req.suburb} ${req.state} ${req.postcode}` : ''}.
          </div>
        ) : (
          <p className="hint" style={{ margin: 0 }}>The owner&apos;s full name, email, phone and street address are shared with you if they accept your quote.</p>
        )}
      </section>

      <section className="panel" style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>{t.quote ? 'Your quote' : 'Send your quote'}</h2>
        {closed && !accepted && <p className="hint" style={{ margin: 0 }}>This request is closed.</p>}
        <QuoteForm thread={t.id} q={t.quote} defaults={defaults} locked={closed} plan={plan} templates={(tpl?.quote_templates as { name: string; q: unknown }[]) || []} feeText={SUCCESS_FEE_TEXT} />
      </section>

      <section id="chat" className="panel chat" aria-label={`Chat with ${first}`}>
        <div className="chat-head">
          <h2>Chat with {first}</h2>
          <span className="hint">{first} gets your message by email and replies here. Owner messages also come to you by email{t.status !== 'accepted' ? ', and their contact details are shared when they accept your quote' : ''}.</span>
        </div>
        <div className="chat-log">
          {(msgs || []).map((x) => x.sender === 'system' ? (
            <p key={x.id} className="chat-note">{/^Quote request sent\./.test(x.body) ? `${first} sent you this request` : x.body} · {new Date(x.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}</p>
          ) : (
            <div key={x.id} className={`bubble ${x.sender === 'manager' ? 'me' : 'them'}`}>
              <span className="who">{WHO[x.sender] || first} · {new Date(x.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}</span>
              <div>{x.body}</div>
            </div>
          ))}
        </div>
        {accepted && !locked ? (
          <>
            <div className="intro-done">
              <b>You&apos;ve been introduced by email. Carry on directly with {first}.</b>
              <span className="contact"><a href={`mailto:${req.owner_email}`}>{req.owner_email}</a>{req.owner_phone ? <> · <a href={`tel:${String(req.owner_phone).replace(/\s/g, '')}`}>{req.owner_phone}</a></> : null}</span>
              <span className="hint">Arrange the visit and your management agreement with {first} there. This chat stays here as a record.</span>
            </div>
            <details className="chat-later"><summary>Still want to send a message here?</summary><ManagerComposer thread={t.id} name={first} /></details>
          </>
        ) : <ManagerComposer thread={t.id} name={first} />}
      </section>

      {!closed && (
        <details className="panel">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Can&apos;t take on this property?</summary>
          <form action={declineRequest} style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <input type="hidden" name="thread" value={t.id} />
            <textarea className="field" name="reason" rows={2} maxLength={500} placeholder="Optional: a short reason for the owner, e.g. outside our area or fully booked" />
            <button className="btn secondary" type="submit" style={{ justifySelf: 'start' }}>Let the owner know</button>
          </form>
        </details>
      )}
    </main>
  );
}
