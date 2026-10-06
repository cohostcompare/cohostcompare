import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNotice from '@/components/AdminNotice';
import { requireAdmin } from '@/lib/admin';
import { siteDomain } from '@/lib/claims';
import { adminClient } from '@/lib/supabase/server';
import { approve, infoReceived, reject, requestInfo } from './actions';

export const metadata: Metadata = { title: 'Admin · Claims', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ show?: string; error?: string; done?: string }>;
type Claim = {
  id: string; email: string; name: string; role_title: string | null; phone: string | null; status: string; method: string | null;
  created_at: string; decided_at: string | null; admin_note: string | null; info_request: string | null;
  managers: { name: string; slug: string; website: string | null } | { name: string; slug: string; website: string | null }[] | null;
};

const LABEL: Record<string, string> = { pending: 'Needs review', info_requested: 'Waiting on their reply', info_received: 'Reply received: review', approved: 'Approved', rejected: 'Rejected' };
const COLOUR: Record<string, string> = { pending: 'var(--signal)', info_requested: 'var(--brand)', info_received: 'var(--signal)', approved: 'var(--muted)', rejected: 'var(--muted)' };
const when = (d: string) => new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' });

export default async function Claims({ searchParams }: { searchParams: SP }) {
  await requireAdmin('/admin/claims');
  const sp = await searchParams;
  const show = sp.show === 'all' ? 'all' : 'open';
  let q = adminClient().from('manager_claims')
    .select('id, email, name, role_title, phone, status, method, created_at, decided_at, admin_note, info_request, managers(name, slug, website)')
    .order('created_at', { ascending: false }).limit(200);
  if (show === 'open') q = q.in('status', ['pending', 'info_requested', 'info_received']);
  const { data } = await q;
  const claims = (data || []) as Claim[];

  return (
    <main style={{ maxWidth: 960, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Link href="/admin" className="hint">← Admin</Link>
          <h1 style={{ fontSize: 34, margin: '4px 0 0' }}>Profile claims</h1>
          <p className="hint" style={{ margin: '4px 0 0' }}>Claimants&apos; email replies go to hello@. When one arrives, click <b>Mark reply received</b> so it&apos;s back in the review queue (and the 24-hour reminder applies).</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className={`btn ${show === 'open' ? 'primary' : 'secondary'}`} href="/admin/claims">Open</Link>
          <Link className={`btn ${show === 'all' ? 'primary' : 'secondary'}`} href="/admin/claims?show=all">All</Link>
        </div>
      </div>
      <AdminNotice done={sp.done ? 'Done.' : undefined} error={sp.error ? `That didn’t work: ${sp.error}` : undefined} />
      {!claims.length && <div className="panel">{show === 'open' ? 'Nothing to review.' : 'No claims yet.'}</div>}
      {claims.map((c) => {
        const m = Array.isArray(c.managers) ? c.managers[0] : c.managers;
        const dom = siteDomain(m?.website ?? null);
        const emailDom = c.email.split('@')[1];
        const open = ['pending', 'info_requested', 'info_received'].includes(c.status);
        return (
          <section key={c.id} className="panel" style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <b style={{ fontSize: 18 }}>{m?.name}</b> <Link href={`/managers/${m?.slug}`} className="hint">profile</Link>
                <div className="hint">Claimed {when(c.created_at)}{c.decided_at ? ` · decided ${when(c.decided_at)}` : ''}</div>
              </div>
              <span style={{ fontWeight: 700, color: COLOUR[c.status] }}>{LABEL[c.status] || c.status}</span>
            </div>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '8px 20px', margin: 0 }}>
              <div><dt className="label">Person</dt><dd style={{ margin: 0 }}>{c.name}{c.role_title ? `, ${c.role_title}` : ''}</dd></div>
              <div><dt className="label">Email</dt><dd style={{ margin: 0, wordBreak: 'break-all' }}>{c.email}</dd></div>
              <div><dt className="label">Phone</dt><dd style={{ margin: 0 }}>{c.phone || '—'}</dd></div>
              <div><dt className="label">Domain check</dt><dd style={{ margin: 0 }}>
                {dom ? (emailDom === dom ? <b style={{ color: 'var(--brand)' }}>Matches {dom}</b> : <>@{emailDom} ≠ {dom}</>) : 'No website on file'}
              </dd></div>
              {m?.website && <div><dt className="label">Business website</dt><dd style={{ margin: 0 }}><a href={m.website} target="_blank" rel="noreferrer">{dom}</a></dd></div>}
              <div><dt className="label">Check them</dt><dd style={{ margin: 0 }}>
                <a href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(`${c.name} ${m?.name ?? ''}`)}`} target="_blank" rel="noreferrer">LinkedIn search</a>
                {' · '}<a href={`https://www.google.com/search?q=${encodeURIComponent(`"${c.name}" "${m?.name ?? ''}"`)}`} target="_blank" rel="noreferrer">Google</a>
              </dd></div>
            </dl>
            {c.info_request && <p className="hint" style={{ margin: 0 }}><b>Info requested:</b> {c.info_request}</p>}
            {c.admin_note && <p className="hint" style={{ margin: 0 }}><b>Note:</b> {c.admin_note}</p>}
            {open && (
              <div style={{ display: 'grid', gap: 10, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <form action={approve} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="hidden" name="id" value={c.id} />
                  <input className="field" name="note" placeholder="Private note (optional), e.g. confirmed on LinkedIn" style={{ flex: '1 1 260px', minHeight: 40 }} />
                  <label className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }} title="Approving gives this person control of the profile and emails them."><input type="checkbox" name="confirm" value="yes" required /> Sure?</label>
                  <button className="btn primary" type="submit">Approve</button>
                </form>
                {c.status === 'info_requested' && (
                  <form action={infoReceived} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="hidden" name="id" value={c.id} />
                    <input className="field" name="note" placeholder="What they sent (optional), e.g. LinkedIn link" style={{ flex: '1 1 260px', minHeight: 40 }} />
                    <button className="btn secondary" type="submit">Mark reply received</button>
                  </form>
                )}
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Ask for more information</summary>
                  <form action={requestInfo} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    <input type="hidden" name="id" value={c.id} />
                    <textarea className="field" name="message" rows={3} placeholder="Leave blank to send our standard request (business email, LinkedIn, or an Airbnb co-host screenshot)." />
                    <button className="btn secondary" type="submit" style={{ justifySelf: 'start' }}>Email them</button>
                  </form>
                </details>
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Reject</summary>
                  <form action={reject} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    <input type="hidden" name="id" value={c.id} />
                    <textarea className="field" name="message" rows={2} placeholder="Reason (optional; included in the email if you notify them)" />
                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" name="notify" defaultChecked /> Email them to say it wasn&apos;t approved</label>
                    <button className="btn secondary" type="submit" style={{ justifySelf: 'start' }}>Reject claim</button>
                  </form>
                </details>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
