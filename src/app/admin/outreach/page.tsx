import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNotice from '@/components/AdminNotice';
import { requireAdmin } from '@/lib/admin';
import { inboundOn } from '@/lib/inbound';
import { DAILY_CAP, OUTREACH_START, SEQUENCE, outreachOn, outreachStats, requestEmailsOn, type Ctx } from '@/lib/outreach';
import { adminClient } from '@/lib/supabase/server';
import { RESEARCHED_CONTACTS } from '@/lib/jobs/contacts';
import { addContact, approveResearched, sendNow, setStatus, testEmail } from './actions';

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
  const stats = await outreachStats();
  // Opens and clicks (SQL 029): per contact, plus totals since the sequence started.
  const { data: evRows } = await db.from('email_events').select('to_email, kind, link, created_at').gte('created_at', OUTREACH_START).order('created_at', { ascending: false }).limit(5000);
  type Eng = { opens: number; clicks: number; lastOpen?: string; lastClick?: string; links: Map<string, number> };
  const eng = new Map<string, Eng>();
  for (const e of evRows || []) {
    const k = e.to_email.toLowerCase();
    const x = eng.get(k) || { opens: 0, clicks: 0, links: new Map<string, number>() };
    if (e.kind === 'opened') { x.opens++; x.lastOpen ||= e.created_at; }
    else { x.clicks++; x.lastClick ||= e.created_at; if (e.link) x.links.set(e.link, (x.links.get(e.link) || 0) + 1); }
    eng.set(k, x);
  }
  const emailed = (contacts || []).filter((c) => c.step > 0);
  const opened = emailed.filter((c) => eng.get(c.email.toLowerCase())?.opens).length;
  const clicked = emailed.filter((c) => eng.get(c.email.toLowerCase())?.clicks).length;
  const linkTotals = new Map<string, number>();
  for (const x of eng.values()) for (const [l, n] of x.links) linkTotals.set(l, (linkTotals.get(l) || 0) + n);
  const short = (l: string) => l.replace(/^https?:\/\/(www\.)?cohostcompare\.com/, '').replace(/\?.*$/, '') || '/';
  const when = (iso?: string) => iso ? new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' }) : '';
  const counts = (contacts || []).reduce<Record<string, number>>((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {});
  const sample: Ctx = { manager: 'Example Stays', slug: 'example', first: 'Sam', homes: 24, rating: 4.86, suburbs: ['Bondi', 'Coogee'], waiting: 0, email: 'sam@example.com.au', source: 'https://example.com.au/contact' };
  const i = Math.min(Math.max(Number(sp.preview || 1), 1), SEQUENCE.length) - 1;
  const replyTracking = inboundOn() ? 'Reply tracking: on (a reply marks the contact as replied).' : 'Reply tracking: off (set INBOUND_DOMAIN and RESEND_INBOUND_SECRET in Vercel; until then, mark replies by hand below).';

  return (
    <main style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <div>
        <h1 style={{ fontSize: 34, margin: 0 }}>Manager outreach</h1>
        <p className="hint" style={{ margin: '4px 0 0' }}>Five emails over about 24 days inviting unclaimed managers to claim their profile. Sent automatically each morning, up to {DAILY_CAP} a day. Stops when they claim, unsubscribe or you mark them as replied (their replies land in hello@). Only add addresses a business publishes on its own website.</p>
      </div>
      {!outreachOn() ? (
        <div role="status" className="panel" style={{ borderColor: 'var(--signal)', background: 'var(--surface)' }}><b>The outreach sequence is paused{process.env.OUTREACH_ENABLED === '0' ? '' : ` until ${new Date(OUTREACH_START).toLocaleString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}`}.</b> Approved contacts stay queued until then. {requestEmailsOn() ? 'The instant “an owner wants a quote” email to unclaimed managers is on.' : 'The instant “an owner wants a quote” email is also off (REQUEST_EMAILS=0).'} Test emails to hello@ still work. {replyTracking}</div>
      ) : <div role="status" className="panel" style={{ background: 'var(--tint)' }}><b>Outreach is on.</b> Up to {DAILY_CAP} emails a day go out with the daily run. Set OUTREACH_ENABLED=0 in Vercel to stop it. {replyTracking}</div>}
      {error && <div role="alert" className="panel" style={{ borderColor: 'var(--signal)' }}>Run supabase/009_launch_features.sql first. ({error.message})</div>}
      <AdminNotice done={sp.done} error={sp.error} />

      {stats.contacted > 0 && (
        <section className="kpis" aria-label="Outreach results">
          <div className="kpi k-blue"><span>Managers emailed</span><b>{stats.contacted}</b><small>{stats.emails} emails in total · {stats.sentWeek} contacts emailed this week</small></div>
          <div className="kpi k-green"><span>Claimed</span><b>{stats.claimed}</b><small>{Math.round((stats.claimed / stats.contacted) * 100)}% of managers emailed</small></div>
          <div className="kpi k-amber"><span>Replied</span><b>{stats.replied}</b><small>marked as replied (check hello@)</small></div>
          <div className={`kpi ${stats.unsubscribed + stats.bounced > stats.contacted * 0.05 ? 'k-alert' : 'k-teal'}`}><span>Unsubscribed or bounced</span><b>{stats.unsubscribed + stats.bounced}</b><small>{stats.unsubscribed} unsubscribed · {stats.bounced} bounced{stats.unsubscribed + stats.bounced > stats.contacted * 0.05 ? ' · above 5%, check the wording and addresses' : ''}</small></div>
          <div className="kpi k-teal"><span>Still to start</span><b>{stats.queued}</b><small>{stats.finished} finished all five emails</small></div>
        </section>
      )}
      {emailed.length > 0 && (
        <section className="panel" style={{ display: 'grid', gap: 8 }} aria-label="Opens and clicks">
          <b>Opens and clicks</b>
          <div className="kpis">
            <div className="kpi k-blue"><span>Opened</span><b>{opened}</b><small>of {emailed.length} contacts emailed ({Math.round((opened / emailed.length) * 100)}%)</small></div>
            <div className="kpi k-green"><span>Clicked a link</span><b>{clicked}</b><small>{Math.round((clicked / emailed.length) * 100)}% of contacts emailed</small></div>
          </div>
          {linkTotals.size > 0 && <p className="hint" style={{ margin: 0 }}><b>Links clicked:</b> {[...linkTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l, n]) => `${short(l)} (${n})`).join(' · ')}</p>}
          <p className="hint" style={{ margin: 0 }}>Opens come from a tracking image, so they undercount (images off) and overcount (Apple Mail loads them automatically). Clicks are reliable, except that some company mail filters click every link once as a safety check. A reply or a claim is the real signal.</p>
        </section>
      )}
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
      <form action={sendNow} className="panel" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="confirm" value="yes" required /> Send up to {DAILY_CAP} real outreach emails to managers now (the daily run would send them tomorrow morning anyway).</label>
        <button className="btn secondary" type="submit">Send today&apos;s due emails now</button>
      </form>

      <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--tint)' }}><b>Contacts</b></div>
        {!(contacts || []).length && <p className="hint" style={{ margin: 0, padding: 16 }}>No contacts yet.</p>}
        {(contacts || []).map((c) => {
          const m = (Array.isArray(c.managers) ? c.managers[0] : c.managers) as { name: string; slug: string } | null;
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
              <span>
                <b>{m?.name}</b> <span className="hint">· {c.email} · {c.status} · sent {c.step} of {SEQUENCE.length}{c.status === 'active' ? ` · next ${new Date(c.next_send_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}` : ''} · <a href={c.source_url} target="_blank" rel="noreferrer">source</a></span>
                {(() => { const x = eng.get(c.email.toLowerCase()); if (!x || c.step === 0) return null; return (
                  <span style={{ display: 'block', fontSize: 13, marginTop: 2 }}>
                    {x.opens ? <span style={{ color: 'var(--brand)' }}>Opened {x.opens === 1 ? '' : `${x.opens}× `}{when(x.lastOpen)}</span> : <span className="hint">Not opened yet</span>}
                    {x.clicks ? <> · <b style={{ color: 'var(--brand)' }}>Clicked</b> {[...x.links.entries()].map(([l, n]) => `${short(l)}${n > 1 ? ` ×${n}` : ''}`).join(', ')} · {when(x.lastClick)}</> : null}
                  </span>
                ); })()}
              </span>
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
        <p className="hint" style={{ margin: 0 }}>This preview uses an example business. Real emails use each manager&apos;s own name, homes, rating and suburbs. To see the real thing, send yourself a test below.</p>
        <p style={{ margin: 0 }}><b>Subject:</b> {SEQUENCE[i].subject(sample)}</p>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', background: 'var(--surface)', padding: 14, borderRadius: 10 }}>{SEQUENCE[i].body(sample)}{'\n\n'}[{SEQUENCE[i].cta(sample).label}]{'\n\n'}Cheers,{'\n'}The CoHostCompare team{'\n'}(Then the small print: why they&apos;re receiving it, your ABN, how we build profiles, and the unsubscribe link.)</p>
        <form action={testEmail} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <b>Send me a test:</b>
          <select className="field" name="manager_id" required defaultValue="" style={{ maxWidth: 280 }}><option value="" disabled>Pick a manager…</option>{(managers || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <select className="field" name="step" defaultValue={String(i + 1)} style={{ maxWidth: 130 }}>{SEQUENCE.map((_, n) => <option key={n} value={n + 1}>Email {n + 1}</option>)}</select>
          <button className="btn secondary" type="submit">Send test to hello@</button>
        </form>
      </section>
    </main>
  );
}
