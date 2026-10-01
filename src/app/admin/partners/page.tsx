import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import { getSetting, manageUrl, type Partner } from '@/lib/partners';
import { adminClient } from '@/lib/supabase/server';
import { setOffersLive, setPartner } from './actions';

export const metadata: Metadata = { title: 'Partners', robots: { index: false } };
export const dynamic = 'force-dynamic';

const ORDER = ['pending', 'approved', 'hidden', 'rejected'] as const;

export default async function AdminPartners() {
  await requireAdmin('/admin/partners');
  const db = adminClient();
  const [{ data, error }, live, { data: clicks }] = await Promise.all([
    db.from('partners').select('*').order('created_at', { ascending: false }).limit(300),
    getSetting<boolean>('offers_live', false).catch(() => false),
    db.from('partner_clicks').select('partner_id').gte('created_at', new Date(Date.now() - 30 * 86400e3).toISOString()).limit(20000),
  ]);
  const partners = (data || []) as Partner[];
  const approved = partners.filter((p) => p.status === 'approved').length;
  const c30 = new Map<string, number>();
  for (const c of clicks || []) c30.set(c.partner_id, (c30.get(c.partner_id) || 0) + 1);
  const visible = live && approved > 0;
  return (
    <main style={{ maxWidth: 960, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <h1 style={{ fontSize: 34, margin: 0 }}>Partners</h1>
      {error && <p className="panel" style={{ margin: 0 }}>Partners start once database update 017 has been run in Supabase.</p>}
      <section className="panel" style={{ display: 'grid', gap: 10, background: visible ? 'var(--tint)' : undefined }}>
        <b>Owner offers are {visible ? 'showing on /setup' : 'hidden'}.</b>
        <span>{visible ? `${approved} approved partner${approved === 1 ? '' : 's'} showing.` : live ? 'Switched on, but nothing shows until you approve a partner.' : `Switched off. ${approved} approved partner${approved === 1 ? '' : 's'} waiting.`}</span>
        <form action={setOffersLive}><input type="hidden" name="live" value={live ? '0' : '1'} /><button className={`btn ${live ? 'secondary' : 'primary'} small`} type="submit">{live ? 'Hide offers from owners' : 'Show offers to owners'}</button></form>
        <span className="hint">Invite businesses with this link (not linked anywhere on the site): <a href="/partners">www.cohostcompare.com/partners</a>. You can also fill it in yourself for a partner you&apos;ve signed up.</span>
      </section>
      {ORDER.map((st) => {
        const list = partners.filter((p) => p.status === st);
        if (!list.length) return null;
        return (
          <section key={st} style={{ display: 'grid', gap: 10 }}>
            <h2 style={{ fontSize: 22, margin: 0, textTransform: 'capitalize' }}>{st} ({list.length})</h2>
            {list.map((p) => (
              <article key={p.id} className="panel" style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <b style={{ fontSize: 17 }}>{p.name}</b><span className="chip">{p.category}</span>
                  <span className="hint">{p.contact_name ? `${p.contact_name} · ` : ''}<a href={`mailto:${p.email}`}>{p.email}</a>{p.phone ? ` · ${p.phone}` : ''}{p.website ? <> · <a href={p.website} target="_blank" rel="noopener">website</a></> : null}</span>
                  <span className="hint" style={{ marginLeft: 'auto' }}>{c30.get(p.id) || 0} clicks in 30 days</span>
                </div>
                <div><b>{p.offer_title}</b><p style={{ margin: '4px 0 0' }}>{p.offer_body}</p>
                  <p className="hint" style={{ margin: '4px 0 0' }}>{p.offer_url || 'No offer link (uses website)'}{p.promo_code ? ` · code ${p.promo_code}` : ''}{p.areas ? ` · ${p.areas}` : ''}</p></div>
                <form action={setPartner} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="hidden" name="id" value={p.id} />
                  <select name="status" defaultValue={p.status} className="field" style={{ width: 'auto' }}>{ORDER.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="referral_fee" defaultChecked={p.referral_fee} /> We earn a referral fee</label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>Order <input name="sort" type="number" defaultValue={p.sort} style={{ width: 70 }} /></label>
                  <input name="admin_note" defaultValue={p.admin_note || ''} placeholder="Private note (deal terms…)" className="field" style={{ flex: '1 1 200px' }} />
                  <button className="btn secondary small" type="submit">Save</button>
                </form>
                <details><summary className="hint">Partner&apos;s private link</summary><code style={{ overflowWrap: 'anywhere', fontSize: 12 }}>{manageUrl(p.id)}</code></details>
              </article>
            ))}
          </section>
        );
      })}
      {!error && !partners.length && <p className="panel" style={{ margin: 0 }}>No partners yet.</p>}
    </main>
  );
}
