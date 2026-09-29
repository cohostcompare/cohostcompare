'use client';

import { useActionState } from 'react';
import { submitQuoteRequest } from './actions';

const SERVICES = ['Full management', 'Listing setup and photos', 'Pricing and guest messaging only', 'Cleaning and linen', 'Help registering the property'];
const L = { display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 } as const;

export default function QuoteForm({ managers, address, postcode, email }: { managers: string; address: string; postcode: string; email: string }) {
  const [state, action, pending] = useActionState(submitQuoteRequest, {});
  return (
    <form action={action} className="panel" style={{ display: 'grid', gap: 16 }}>
      <input type="hidden" name="managers" value={managers} />
      <p className="hint" style={{ margin: 0 }}>Signed in as {email}.</p>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <label style={L}>Your name<input className="field" name="name" autoComplete="name" required /></label>
        <label style={L}>Phone (optional)<input className="field" name="phone" type="tel" autoComplete="tel" /></label>
      </div>
      <label style={L}>Property address<input className="field" name="address" defaultValue={address} autoComplete="street-address" /></label>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        <label style={L}>Postcode<input className="field" name="postcode" defaultValue={postcode} inputMode="numeric" maxLength={4} required /></label>
        <label style={L}>Property type
          <select className="field" name="property_type"><option>Apartment</option><option>House</option><option>Townhouse</option><option>Granny flat or studio</option></select>
        </label>
        <label style={L}>Bedrooms
          <select className="field" name="bedrooms" defaultValue="2">{[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 0 ? 'Studio' : n === 6 ? '6+' : n}</option>)}</select>
        </label>
      </div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <label style={L}>Is it listed now?
          <select className="field" name="currently_listed"><option>Not yet listed</option><option>Listed, I manage it myself</option><option>Listed with another manager</option></select>
        </label>
        <label style={L}>When do you want to start?
          <select className="field" name="start_timing"><option>As soon as possible</option><option>Within 1–3 months</option><option>Just exploring</option></select>
        </label>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>What do you want help with?</legend>
        {SERVICES.map((s, i) => (
          <label key={s} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" name="services" value={s} defaultChecked={i === 0} style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} /> {s}
          </label>
        ))}
      </fieldset>
      <label style={L}>Anything else managers should know? (optional)
        <textarea className="field" name="notes" rows={3} maxLength={2000} placeholder="For example: I use the place myself over Christmas." />
      </label>
      <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send quote request'}</button>
      {state?.error && <p role="alert" style={{ color: 'var(--signal)', margin: 0 }}>{state.error}</p>}
      <p className="hint" style={{ margin: 0 }}>Managers see your property details and first name. Your email and phone are shared only with managers whose quote you accept.</p>
    </form>
  );
}
