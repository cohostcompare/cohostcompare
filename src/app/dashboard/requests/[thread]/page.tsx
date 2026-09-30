import type { Metadata } from 'next';
import Link from 'next/link';
import { myManagers, requireThread } from '@/lib/managers';
import { planOf, plansFor, SUCCESS_FEE_TEXT } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';
import { declineRequest } from '../actions';
import { ManagerComposer, QuoteForm } from './Forms';

export const metadata: Metadata = { title: 'Quote request', robots: { index: false } };
export const dynamic = 'force-dynamic';

type P = Promise<{ thread: string }>;
const WHO: Record<string, string> = { manager: 'You', system: 'CoHostCompare' };

export default async function ManagerThread({ params }: { params: P }) {
  const { thread: id } = await params;
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
  const accepted = t.status === 'accepted';
  const closed = ['accepted', 'declined', 'withdrawn'].includes(t.status);
  const first = String(req.owner_name || 'Owner').split(' ')[0];

  return (
    <main style={{ maxWidth: 860, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/dashboard" className="hint">← All quote requests</Link>
      <div>
        <span className="label">Quote request for {t.manager_name}</span>
        <h1 style={{ fontSize: 'clamp(26px,4vw,34px)', margin: '2px 0 0' }}>{first} · {req.suburb || ''} {req.state || ''} {req.postcode}</h1>
      </div>

      <section className="panel" style={{ display: 'grid', gap: 10 }}>
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '10px 20px', margin: 0 }}>
          <div><dt className="label">Property</dt><dd style={{ margin: 0 }}>{req.property_type}, {Number(req.bedrooms) === 0 ? 'studio' : `${req.bedrooms} bedrooms`}</dd></div>
          <div><dt className="label">Listed now</dt><dd style={{ margin: 0 }}>{req.currently_listed}</dd></div>
          <div><dt className="label">Wants help with</dt><dd style={{ margin: 0 }}>{(req.services || []).join(', ')}</dd></div>
          <div><dt className="label">Timing</dt><dd style={{ margin: 0 }}>{req.start_timing}</dd></div>
          <div><dt className="label">Received</dt><dd style={{ margin: 0 }}>{new Date(t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
        </dl>
        {req.notes && <p style={{ margin: 0 }}><b>Owner&apos;s note:</b> {req.notes}</p>}
        {accepted ? (
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

      <section className="panel" style={{ display: 'grid', gap: 14 }} aria-label="Messages">
        <h2 style={{ fontSize: 20, margin: 0 }}>Messages</h2>
        {(msgs || []).map((x) => (
          <div key={x.id} style={{ justifySelf: x.sender === 'manager' ? 'end' : 'start', maxWidth: '85%', display: 'grid', gap: 4 }}>
            <span className="hint" style={{ textAlign: x.sender === 'manager' ? 'right' : 'left' }}>{WHO[x.sender] || first} · {new Date(x.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}</span>
            <div style={{ padding: '10px 14px', borderRadius: 12, whiteSpace: 'pre-wrap', background: x.sender === 'manager' ? 'var(--brand)' : x.sender === 'system' ? 'var(--surface)' : 'var(--tint)', color: x.sender === 'manager' ? 'var(--on-brand)' : 'var(--ink)', border: x.sender === 'system' ? '1px dashed var(--line-strong)' : 0 }}>{x.body}</div>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}><ManagerComposer thread={t.id} /></div>
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
