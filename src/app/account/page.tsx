import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import QuoteTable, { type QuoteCol } from '@/components/QuoteTable';
import { managersNear } from '@/lib/data';
import type { Quote } from '@/lib/quotes';
import { adminClient, currentUser, userClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Owner portal', robots: { index: false } };

type SP = Promise<{ sent?: string }>;

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
      {sp.sent && <div className="panel" style={{ background: 'var(--tint)' }}><b>Request sent to {sp.sent} manager{sp.sent === '1' ? '' : 's'}.</b> We&apos;ve emailed you a copy. Open a manager below to message them; quotes and replies appear here.</div>}
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
            const quoted = (r.quote_request_managers || []).filter((m) => m.quote && ['quoted', 'accepted'].includes(m.status));
            if (!quoted.length) return null;
            return (
              <div style={{ padding: '14px 20px 4px', display: 'grid', gap: 8 }}>
                <b>{quoted.length === 1 ? 'Your quote so far' : `Compare your ${quoted.length} quotes`}</b>
                <QuoteTable quotes={quoted.map((m): QuoteCol => ({ name: m.manager_name, href: `/account/messages/${m.id}`, q: m.quote as Quote, accepted: m.status === 'accepted', nearby: nearby.get(r.id)?.get(m.manager_slug) }))} />
                <span className="hint">Open a manager below to ask questions or accept their quote.</span>
              </div>
            );
          })()}
          <div style={{ display: 'grid', gap: 6, padding: '4px 20px 16px' }}>
            {(r.quote_request_managers || []).map((m) => {
              const msgs = [...(m.messages || [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
              const last = msgs[msgs.length - 1];
              const unread = msgs.filter((x) => !x.read_by_owner && x.sender === 'manager').length;
              return (
                <a key={m.id} href={`/account/messages/${m.id}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '2px 12px', borderTop: '1px solid var(--line)', paddingTop: 10, color: 'inherit', textDecoration: 'none' }}>
                  <span style={{ fontWeight: unread ? 700 : 600, color: 'var(--brand)' }}>{m.manager_name}{unread ? ` · ${unread} new` : ''}</span>
                  <span className="hint" style={m.status === 'quoted' ? { color: 'var(--signal)', fontWeight: 700 } : undefined}>{STATUS[m.status] || m.status}</span>
                  <span className="hint" style={{ gridColumn: '1 / -1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {last ? `${last.sender === 'owner' ? 'You: ' : ''}${last.body}` : 'No messages yet'}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
