import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import QuoteSentConversion from '@/components/QuoteSentConversion';
import { earningsHref } from '@/lib/requirements';
import { toggleWatch, withdrawRequest } from './owner-actions';
import QuoteTable, { type QuoteCol } from '@/components/QuoteTable';
import { managersNear } from '@/lib/data';
import type { Quote } from '@/lib/quotes';
import { adminClient, currentUser, userClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Owner portal', robots: { index: false } };

type SP = Promise<{ sent?: string; r?: string }>;

const STATUS: Record<string, string> = { sent: 'Waiting for a reply', viewed: 'Viewed by the manager', quoted: 'Quote received, ready to compare', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn' };


export default async function Account({ searchParams }: { searchParams: SP }) {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/account');
  const sp = await searchParams;
  const s = await userClient();
  type Thread = { id: string; manager_name: string; manager_slug: string; status: string; quote: unknown; messages: { sender: string; body: string; created_at: string; read_by_owner: boolean }[] };
  type Req = { id: string; created_at: string; address: string | null; postcode: string; bedrooms: number; property_type: string; lat?: number | null; lng?: number | null; quote_request_managers: Thread[] };
  const { data: rawRequests } = await s
    .from('quote_requests')
    .select('*, quote_request_managers(id, manager_name, manager_slug, status, quote, messages(sender, body, created_at, read_by_owner))')
    .order('created_at', { ascending: false });
  const requests = rawRequests as Req[] | null;

  // Track record near each property (from our listing data), for the comparison table.
  const nearby = new Map<string, Map<string, { homes: number; rating: number | null }>>();
  const quotedIds: string[] = [];
  for (const r of requests || []) {
    const qs = (r.quote_request_managers || []).filter((m) => m.quote && ['quoted', 'accepted'].includes(m.status));
    quotedIds.push(...qs.map((m) => m.id));
    if (qs.length && r.lat != null && r.lng != null) {
      const near = await managersNear(Number(r.lat), Number(r.lng));
      nearby.set(r.id, new Map(near.map((n) => [n.slug, { homes: n.nearby, rating: n.nearbyRating }])));
    }
  }
  // Seeing the comparison counts as having reviewed those quotes (stops reminder emails). Needs 008; errors ignored.
  if (quotedIds.length) await adminClient().from('quote_request_managers').update({ owner_seen_at: new Date().toISOString() }).in('id', quotedIds).is('owner_seen_at', null);

  return (
    <main style={{ maxWidth: 820, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span className="label" style={{ color: 'var(--brand)' }}>Owner portal</span>
          <h1 style={{ fontSize: 'clamp(28px,4.4vw,40px)', margin: 0 }}>Inbox</h1>
          <span className="hint">Your quote requests, grouped by property, with quotes and a conversation for each manager.</span>
        </div>
        <Link className="btn secondary" href="/">New search</Link>
      </div>
      {sp.sent && sp.r && <QuoteSentConversion requestId={sp.r} />}
      {sp.sent && (() => {
        const just = (requests || []).find((r) => r.id === sp.r) || (requests || [])[0];
        return (
          <div className="panel" style={{ background: 'var(--tint)', display: 'grid', gap: 12 }}>
            <span><b>Request sent to {sp.sent} manager{sp.sent === '1' ? '' : 's'}.</b> We&apos;ve emailed you a copy. Open a manager below to message them; quotes and replies appear here.</span>
            {just?.lat != null && just?.lng != null && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <span>While you wait for quotes, see what {just.address ? just.address.split(',')[0] : 'your property'} could earn. We&apos;ll work it out from your address and bedrooms.</span>
                <a className="earn-pill" href={earningsHref({ lat: just.lat, lng: just.lng, place: just.address, beds: just.bedrooms })}>See what it could earn →</a>
              </div>
            )}
          </div>
        );
      })()}
      {!requests?.length ? (
        <div className="panel">No requests yet. <a href="/">Search for managers</a> near your property to get started.</div>
      ) : requests.map((r) => (
        <section key={r.id} className="panel" style={{ display: 'grid', gap: 0, padding: 0, overflow: 'hidden' }} aria-label={`Quote request for ${r.address || r.postcode}`}>
          <div style={{ background: 'var(--tint)', padding: '14px 20px', display: 'grid', gap: 2 }}>
            <span className="label">Quote request · {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <b style={{ fontSize: 18 }}>{r.address || `Postcode ${r.postcode}`}</b>
            <span className="hint">{r.property_type}, {r.bedrooms === 0 ? 'studio' : `${r.bedrooms} bed`} · sent to {(r.quote_request_managers || []).length} manager{(r.quote_request_managers || []).length === 1 ? '' : 's'}</span>
          </div>
          {(() => {
            const all = r.quote_request_managers || [];
            const quoted = all.filter((m) => m.quote && ['quoted', 'accepted'].includes(m.status));
            const waiting = all.filter((m) => !(m.quote && ['quoted', 'accepted'].includes(m.status)));
            const unreadOf = (m: Thread) => (m.messages || []).filter((x) => !x.read_by_owner && x.sender === 'manager').length;
            return (
              <div style={{ padding: '16px 20px 18px', display: 'grid', gap: 14 }}>
                {quoted.length > 0 && (
                  <>
                    <b>{quoted.length === 1 ? '1 quote received' : `${quoted.length} quotes received, side by side`}</b>
                    <div className="qcards">
                      {quoted.map((m) => {
                        const q = m.quote as Quote;
                        const u = unreadOf(m);
                        return (
                          <div key={m.id} className={`qcard${m.status === 'accepted' ? ' won' : ''}`}>
                            <b className="qname">{m.manager_name}</b>
                            {m.status === 'accepted' && <span className="qtag">Accepted</span>}
                            <div className="qfee">{q.feePct}%{q.gst ? ' + GST' : ''}<span>management fee</span></div>
                            <ul>
                              <li>{q.setupFee ? `A$${q.setupFee.toLocaleString('en-AU')} setup` : 'No setup fee'}</li>
                              <li>{q.minTermMonths ? `${q.minTermMonths}-month minimum` : 'No lock-in'}</li>
                              {nearby.get(r.id)?.get(m.manager_slug)?.homes ? <li>{nearby.get(r.id)!.get(m.manager_slug)!.homes} homes nearby</li> : null}
                            </ul>
                            {u ? <span className="hint" style={{ color: 'var(--signal)', fontWeight: 700 }}>{u} new message{u === 1 ? '' : 's'}</span> : null}
                            <Link className="btn primary small" href={`/account/messages/${m.id}`}>{m.status === 'accepted' ? 'Open' : 'Review and accept'}</Link>
                          </div>
                        );
                      })}
                    </div>
                    {quoted.length > 1 && (
                      <details className="qdetails">
                        <summary>Compare every detail side by side</summary>
                        <QuoteTable quotes={quoted.map((m): QuoteCol => ({ name: m.manager_name, href: `/account/messages/${m.id}`, q: m.quote as Quote, accepted: m.status === 'accepted', nearby: nearby.get(r.id)?.get(m.manager_slug) }))} />
                      </details>
                    )}
                  </>
                )}
                {waiting.length > 0 && (
                  <div style={{ display: 'grid', gap: 0 }}>
                    <b style={{ marginBottom: 4 }}>{quoted.length ? 'Still waiting on' : 'Waiting for quotes from'}</b>
                    {waiting.map((m) => {
                      const u = unreadOf(m);
                      return (
                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid var(--line)', padding: '10px 0', flexWrap: 'wrap' }}>
                          <span><b>{m.manager_name}</b> <span className="hint">· {STATUS[m.status] || m.status}{u ? ` · ${u} new message${u === 1 ? '' : 's'}` : ''}</span></span>
                          <Link className="btn secondary small" href={`/account/messages/${m.id}`}>{u ? 'Read message' : 'Message them'}</Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="req-foot">
            {(r.quote_request_managers || []).some((m) => ['sent', 'viewed', 'quoted'].includes(m.status)) && (
              <details className="req-close">
                <summary>Close this request</summary>
                <form action={withdrawRequest} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input className="field" name="reason" aria-label="Reason for closing (optional)" maxLength={300} placeholder="Optional: why, e.g. I've found a manager" />
                  <button className="btn secondary small" type="submit" style={{ justifySelf: 'start' }}>Close it and let the managers know</button>
                </form>
              </details>
            )}
            {r.lat != null && r.lng != null && (
              <form action={toggleWatch} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="on" value={(r as { watch_new?: boolean }).watch_new ? '0' : '1'} />
                <span className="hint">{(r as { watch_new?: boolean }).watch_new ? '✓ We’ll email you when a new manager starts covering this property.' : 'Want more options later?'}</span>
                <button className="linkish" type="submit">{(r as { watch_new?: boolean }).watch_new ? 'Stop these emails' : 'Email me when new managers cover it'}</button>
              </form>
            )}
          </div>
        </section>
      ))}
      <p className="hint" style={{ margin: '8px 0 0' }}><Link href="/account/delete">Delete my account</Link></p>
    </main>
  );
}
