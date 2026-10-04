import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';
import { isPro, planName, planOf, plansFor } from '@/lib/pro';
import { setPlan, setVerified, setVisibility } from './actions';

export const metadata: Metadata = { title: 'Managers · Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ q?: string; show?: string; plan?: string; error?: string; done?: string }>;

export default async function AdminManagers({ searchParams }: { searchParams: SP }) {
  await requireAdmin('/admin/managers');
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const db = adminClient();
  let query = db.from('managers').select('id, slug, name, website, claimed, published, stripe_subscription_id').order('name').limit(300);
  if (q) query = query.ilike('name', `%${q}%`);
  if (sp.show === 'hidden') query = query.eq('published', false);
  const planFilter = ['pro', 'paying', 'freepro', 'free'].includes(sp.plan || '') ? sp.plan! : '';
  if (planFilter) query = query.eq('claimed', true).limit(2000);
  const { data: all } = await query;
  // Plan filter (from the admin dashboard's Pro tile): any Pro, paying through Stripe, free Pro (founding, feedback, admin), or Free.
  let rows = all;
  if (planFilter) {
    const pl = await plansFor((all || []).map((r) => r.id));
    const { data: subs } = await db.from('managers').select('id, stripe_subscription_id').in('id', (all || []).map((r) => r.id));
    const paying = new Set((subs || []).filter((x) => x.stripe_subscription_id).map((x) => x.id));
    rows = (all || []).filter((r) => {
      const pro = isPro(pl.get(r.id));
      return planFilter === 'pro' ? pro : planFilter === 'paying' ? paying.has(r.id) : planFilter === 'freepro' ? pro && !paying.has(r.id) : !pro;
    });
  }
  const { data: abns } = await db.from('managers').select('id, abn, abn_name, abn_verified_at').in('id', (rows || []).map((r) => r.id)); // needs 009
  const abnOf = new Map((abns || []).map((a) => [a.id, a]));
  const plans = await plansFor((rows || []).filter((r) => r.claimed).map((r) => r.id));
  // Who can sign in for each claimed manager (up to 3 shown), so you can see who you're dealing with.
  const claimedIds = (rows || []).filter((r) => r.claimed).map((r) => r.id);
  const { data: members } = claimedIds.length ? await db.from('manager_members').select('manager_id, user_id').in('manager_id', claimedIds).limit(2000) : { data: [] };
  const perManager = new Map<string, string[]>();
  for (const x of members || []) { const l = perManager.get(x.manager_id) || []; if (l.length < 3) l.push(x.user_id); perManager.set(x.manager_id, l); }
  const userIds = [...new Set([...perManager.values()].flat())];
  const emailOf = new Map<string, string>();
  await Promise.all(userIds.map(async (uid) => { const e = (await db.auth.admin.getUserById(uid).catch(() => ({ data: { user: null } }))).data.user?.email; if (e) emailOf.set(uid, e); }));
  const memberList = (id: string) => (perManager.get(id) || []).map((u) => emailOf.get(u)).filter((e): e is string => Boolean(e));
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
        <p style={{ margin: '4px 0 0' }}><Link href="/admin/managers/audit">Run the manager audit →</Link> <span className="hint">checks each manager&apos;s website to flag hotels or booking sites.</span></p>
        <p className="hint" style={{ margin: '4px 0 0' }}>Hide a manager to remove them from search results, their public profile and new quote requests (for example, if they ask to be removed). Their data is kept, and you can show them again at any time.</p>
      </div>
      {sp.error && <div role="alert" className="panel" style={{ borderColor: 'var(--signal)' }}>{sp.error}</div>}
      {sp.done && <div role="status" className="panel" style={{ background: 'var(--tint)' }}>Done: manager {sp.done}.</div>}
      <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="field" name="q" defaultValue={q} placeholder="Search by name" style={{ maxWidth: 320 }} />
        <select className="field" name="show" defaultValue={sp.show || ''} style={{ maxWidth: 200 }}><option value="">All managers</option><option value="hidden">Hidden only</option></select>
        <select className="field" name="plan" defaultValue={planFilter} style={{ maxWidth: 220 }}><option value="">Any plan</option><option value="pro">Pro (paying or free)</option><option value="paying">Paying Pro</option><option value="freepro">Free Pro (founding etc.)</option><option value="free">Free plan (claimed)</option></select>
        <button className="btn secondary" type="submit">Filter</button>
      </form>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {planFilter && <p className="hint" style={{ margin: 0, padding: '12px 16px' }}>{(rows || []).length} manager{(rows || []).length === 1 ? '' : 's'} on this plan.</p>}
        {!(rows || []).length && <p style={{ margin: 0, padding: 16 }} className="hint">No managers match.</p>}
        {(rows || []).map((m) => (
          <div key={m.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '6px 12px', padding: '12px 16px', borderTop: '1px solid var(--line)', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <b>{m.published ? <Link href={`/managers/${m.slug}`}>{m.name}</Link> : m.name}</b>
              <span className="hint"> · {m.published ? 'Visible' : 'Hidden'}{m.claimed ? ' · Claimed' : ''}{m.website ? ` · ${m.website.replace(/^https?:\/\//, '')}` : ''} · <Link href={`/admin/managers/${m.id}/requirements`}>Requirements</Link> · <a href={`/managers/${m.slug}`} target="_blank" rel="noopener">Public profile ↗</a></span>
              {m.claimed && <div className="hint">Logins: {memberList(m.id).length ? memberList(m.id).map((e, i) => <span key={e}>{i ? ', ' : ''}<a href={`mailto:${e}`}>{e}</a></span>) : 'none found'}{(perManager.get(m.id) || []).length >= 3 ? ' (first 3)' : ''}</div>}
              {abnOf.get(m.id)?.abn && (
                <div className="hint">ABN {abnOf.get(m.id)!.abn}{abnOf.get(m.id)!.abn_name ? ` · registered to ${abnOf.get(m.id)!.abn_name}` : ''} · {abnOf.get(m.id)!.abn_verified_at ? 'verified' : 'not verified'}{' '}
                  <form action={setVerified} style={{ display: 'inline' }}>
                    <input type="hidden" name="id" value={m.id} /><input type="hidden" name="q" value={q} /><input type="hidden" name="on" value={abnOf.get(m.id)!.abn_verified_at ? '0' : '1'} />
                    <button type="submit" className="linkish" style={{ padding: 0 }}>{abnOf.get(m.id)!.abn_verified_at ? 'Remove badge' : 'Mark verified'}</button>
                  </form>
                </div>
              )}
              {m.claimed && (
                <form action={setPlan} className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                  <span>Plan: <b>{planName(planOf(plans.get(m.id)))}</b>{plans.get(m.id)?.pro_until ? ` until ${new Date(plans.get(m.id)!.pro_until!).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}{m.stripe_subscription_id ? <> · <span className="chip" title="Set to Free in Stripe, not here">paying via Stripe</span></> : ''}</span>
                  <input type="hidden" name="id" value={m.id} /><input type="hidden" name="q" value={q} />
                  <select name="plan" defaultValue={planOf(plans.get(m.id))} style={{ minHeight: 30 }}><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select>
                  <select name="months" defaultValue="0" style={{ minHeight: 30 }}><option value="0">no end date</option><option value="1">1 month</option><option value="3">3 months</option><option value="12">12 months</option></select>
                  <button type="submit" className="linkish" style={{ padding: 0 }}>Set plan</button>
                </form>
              )}
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
