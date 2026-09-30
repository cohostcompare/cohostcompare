import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';
import { setVisibility } from './actions';

export const metadata: Metadata = { title: 'Managers · Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ q?: string; show?: string; error?: string; done?: string }>;

export default async function AdminManagers({ searchParams }: { searchParams: SP }) {
  await requireAdmin('/admin/managers');
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const db = adminClient();
  let query = db.from('managers').select('id, slug, name, website, claimed, published').order('name').limit(300);
  if (q) query = query.ilike('name', `%${q}%`);
  if (sp.show === 'hidden') query = query.eq('published', false);
  const { data: rows } = await query;
  const ids = (rows || []).filter((r) => !r.published).map((r) => r.id);
  const { data: edits } = ids.length ? await db.from('manager_edits').select('manager_id, changes, created_at').in('manager_id', ids).order('created_at', { ascending: false }) : { data: [] };
  const why = new Map<string, { reason?: string; at: string }>();
  for (const e of edits || []) {
    const c = e.changes as { published?: boolean; reason?: string };
    if (c?.published === false && !why.has(e.manager_id)) why.set(e.manager_id, { reason: c.reason, at: e.created_at });
  }

  return (
    <main style={{ maxWidth: 960, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <div>
        <h1 style={{ fontSize: 34, margin: 0 }}>Managers</h1>
        <p className="hint" style={{ margin: '4px 0 0' }}>Hide a manager to remove them from search results, their public profile and new quote requests (for example, if they ask to be removed). Their data is kept, and you can show them again at any time.</p>
      </div>
      {sp.error && <div role="alert" className="panel" style={{ borderColor: 'var(--signal)' }}>{sp.error}</div>}
      {sp.done && <div role="status" className="panel" style={{ background: 'var(--tint)' }}>Done: manager {sp.done}.</div>}
      <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="field" name="q" defaultValue={q} placeholder="Search by name" style={{ maxWidth: 320 }} />
        <select className="field" name="show" defaultValue={sp.show || ''} style={{ maxWidth: 200 }}><option value="">All managers</option><option value="hidden">Hidden only</option></select>
        <button className="btn secondary" type="submit">Filter</button>
      </form>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {!(rows || []).length && <p style={{ margin: 0, padding: 16 }} className="hint">No managers match.</p>}
        {(rows || []).map((m) => (
          <div key={m.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '6px 12px', padding: '12px 16px', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <b>{m.published ? <Link href={`/managers/${m.slug}`}>{m.name}</Link> : m.name}</b>
              <span className="hint"> · {m.published ? 'Visible' : 'Hidden'}{m.claimed ? ' · Claimed' : ''}{m.website ? ` · ${m.website.replace(/^https?:\/\//, '')}` : ''}</span>
              {!m.published && why.get(m.id) && <div className="hint">Hidden {new Date(why.get(m.id)!.at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}{why.get(m.id)!.reason ? `: ${why.get(m.id)!.reason}` : ''}</div>}
            </div>
            <form action={setVisibility} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'end' }}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="q" value={q} />
              {m.published ? (
                <>
                  <input className="field" name="reason" placeholder="Reason, e.g. asked to be removed" style={{ minHeight: 38, width: 240 }} />
                  <button className="btn secondary small" type="submit">Hide</button>
                </>
              ) : (
                <><input type="hidden" name="show" value="1" /><button className="btn secondary small" type="submit">Show again</button></>
              )}
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
