'use client';
import { useActionState } from 'react';
import { applyPartner, updatePartner } from './actions';

type P = Partial<{ name: string; contact_name: string | null; email: string; phone: string | null; website: string | null; category: string; areas: string | null; offer_title: string | null; offer_body: string | null; offer_url: string | null; promo_code: string | null; logo_url: string | null }>;
const L = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label style={{ display: 'grid', gap: 4 }}><span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>{children}{hint && <span className="hint" style={{ fontSize: 13 }}>{hint}</span>}</label>
);

export default function PartnerForm({ categories, p, manage }: { categories: readonly string[]; p?: P; manage?: { id: string; s: string } }) {
  const [state, act, pending] = useActionState(manage ? updatePartner : applyPartner, {});
  if (state.ok && !manage) return <p className="panel" style={{ margin: 0, background: 'var(--tint)' }}>{state.ok}</p>;
  return (
    <form action={act} className="panel" style={{ display: 'grid', gap: 14 }}>
      {manage && <><input type="hidden" name="id" value={manage.id} /><input type="hidden" name="s" value={manage.s} /></>}
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
      <h2 style={{ fontSize: 20, margin: 0 }}>Your business</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        {!manage && <L label="Business name"><input className="field" name="name" required maxLength={120} defaultValue={p?.name} /></L>}
        <L label="Your name"><input className="field" name="contact_name" maxLength={120} defaultValue={p?.contact_name || ''} /></L>
        {!manage && <L label="Email"><input className="field" type="email" name="email" required defaultValue={p?.email} /></L>}
        <L label="Phone (for us, not shown)"><input className="field" name="phone" maxLength={30} defaultValue={p?.phone || ''} /></L>
        <L label="Website"><input className="field" name="website" placeholder="www.example.com.au" defaultValue={p?.website || ''} /></L>
        <L label="Category"><select className="field" name="category" defaultValue={p?.category || categories[0]}>{categories.map((c) => <option key={c}>{c}</option>)}</select></L>
        <L label="Where you work" hint="States, cities or regions you cover"><input className="field" name="areas" maxLength={200} placeholder="e.g. Sydney and the Blue Mountains" defaultValue={p?.areas || ''} /></L>
      </div>
      <h2 style={{ fontSize: 20, margin: '6px 0 0' }}>Your offer for owners</h2>
      <L label="Offer title" hint="Up to 80 characters, e.g. 15% off your first professional listing shoot"><input className="field" name="offer_title" required maxLength={80} defaultValue={p?.offer_title || ''} /></L>
      <L label="Offer details" hint="What's included, who it suits and any conditions. Up to 600 characters."><textarea className="field" name="offer_body" required rows={4} maxLength={600} defaultValue={p?.offer_body || ''} /></L>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <L label="Link for owners" hint="Where owners go to take up the offer"><input className="field" name="offer_url" defaultValue={p?.offer_url || ''} /></L>
        <L label="Promo code (optional)"><input className="field" name="promo_code" maxLength={40} defaultValue={p?.promo_code || ''} /></L>
        <L label="Logo link (optional)" hint="A link to a square PNG or SVG of your logo"><input className="field" name="logo_url" defaultValue={p?.logo_url || ''} /></L>
      </div>
      {state.error && <p role="alert" style={{ margin: 0, color: 'var(--signal)' }}>{state.error}</p>}
      {state.ok && manage && <p role="status" style={{ margin: 0, color: 'var(--brand)', fontWeight: 600 }}>{state.ok}</p>}
      <button className="btn primary" type="submit" disabled={pending} style={{ justifySelf: 'start' }}>{pending ? 'Saving…' : manage ? 'Save changes' : 'Apply to be a partner'}</button>
    </form>
  );
}
