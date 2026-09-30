import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { DAILY_CAP, SEQUENCE, type Ctx } from '@/lib/outreach';
import { adminClient } from '@/lib/supabase/server';
import { addContact, sendNow, setStatus } from './actions';

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
