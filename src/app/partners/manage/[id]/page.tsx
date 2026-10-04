import type { Metadata } from 'next';
import { agreedCurrent, CATEGORIES, manageOk, PARTNER_TERMS_VERSION, type Partner } from '@/lib/partners';
import OfferCard from '@/components/OfferCard';
import { getSetting } from '@/lib/partners';
import { adminClient } from '@/lib/supabase/server';
import PartnerForm, { AgreeForm } from '../../PartnerForm';

export const metadata: Metadata = { title: 'Your partner offer', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const STATUS: Record<Partner['status'], string> = {
  pending: 'We’re reviewing your offer. We’ll email you once it’s approved.',
  approved: 'Approved. Your offer shows to owners whenever partner offers are live on CoHostCompare.',
  hidden: 'Your offer is paused and not showing to owners. Email hello@cohostcompare.com if you’d like it back.',
  rejected: 'We aren’t able to list this offer at the moment. Email hello@cohostcompare.com if you’d like to talk about it.',
};

export default async function Manage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string; agreed?: string }> }) {
  const { id } = await params;
  const { s = '', agreed } = await searchParams;
  const ok = /^[0-9a-f-]{36}$/i.test(id) && manageOk(id, s);
  const db = ok ? adminClient() : null;
  const { data: p } = db ? await db.from('partners').select('*').eq('id', id).maybeSingle() : { data: null };
  if (!p) return <main style={{ maxWidth: 560, paddingBlock: '48px 80px' }}><h1 style={{ fontSize: 30 }}>Link not valid</h1><p>This partner link isn&apos;t valid. Email hello@cohostcompare.com and we&apos;ll send you a new one.</p></main>;
  if (!db) return null;
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const [{ count: d30 }, { count: all }] = await Promise.all([
    db.from('partner_clicks').select('id', { count: 'exact', head: true }).eq('partner_id', id).gte('created_at', since),
    db.from('partner_clicks').select('id', { count: 'exact', head: true }).eq('partner_id', id),
  ]);
  const partner = p as Partner;
  const live = await getSetting<boolean>('offers_live', false).catch(() => false);
  return (
    <main style={{ maxWidth: 760, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <span className="label" style={{ color: 'var(--brand)' }}>Partner page</span>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: 0 }}>{partner.name}</h1>
      {agreed === '1' && partner.agreed_at && <p role="status" className="panel" style={{ margin: 0, background: 'var(--tint)', fontWeight: 600 }}>Accepted. Welcome aboard.</p>}
      {partner.pending_review && partner.pending_offer && (
        <section className="panel" style={{ display: 'grid', gap: 6, borderColor: 'var(--brand)' }}>
          <b>Your offer changes are waiting for our check.</b>
          <span className="hint">Owners still see your current offer. Once we&apos;ve approved the new wording it replaces it. What you sent: <b>{partner.pending_offer.offer_title}</b> · {partner.pending_offer.offer_body}{partner.pending_offer.promo_code ? ` · code ${partner.pending_offer.promo_code}` : ''}{partner.pending_offer.offer_url ? ` · ${partner.pending_offer.offer_url}` : ''}</span>
        </section>
      )}
      {partner.status === 'approved' && !agreedCurrent(partner) ? (
        <section className="panel" style={{ display: 'grid', gap: 12, borderColor: 'var(--brand)', borderWidth: 2 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>{partner.agreed_at ? 'Our partner agreement has changed' : 'You’re approved. One last step.'}</h2>
          <p style={{ margin: 0 }}>{partner.agreed_at ? `We’ve updated the partner agreement (version ${PARTNER_TERMS_VERSION}). Please review and accept it to keep your offer showing.` : 'Please review and accept the partner agreement. Your offer goes live to owners once you do.'}</p>
          <div style={{ background: 'var(--tint)', borderRadius: 10, padding: '10px 14px' }}><b>Commercial terms:</b> {partner.fee_terms || 'Free listing. No fees.'}</div>
          <AgreeForm id={id} s={s} name={partner.contact_name} />
        </section>
      ) : (
        <p className="panel" style={{ margin: 0, background: partner.status === 'approved' ? 'var(--tint)' : undefined }}><b>Status:</b> {STATUS[partner.status]}{partner.status === 'approved' && !live ? ' Partner offers haven’t launched to owners yet. We’ll email you when they do.' : ''}</p>
      )}
      {partner.agreed_at && <p className="hint" style={{ margin: 0 }}>Partner agreement version {partner.agreed_version} accepted by {partner.agreed_name} on {new Date(partner.agreed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}. Commercial terms: {partner.fee_terms || 'free listing, no fees'}. <a href="/partners/agreement">Read the agreement</a>.</p>}
      <section style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
        <span className="label">How owners see your offer</span>
        <OfferCard o={partner} preview />
      </section>
      <section className="dash-stats" aria-label="Clicks">
        <div className="panel"><b>{d30 ?? 0}</b><span>owners clicked your offer in the last 30 days</span></div>
        <div className="panel"><b>{all ?? 0}</b><span>clicks in total</span></div>
      </section>
      <PartnerForm categories={CATEGORIES} p={partner.pending_review && partner.pending_offer ? { ...partner, ...partner.pending_offer } : partner} manage={{ id, s }} approved={partner.status === 'approved'} />
      <p className="hint" style={{ margin: 0 }}>Keep this page&apos;s link private: anyone with it can edit your offer. To change your business name or email, contact hello@cohostcompare.com.</p>
    </main>
  );
}
