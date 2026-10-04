'use client';
import { useActionState } from 'react';
import { acceptAgreement, applyPartner, resendPartnerLink, updatePartner } from './actions';

type P = Partial<{ name: string; contact_name: string | null; email: string; phone: string | null; website: string | null; category: string; areas: string | null; offer_title: string | null; offer_body: string | null; offer_url: string | null; promo_code: string | null; logo_url: string | null }>;
const L = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label style={{ display: 'grid', gap: 4, alignContent: 'start' }}><span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>{children}{hint && <span className="hint" style={{ fontSize: 13 }}>{hint}</span>}</label>
);

export default function PartnerForm({ categories, p, manage, approved }: { categories: readonly string[]; p?: P; manage?: { id: string; s: string }; approved?: boolean }) {
  const [state, act, pending] = useActionState(manage ? updatePartner : applyPartner, {});
  if (state.ok && !manage) return <p className="panel" style={{ margin: 0, background: 'var(--tint)' }}>{state.ok}</p>;
  return (
    <form action={act} className="panel" style={{ display: 'grid', gap: 14 }}>
      {manage && <><input type="hidden" name="id" value={manage.id} /><input type="hidden" name="s" value={manage.s} /></>}
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
      <h2 style={{ fontSize: 20, margin: 0 }}>Your business</h2>
      <div className="form-grid">
        {!manage && <L label="Business name"><input className="field" name="name" required maxLength={120} defaultValue={p?.name} /></L>}
        <L label="Your name"><input className="field" name="contact_name" maxLength={120} defaultValue={p?.contact_name || ''} /></L>
        {!manage && <L label="Email"><input className="field" type="email" name="email" required defaultValue={p?.email} /></L>}
        <L label="Phone (for us, not shown)"><input className="field" name="phone" maxLength={30} defaultValue={p?.phone || ''} /></L>
        <L label="Website"><input className="field" name="website" placeholder="www.example.com.au" defaultValue={p?.website || ''} /></L>
        <L label="Category"><select className="field" name="category" defaultValue={p?.category || categories[0]}>{categories.map((c) => <option key={c}>{c}</option>)}</select></L>
        <L label="Where you work" hint="States, cities or regions you cover"><input className="field" name="areas" maxLength={200} placeholder="e.g. Sydney and the Blue Mountains" defaultValue={p?.areas || ''} /></L>
      </div>
      <h2 style={{ fontSize: 20, margin: '6px 0 0' }}>Your offer for owners</h2>
      {manage && approved && <p className="hint" style={{ margin: 0 }}>Your offer is live, so changes to the title, details, link or promo code are checked by us before owners see them (usually within a few business days). Your other details update straight away.</p>}
      <L label="Offer title" hint="Up to 80 characters, e.g. 15% off your first professional listing shoot"><input className="field" name="offer_title" required maxLength={80} defaultValue={p?.offer_title || ''} /></L>
      <L label="Offer details" hint="What's included, who it suits and any conditions. Up to 600 characters."><textarea className="field" name="offer_body" required rows={4} maxLength={600} defaultValue={p?.offer_body || ''} /></L>
      <div className="form-grid">
        <L label="Link for owners" hint="Where owners go to take up the offer, starting with https://"><input className="field" name="offer_url" type="url" required={!manage} placeholder="https://www.example.com.au/offer" defaultValue={p?.offer_url || ''} /></L>
        <L label="Promo code (optional)"><input className="field" name="promo_code" maxLength={40} defaultValue={p?.promo_code || ''} /></L>
        <L label="Logo link (optional)" hint="A link to a square PNG or SVG of your logo"><input className="field" name="logo_url" defaultValue={p?.logo_url || ''} /></L>
      </div>
      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      {state.ok && manage && <p role="status" style={{ margin: 0, color: 'var(--brand)', fontWeight: 600 }}>{state.ok}</p>}
      {!manage && <p className="hint" style={{ margin: 0 }}>Once we&apos;ve approved your application, we&apos;ll ask you to accept our <a href="/partners/agreement" target="_blank">partner agreement</a> before your offer goes live.</p>}
      <button className="btn primary" type="submit" disabled={pending} style={{ justifySelf: 'start' }}>{pending ? 'Saving…' : manage ? 'Save changes' : 'Apply to be a partner'}</button>
    </form>
  );
}

/** "Already a partner?": emails the private partner page link. Always gives the same answer, so it can't be used to check who's a partner. */
export function LinkForm() {
  const [state, act, pending] = useActionState(resendPartnerLink, {});
  if (state.ok) return <p style={{ margin: 0, color: 'var(--brand)', fontWeight: 600 }}>{state.ok}</p>;
  return (
    <form action={act} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input className="field" type="email" name="email" required placeholder="you@business.com.au" style={{ flex: '1 1 240px' }} aria-label="Email" />
      <button className="btn secondary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Email me my link'}</button>
      {state.error && <p role="alert" style={{ margin: 0, flexBasis: '100%', color: 'var(--signal)' }}>{state.error}</p>}
    </form>
  );
}

/** Accepting the partner agreement in the partner page. */
export function AgreeForm({ id, s, name }: { id: string; s: string; name?: string | null }) {
  const [state, act, pending] = useActionState(acceptAgreement, {});
  if (state.ok) return <p style={{ margin: 0, fontWeight: 600, color: 'var(--brand)' }}>{state.ok} Refresh this page to see your offer&apos;s status.</p>;
  return (
    <form action={act} style={{ display: 'grid', gap: 12 }}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="s" value={s} />
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><input type="checkbox" name="agree" style={{ marginTop: 4 }} /> <span>I&apos;ve read and accept the <a href="/partners/agreement" target="_blank">partner agreement</a> and the commercial terms above, and I&apos;m authorised to accept them for this business.</span></label>
      <label style={{ display: 'grid', gap: 4, maxWidth: 360 }}><span style={{ fontWeight: 600, fontSize: 14 }}>Your full name</span><input className="field" name="agreed_name" defaultValue={name || ''} required maxLength={120} /></label>
      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      <button className="btn primary" type="submit" disabled={pending} style={{ justifySelf: 'start' }}>{pending ? 'Saving…' : 'Accept and continue'}</button>
    </form>
  );
}
