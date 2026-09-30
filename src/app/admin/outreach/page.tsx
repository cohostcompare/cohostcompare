import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { DAILY_CAP, SEQUENCE, type Ctx } from '@/lib/outreach';
import { adminClient } from '@/lib/supabase/server';
import { RESEARCHED_CONTACTS } from '@/lib/jobs/contacts';
import { addContact, approveResearched, sendNow, setStatus } from './actions';

export const metadata: Metadata = { title: 'Outreach · Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ done?: string; error?: string; preview?: string }>;

export default async function Outreach({ searchParams }: { searchParams: SP }) {
  await requireAdmin('/admin/outreach');
  const sp = await searchParams;
  const db = adminClient();
  const [{ data: contacts, error }, { data: managers }] = await Promise.all([
    db.from('outreach_contacts').select('id, email, first_name, source_url, step, status, next_send_at, last_sent_at, managers(name, slug, claimed)').order('created_at', { ascending: false }).limit(300),
    db.from('managers').select('id, name, claimed').eq('published', true).eq('claimed', false).order('name'),
  ]);
  const { data: allMgrs } = await db.from('managers').select('slug, name, claimed, published');
  const mgrBySlug = new Map((allMgrs || []).map((m) => [m.slug, m]));
  const have = new Set((contacts || []).map((c) => `${((Array.isArray(c.managers) ? c.managers[0] : c.managers) as { slug: string } | null)?.slug}|${c.email}`));
  const pending = RESEARCHED_CONTACTS.filter((c) => !have.has(`${c.slug}|${c.email}`));
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
  const counts = (contacts || []).reduce<Record<string, number>>((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {});
  const sample: Ctx = { manager: 'Example Stays', slug: 'example', first: 'Sam', homes: 24, rating: 4.86, suburbs: ['Bondi', 'Coogee'], waiting: 0, email: 'sam@example.com.au', source: 'https://example.com.au/contact' };
  const i = Math.min(Math.max(Number(sp.preview || 1), 1), SEQUENCE.length) - 1;

  return (
    <main style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <div>
        <h1 style={{ fontSize: 34, margin: 0 }}>Manager outreach</h1>
        <p className="hint" style={{ margin: '4px 0 0' }}>Five emails over about 24 days inviting unclaimed managers to claim their profile. Sent automatically each morning, up to {DAILY_CAP} a day. Stops when they claim, unsubscribe or you mark them as replied (their replies land in hello@). Only add addresses a business publishes on its own website.</p>
      </div>
      {error && <div role="alert" className="panel" style={{ borderColor: 'var(--signal)' }}>Run supabase/009_launch_features.sql first. ({error.message})</div>}
      {sp.error && <div role="alert" className="panel" style={{ borderColor: 'var(--signal)' }}>{sp.error}</div>}
      {sp.done && <div role="status" className="panel" style={{ background: 'var(--tint)' }}>{sp.done}</div>}

      <div className="chips">{Object.entries(counts).map(([k, v]) => <span key={k} className="chip">{k}: {v}</span>)}</div>

      <form action={addContact} className="panel" style={{ display: 'grid', gap: 10 }}>
        <b>Add a contact</b>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          <select className="field" name="manager_id" required defaultValue=""><option value="" disabled>Unclaimed manager…</option>{(managers || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <input className="field" name="email" type="email" placeholder="Published business email" required />
          <input className="field" name="first_name" placeholder="First name (optional)" />
          <input className="field" name="source_url" placeholder="Page where it's published, https://…" required />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" type="submit">Add contact</button>
        </div>
      </form>
      {pending.length > 0 && (
        <form action={approveResearched} className="panel" style={{ display: 'grid', gap: 10 }}>
          <b>Researched contacts to review ({pending.length})</b>
          <p className="hint" style={{ margin: 0 }}>Each email was found on the business&apos;s own website (source link). Untick any you don&apos;t want, then approve. Nothing is sent until you approve, and only unclaimed, visible profiles are emailed. Profiles marked &ldquo;not created yet&rdquo; need <b>Admin → Listing data → Update researched profiles</b> first.</p>
          <div style={{ display: 'grid', gap: 2, maxHeight: 460, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            {pending.map((c) => {
              const m = mgrBySlug.get(c.slug);
              const ok = m && !m.claimed && m.published;
              return (
                <label key={`${c.slug}|${c.email}`} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 10, padding: '8px 12px', borderTop: '1px solid var(--line)', alignItems: 'start', opacity: ok ? 1 : 0.55 }}>
                  <input type="checkbox" name="pick" value={`${c.slug}|${c.email}`} defaultChecked={Boolean(ok)} disabled={!ok} style={{ marginTop: 4 }} />
                  <span><b>{m?.name || c.slug}</b> <span className="hint">· {c.email} · <a href={c.source} target="_blank" rel="noreferrer">{host(c.source)}</a>{!m ? ' · profile not created yet' : m.claimed ? ' · already claimed' : !m.published ? ' · hidden' : ''}</span></span>
                </label>
              );
            })}
          </div>
          <button className="btn primary" type="submit" style={{ justifySelf: 'start' }}>Approve ticked contacts</button>
        </form>
      )}
      <form action={sendNow}><button className="btn secondary" type="submit">Send today&apos;s due emails now</button></form>

      <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--tint)' }}><b>Contacts</b></div>
        {!(contacts || []).length && <p className="hint" style={{ margin: 0, padding: 16 }}>No contacts yet.</p>}
        {(contacts || []).map((c) => {
          const m = (Array.isArray(c.managers) ? c.managers[0] : c.managers) as { name: string; slug: string } | null;
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
              <span><b>{m?.name}</b> <span className="hint">· {c.email} · {c.status} · sent {c.step} of {SEQUENCE.length}{c.status === 'active' ? ` · next ${new Date(c.next_send_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''} · <a href={c.source_url} target="_blank" rel="noreferrer">source</a></span></span>
              <form action={setStatus} style={{ display: 'flex', gap: 6 }}>
                <input type="hidden" name="id" value={c.id} />
                {c.status === 'active' && <><button className="btn secondary small" name="status" value="replied">Replied</button><button className="btn secondary small" name="status" value="paused">Pause</button></>}
                {c.status === 'paused' && <button className="btn secondary small" name="status" value="active">Resume</button>}
              </form>
            </div>
          );
        })}
      </section>

      <section className="panel" style={{ display: 'grid', gap: 10 }}>
        <b>Preview the emails</b>
        <div className="chips">{SEQUENCE.map((_, n) => <Link key={n} className="chip" href={`/admin/outreach?preview=${n + 1}`} style={{ textDecoration: 'none', fontWeight: n === i ? 700 : 400 }}>Email {n + 1}</Link>)}</div>
        <p style={{ margin: 0 }}><b>Subject:</b> {SEQUENCE[i].subject(sample)}</p>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', background: 'var(--surface)', padding: 14, borderRadius: 10 }}>{SEQUENCE[i].body(sample)}{'\n\n'}[{SEQUENCE[i].cta(sample).label}]{'\n\n'}— Ben Deeley, Founder, CoHostCompare. Footer: why they&apos;re receiving it, ABN, unsubscribe link.</p>
      </section>
    </main>
  );
}
