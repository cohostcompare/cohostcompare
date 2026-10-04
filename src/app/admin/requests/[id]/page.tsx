import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import QuoteTable, { type QuoteCol } from '@/components/QuoteTable';
import { requireAdmin } from '@/lib/admin';
import { TEST_SLUG } from '@/lib/data';
import type { Quote } from '@/lib/quotes';
import { adminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Quote request · Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

/*
 Read-only view of one quote request for support: what the owner asked for, who it went to, each manager's
 quote or decline, the conversation and any client confirmation fee. Nothing here changes anything.
*/

type Thread = { id: string; manager_slug: string; manager_name: string; status: string; quote: Quote | null; created_at: string; updated_at: string; quoted_at: string | null; accepted_at: string | null; owner_seen_at: string | null; manager_reminded_at: string | null; unclaimed_notified_at: string | null };
type Msg = { id: string; thread_id: string; sender: string; body: string; created_at: string; read_by_owner: boolean; read_by_manager: boolean };
type Fee = { id: string; thread_id: string; amount: number; status: string; note: string | null; created_at: string; updated_at: string };

const STATUS: Record<string, [string, string]> = {
  sent: ['Waiting', 'st-wait'], viewed: ['Viewed, no quote', 'st-wait'], quoted: ['Quoted', 'st-quoted'], accepted: ['Accepted', 'st-won'], declined: ['Declined', 'st-lost'], withdrawn: ['Withdrawn', 'st-lost'],
};
const FEE: Record<string, string> = { awaiting_unlock: 'Waiting for the manager to confirm (A$99 + GST)', paid: 'Paid', waived: 'Waived by admin', expired: 'Expired after 48 hours (owner told they can choose another)', owed: 'Owed', invoiced: 'Invoiced' };
const SOURCE: Record<string, string> = { ads: 'Google Ads', google: 'Google search (free)', social: 'Social media', referral: 'Other website', email: 'Email', direct: 'Direct or unknown' };
const when = (d: string) => new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' });

export default async function AdminRequest({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('/admin/requests');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = adminClient();
  const { data: r } = await db.from('quote_requests').select('*').eq('id', id).maybeSingle();
  if (!r) notFound();
  const { data: ts } = await db.from('quote_request_managers').select('id, manager_slug, manager_name, status, quote, created_at, updated_at, quoted_at, accepted_at, owner_seen_at, manager_reminded_at, unclaimed_notified_at').eq('request_id', id).order('created_at');
  const threads = (ts || []) as Thread[];
  const threadIds = threads.map((t) => t.id);
  const [{ data: msgs }, { data: fees }, { data: mgrs }] = await Promise.all([
    threadIds.length ? db.from('messages').select('id, thread_id, sender, body, created_at, read_by_owner, read_by_manager').in('thread_id', threadIds).order('created_at') : Promise.resolve({ data: [] as Msg[] }),
    threadIds.length ? db.from('success_fees').select('id, thread_id, amount, status, note, created_at, updated_at').in('thread_id', threadIds) : Promise.resolve({ data: [] as Fee[] }),
    threads.length ? db.from('managers').select('slug, claimed, published').in('slug', threads.map((t) => t.manager_slug)) : Promise.resolve({ data: [] as { slug: string; claimed: boolean; published: boolean }[] }),
  ]);
  const byThread = new Map<string, Msg[]>();
  for (const m of (msgs || []) as Msg[]) byThread.set(m.thread_id, [...(byThread.get(m.thread_id) || []), m]);
  const feeOf = new Map(((fees || []) as Fee[]).map((f) => [f.thread_id, f]));
  const mgrOf = new Map((mgrs || []).map((m) => [m.slug, m]));
  const isTest = threads.length > 0 && threads.every((t) => t.manager_slug === TEST_SLUG);
  const isDecline = (m: Msg) => m.sender === 'system' && /can’t take on this property/.test(m.body);

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (v == null || v === '' ? null : <div><dt className="label">{k}</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{v}</dd></div>);
  const beds = r.bedrooms == null ? null : r.bedrooms === 0 ? 'Studio' : `${r.bedrooms} bedroom${r.bedrooms === 1 ? '' : 's'}`;

  return (
    <main className="admin" style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin/requests" className="hint">← Quote requests</Link>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 30, margin: 0 }}>{r.address || `${r.suburb || ''} ${r.postcode || ''}`.trim() || 'Quote request'}</h1>
        {isTest && <span className="st st-lost">Test request</span>}
        <span className="hint" style={{ marginLeft: 'auto' }}>Sent {when(r.created_at)}</span>
      </div>
      <p className="hint" style={{ margin: 0 }}>Read-only. To act on this request, use the list page (delete, add a manager email, remove a manager) or the owner&apos;s and manager&apos;s own pages.</p>

      <div className="admin-two">
        <section className="panel" style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Owner</h2>
          <dl style={{ display: 'grid', gap: '8px 16px', margin: 0 }}>
            <Row k="Name" v={r.owner_name} />
            <Row k="Email" v={<a href={`mailto:${r.owner_email}`}>{r.owner_email}</a>} />
            <Row k="Phone" v={r.owner_phone} />
            <Row k="Came from" v={r.source ? `${SOURCE[r.source] || r.source}${r.campaign ? ` · campaign ${r.campaign}` : ''}` : 'Not recorded'} />
            <Row k="Owner id" v={<code style={{ fontSize: 12 }}>{r.owner_id}</code>} />
          </dl>
        </section>
        <section className="panel" style={{ display: 'grid', gap: 10 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Property</h2>
          <dl style={{ display: 'grid', gap: '8px 16px', margin: 0 }}>
            <Row k="Address" v={r.address} />
            <Row k="Suburb" v={[r.suburb, r.state, r.postcode].filter(Boolean).join(' ')} />
            <Row k="Type" v={[r.property_type, beds].filter(Boolean).join(', ')} />
            <Row k="Availability" v={r.availability} />
            <Row k="Situation" v={r.situation} />
            <Row k="Currently listed" v={r.currently_listed} />
            <Row k="Start" v={r.start_timing} />
            <Row k="Services wanted" v={(r.services || []).length ? (r.services as string[]).join(', ') : 'Not specified'} />
            <Row k="Notes" v={r.notes ? <span style={{ whiteSpace: 'pre-wrap' }}>{r.notes}</span> : null} />
          </dl>
        </section>
      </div>

      {threads.some((t) => t.quote) && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>Quotes side by side</h2>
          <QuoteTable quotes={threads.filter((t) => t.quote).map((t): QuoteCol => ({ name: t.manager_name, href: `/managers/${t.manager_slug}`, q: t.quote as Quote, accepted: t.status === 'accepted' }))} />
        </section>
      )}

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Managers ({threads.length})</h2>
        {threads.map((t) => {
          const [label, cls] = STATUS[t.status] || [t.status, ''];
          const m = mgrOf.get(t.manager_slug);
          const list = byThread.get(t.id) || [];
          const decline = list.find(isDecline);
          const fee = feeOf.get(t.id);
          return (
            <article key={t.id} className="panel" style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <b style={{ fontSize: 17 }}><Link href={`/managers/${t.manager_slug}`}>{t.manager_name}</Link></b>
                <span className={`st ${cls}`}>{label}</span>
                {m && !m.claimed && t.manager_slug !== TEST_SLUG && <span className="st st-lost">Unclaimed</span>}
                {m && !m.published && <span className="st st-lost">Hidden</span>}
                <span className="hint" style={{ marginLeft: 'auto' }}>Thread <code style={{ fontSize: 12 }}>{t.id}</code></span>
              </div>
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '6px 16px', margin: 0 }}>
                <Row k="Sent" v={when(t.created_at)} />
                <Row k="Quoted" v={t.quoted_at ? when(t.quoted_at) : null} />
                <Row k="Accepted" v={t.accepted_at ? when(t.accepted_at) : null} />
                <Row k="Owner saw the quote" v={t.owner_seen_at ? when(t.owner_seen_at) : t.quote ? 'Not yet' : null} />
                <Row k="Manager reminded" v={t.manager_reminded_at ? when(t.manager_reminded_at) : null} />
                <Row k="Unclaimed manager emailed" v={t.unclaimed_notified_at ? when(t.unclaimed_notified_at) : null} />
                <Row k="Last change" v={when(t.updated_at)} />
              </dl>
              {decline && <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '10px 12px' }}><b>Declined.</b> <span style={{ whiteSpace: 'pre-wrap' }}>{decline.body.replace(/^.*?can’t take on this property\.\s*/s, '')}</span></div>}
              {fee && (
                <div style={{ background: 'var(--tint)', borderRadius: 10, padding: '10px 12px' }}>
                  <b>Client confirmation:</b> A${fee.amount} · {FEE[fee.status] || fee.status} <span className="hint">· created {when(fee.created_at)} · updated {when(fee.updated_at)}</span>{fee.note ? <div className="hint">{fee.note}</div> : null}
                </div>
              )}
              <details>
                <summary className="hint" style={{ cursor: 'pointer' }}>Messages ({list.length})</summary>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {!list.length && <span className="hint">No messages.</span>}
                  {list.map((msg) => (
                    <div key={msg.id} style={{ display: 'grid', gap: 2, borderLeft: `3px solid ${msg.sender === 'owner' ? 'var(--brand)' : msg.sender === 'manager' ? '#2A438F' : 'var(--line)'}`, paddingLeft: 10 }}>
                      <span className="hint"><b style={{ textTransform: 'capitalize' }}>{msg.sender === 'system' ? 'CoHostCompare' : msg.sender}</b> · {when(msg.created_at)}{msg.sender === 'manager' && !msg.read_by_owner ? ' · owner hasn’t read it' : ''}{msg.sender === 'owner' && !msg.read_by_manager ? ' · manager hasn’t read it' : ''}</span>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{msg.body}</span>
                    </div>
                  ))}
                </div>
              </details>
            </article>
          );
        })}
      </section>
    </main>
  );
}
