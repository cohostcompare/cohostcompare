import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';
import OfferCard from '@/components/OfferCard';
import { CATEGORIES, getSetting, manageUrl, offerLink, OFFER_KEYS, type Partner } from '@/lib/partners';
import { adminClient } from '@/lib/supabase/server';
import { deletePartner, editPartner, emailPartnerLink, reviewOfferEdit, setOffersLive, setPartner } from './actions';

export const metadata: Metadata = { title: 'Partners', robots: { index: false } };
export const dynamic = 'force-dynamic';

const ORDER = ['pending', 'approved', 'hidden', 'rejected'] as const;
const OFFER_LABEL: Record<(typeof OFFER_KEYS)[number], string> = { offer_title: 'Title', offer_body: 'Details', offer_url: 'Link', promo_code: 'Promo code' };

export default async function AdminPartners() {
  await requireAdmin('/admin/partners');
  const db = adminClient();
  const [{ data, error }, live, { data: clicks }] = await Promise.all([
    db.from('partners').select('*').order('created_at', { ascending: false }).limit(300),
    getSetting<boolean>('offers_live', false).catch(() => false),
    db.from('partner_clicks').select('partner_id').gte('created_at', new Date(Date.now() - 30 * 86400e3).toISOString()).limit(20000),
  ]);
  const partners = (data || []) as Partner[];
  const approved = partners.filter((p) => p.status === 'approved' && p.agreed_at).length;
  const edits = partners.filter((p) => p.pending_review && p.pending_offer).length;
  const waiting = partners.filter((p) => p.status === 'approved' && !p.agreed_at).length;
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
        <span>{visible ? `${approved} partner${approved === 1 ? '' : 's'} showing.` : live ? 'Switched on, but nothing shows until a partner is approved and has accepted the agreement.' : `Switched off. ${approved} partner${approved === 1 ? '' : 's'} ready to show.`}{waiting ? ` ${waiting} approved partner${waiting === 1 ? ' hasn’t' : 's haven’t'} accepted the agreement yet.` : ''}</span>
        <span className="hint">Flow: a business applies → you approve it here (it gets an email) → it accepts the <a href="/partners/agreement">partner agreement</a> in its partner page → its offer shows to owners while offers are switched on.</span>
        <form action={setOffersLive}><input type="hidden" name="live" value={live ? '0' : '1'} /><button className={`btn ${live ? 'secondary' : 'primary'} small`} type="submit">{live ? 'Hide offers from owners' : 'Show offers to owners'}</button></form>
        {edits > 0 && <span style={{ color: '#7A4A06' }}><b>{edits} offer edit{edits === 1 ? '' : 's'} to review</b> below: approved partners&apos; wording changes wait for you before owners see them.</span>}
        <span className="hint">Invite businesses to apply at <a href="/partners">www.cohostcompare.com/partners</a> (also linked in the site footer). You can fill it in yourself for a partner you&apos;ve signed up. Turning offers on emails every approved partner to say they&apos;re live.</span>
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
                  {p.status === 'approved' && (p.agreed_at
                    ? <span className="chip" style={{ background: 'var(--tint)', color: 'var(--brand)' }}>✓ Agreement accepted {new Date(p.agreed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}{p.agreed_name ? ` by ${p.agreed_name}` : ''}</span>
                    : <span className="chip" style={{ background: '#FFF1DD', color: '#7A4A06' }}>Waiting for them to accept the agreement</span>)}
                  {p.status === 'approved' && !offerLink(p) && <span className="chip" style={{ background: '#FBE3DE', color: '#8E2A17' }} title="Owners have nowhere to go: add an offer link or website in Edit details.">Won&apos;t show: no link</span>}
                  {p.pending_review && p.pending_offer && <span className="chip" style={{ background: '#FFF1DD', color: '#7A4A06' }}>Changes to review</span>}
                  <span className="hint">{p.contact_name ? `${p.contact_name} · ` : ''}<a href={`mailto:${p.email}`}>{p.email}</a>{p.phone ? ` · ${p.phone}` : ''}{p.website ? <> · <a href={p.website} target="_blank" rel="noopener">website</a></> : null}</span>
                  <span className="hint" style={{ marginLeft: 'auto' }}>{c30.get(p.id) || 0} clicks in 30 days</span>
                </div>
                <div><b>{p.offer_title}</b><p style={{ margin: '4px 0 0' }}>{p.offer_body}</p>
                  <p className="hint" style={{ margin: '4px 0 0' }}>{p.offer_url || 'No offer link (uses website)'}{p.promo_code ? ` · code ${p.promo_code}` : ''}{p.areas ? ` · ${p.areas}` : ''}</p></div>
                {p.pending_review && p.pending_offer && (
                  <div style={{ background: '#FFF8EC', border: '1px solid #F3D3A4', borderRadius: 10, padding: '10px 12px', display: 'grid', gap: 8 }}>
                    <b>Changes to review</b>
                    <span className="hint">Owners still see the current offer. Approve to replace it with the new wording, or reject to discard it (they&apos;re emailed either way).</span>
                    <div style={{ display: 'grid', gap: 4 }}>
                      {OFFER_KEYS.filter((k) => (p.pending_offer![k] || null) !== (p[k] || null)).map((k) => (
                        <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, auto) minmax(0, 1fr)', gap: '2px 10px', fontSize: 14 }}>
                          <span className="label">{OFFER_LABEL[k]}</span>
                          <span><s style={{ color: 'var(--muted)', overflowWrap: 'anywhere' }}>{p[k] || '(empty)'}</s><br /><b style={{ overflowWrap: 'anywhere' }}>{p.pending_offer![k] || '(empty)'}</b></span>
                        </div>
                      ))}
                    </div>
                    <form action={reviewOfferEdit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn primary small" name="decision" value="approve" type="submit">Approve changes</button>
                      <input className="field" name="reason" placeholder="Reason if rejecting (sent to them, optional)" style={{ flex: '1 1 220px', minHeight: 36 }} />
                      <button className="btn secondary small" name="decision" value="reject" type="submit">Reject</button>
                    </form>
                  </div>
                )}
                <form action={setPartner} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input type="hidden" name="id" value={p.id} />
                  <select name="status" defaultValue={p.status} className="field" style={{ width: 'auto' }}>{ORDER.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }} title="Follows the commercial terms: any terms means we earn a referral fee."><input type="checkbox" checked={Boolean(p.fee_terms)} readOnly disabled /> We earn a referral fee{p.fee_terms ? '' : ' (no terms set)'}</label>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>Order <input name="sort" type="number" defaultValue={p.sort} style={{ width: 70 }} /></label>
                  <input name="fee_terms" defaultValue={p.fee_terms || ''} placeholder="Commercial terms shown to them, e.g. A$20 per redeemed code (blank = free)" className="field" style={{ flex: '1 1 260px' }} />
                  <input name="admin_note" defaultValue={p.admin_note || ''} placeholder="Private note" className="field" style={{ flex: '1 1 160px' }} />
                  <input name="reason" placeholder="Reason, emailed to them if you reject or hide (optional)" className="field" style={{ flex: '1 1 220px' }} />
                  <button className="btn secondary small" type="submit">Save</button>
                </form>
                {p.agreed_at && <span className="hint">Accepted terms: {p.agreed_fee_terms || 'free listing, no fees'}. Saving different commercial terms clears their acceptance: the offer comes off until they accept the new terms, and they&apos;re emailed to do so.</span>}
                <details><summary className="hint">Preview as owners see it</summary><div style={{ maxWidth: 380, marginTop: 8 }}><OfferCard o={p} preview /></div></details>
                <details><summary className="hint">Edit details</summary>
                  <form action={editPartner} className="form-grid" style={{ marginTop: 10 }}>
                    <input type="hidden" name="id" value={p.id} />
                    {([['name', 'Business name', p.name], ['email', 'Email', p.email], ['contact_name', 'Contact name', p.contact_name], ['phone', 'Phone', p.phone], ['website', 'Website', p.website], ['areas', 'Areas', p.areas], ['offer_title', 'Offer title', p.offer_title], ['offer_url', 'Offer link', p.offer_url], ['promo_code', 'Promo code', p.promo_code], ['logo_url', 'Logo link', p.logo_url]] as const).map(([k, l, v]) => (
                      <label key={k} style={{ display: 'grid', gap: 4, alignContent: 'start' }}><span className="hint">{l}</span><input className="field" name={k} defaultValue={v || ''} /></label>
                    ))}
                    <label style={{ display: 'grid', gap: 4, alignContent: 'start' }}><span className="hint">Category</span><select className="field" name="category" defaultValue={p.category}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                    <label style={{ display: 'grid', gap: 4, gridColumn: '1 / -1' }}><span className="hint">Offer details</span><textarea className="field" name="offer_body" rows={3} defaultValue={p.offer_body || ''} /></label>
                    <div><button className="btn secondary small" type="submit">Save details</button></div>
                  </form>
                </details>
                <details><summary className="hint">Partner page link</summary>
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    <code style={{ overflowWrap: 'anywhere', fontSize: 12 }}>{manageUrl(p.id)}</code>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                      <form action={emailPartnerLink}><input type="hidden" name="id" value={p.id} /><button className="linkish" type="submit">Email them this link</button></form>
                      <a className="linkish" href={manageUrl(p.id)} target="_blank" rel="noopener">Open their partner page</a>
                      <form action={deletePartner} style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}><input type="hidden" name="id" value={p.id} /><label className="hint" style={{ display: 'flex', gap: 4, alignItems: 'center' }}><input type="checkbox" name="confirm" value="yes" /> Sure?</label><button className="linkish" type="submit" style={{ color: 'var(--signal)' }}>Delete partner</button></form>
                    </div>
                  </div>
                </details>
              </article>
            ))}
          </section>
        );
      })}
      {!error && !partners.length && <p className="panel" style={{ margin: 0 }}>No partners yet.</p>}
    </main>
  );
}
