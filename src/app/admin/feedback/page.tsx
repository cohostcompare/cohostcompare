import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';
import { setFeedbackReward } from './actions';

export const metadata: Metadata = { title: 'Feedback', robots: { index: false } };
export const dynamic = 'force-dynamic';

type F = { id: string; created_at: string; email: string | null; role: string; ease: number | null; nps: number | null; improve: string; confusing: string | null; wish: string | null; heard_from: string | null; contact_ok: boolean; page: string | null; reward: string | null; reward_status: string; admin_note: string | null; managers: { name: string } | null };

const STATUS: Record<string, string> = { none: 'No reward', granted: 'Pro month added', to_send: 'Pro month to credit', sent: 'Sent', manual: 'Credit Pro by hand' };

export default async function AdminFeedback({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  await requireAdmin('/admin/feedback');
  const { role } = await searchParams;
  let q = adminClient().from('feedback').select('id, created_at, email, role, ease, nps, improve, confusing, wish, heard_from, contact_ok, page, reward, reward_status, admin_note, managers(name)').order('created_at', { ascending: false }).limit(300);
  if (role && ['owner', 'manager', 'visitor'].includes(role)) q = q.eq('role', role);
  const { data, error } = await q;
  const list = (data || []) as unknown as F[];
  const scored = list.filter((f) => f.nps != null);
  const nps = scored.length ? Math.round(((scored.filter((f) => f.nps! >= 9).length - scored.filter((f) => f.nps! <= 6).length) / scored.length) * 100) : null;
  const eased = list.filter((f) => f.ease != null);
  const ease = eased.length ? eased.reduce((s, f) => s + f.ease!, 0) / eased.length : null;
  const todo = list.filter((f) => f.reward_status === 'to_send' || f.reward_status === 'manual');
  return (
    <main style={{ maxWidth: 960, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <h1 style={{ fontSize: 34, margin: 0 }}>Feedback</h1>
      {error && <p className="panel" style={{ margin: 0 }}>Feedback starts once database update 018 has been run in Supabase.</p>}
      <section className="dash-stats">
        <div className="panel"><b>{list.length}</b><span>responses{role ? ` from ${role}s` : ''}</span></div>
        <div className="panel"><b>{nps ?? '–'}</b><span>Net Promoter Score (−100 to 100, from {scored.length})</span></div>
        <div className="panel"><b>{ease != null ? ease.toFixed(1) : '–'}</b><span>average ease of use, out of 5</span></div>
        <div className="panel"><b style={{ color: todo.length ? 'var(--signal)' : undefined }}>{todo.length}</b><span>thank-yous to send by hand</span></div>
      </section>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['', 'Everyone'], ['owner', 'Owners'], ['manager', 'Managers'], ['visitor', 'Visitors']].map(([k, l]) => <Link key={k} className="chip" style={(role || '') === k ? { background: 'var(--brand)', color: '#fff' } : undefined} href={k ? `/admin/feedback?role=${k}` : '/admin/feedback'}>{l}</Link>)}
      </div>
      {!error && !list.length && <p className="panel" style={{ margin: 0 }}>No feedback yet.</p>}
      {list.map((f) => (
        <article key={f.id} className="panel" style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <b style={{ textTransform: 'capitalize' }}>{f.role}{f.managers?.name ? `: ${f.managers.name}` : ''}</b>
            <span className="hint">{f.email ? <a href={`mailto:${f.email}`}>{f.email}</a> : 'no email'}{f.contact_ok ? ' · happy to talk' : ''} · {new Date(f.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' })}{f.page ? ` · from ${f.page}` : ''}</span>
            <span style={{ marginLeft: 'auto' }}>Ease <b>{f.ease ?? '–'}</b>/5 · Recommend <b>{f.nps ?? '–'}</b>/10</span>
          </div>
          <div><span className="label">Improve</span><p style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{f.improve}</p></div>
          {f.confusing && <div><span className="label">Confusing or nearly stopped them</span><p style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{f.confusing}</p></div>}
          {f.wish && <div><span className="label">{f.role === 'manager' ? 'Would make Pro worth paying for' : 'Wish we had'}</span><p style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{f.wish}</p></div>}
          {f.heard_from && <span className="hint">Heard about us from: {f.heard_from}</span>}
          {f.reward_status !== 'none' && (
            <form action={setFeedbackReward} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', background: f.reward_status === 'to_send' || f.reward_status === 'manual' ? 'var(--tint)' : undefined, borderRadius: 10, padding: '8px 10px' }}>
              <input type="hidden" name="id" value={f.id} />
              <span>🎁 {f.reward}: <b>{STATUS[f.reward_status]}</b></span>
              <input name="note" className="field" defaultValue={f.admin_note || ''} placeholder="Note (e.g. Prezzee code sent 3 Oct)" style={{ flex: '1 1 200px' }} />
              {(f.reward_status === 'to_send' || f.reward_status === 'manual') ? <button className="btn secondary small" name="status" value="sent">Mark done</button> : <button className="linkish" name="status" value={f.reward_status}>Save note</button>}
            </form>
          )}
        </article>
      ))}
    </main>
  );
}
