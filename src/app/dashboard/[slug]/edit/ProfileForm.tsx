'use client';

import { useActionState } from 'react';
import { saveProfile } from './actions';

type Props = {
  slug: string; name: string; values: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  services: string[]; platforms: string[];
};
const L = { display: 'grid', gap: 6, fontWeight: 600, fontSize: 14 } as const;
const grid = (min: number) => ({ display: 'grid', gap: 12, gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))` });
const yn = (v: boolean | null | undefined) => (v === true ? 'yes' : v === false ? 'no' : '');

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="panel" style={{ display: 'grid', gap: 14, margin: 0 }}>
      <legend style={{ fontFamily: 'var(--display)', fontWeight: 600, fontSize: 20, padding: '0 6px', marginLeft: -6 }}>{title}</legend>
      {hint && <p className="hint" style={{ margin: '-6px 0 0' }}>{hint}</p>}
      {children}
    </fieldset>
  );
}

export default function ProfileForm({ slug, name, values: v, services, platforms }: Props) {
  const [state, action, pending] = useActionState(saveProfile, {});
  const g = v.gated || {};
  return (
    <form action={action} style={{ display: 'grid', gap: 18 }}>
      <input type="hidden" name="slug" value={slug} />

      <Section title="About your business">
        <label style={L}>One-line description<input className="field" name="tagline" defaultValue={v.tagline || ''} maxLength={120} placeholder="e.g. Boutique full-service management across the Eastern Suburbs" /></label>
        <label style={L}>About {name}<textarea className="field" name="about" rows={5} maxLength={1500} defaultValue={v.about || ''} /></label>
        <div style={grid(220)}>
          <label style={L}>Website<input className="field" name="website" defaultValue={v.website || ''} placeholder="https://" /></label>
          <label style={L}>Phone (shared only with owners who accept your quote)<input className="field" name="contact_phone" defaultValue={v.contact_phone || ''} type="tel" /></label>
        </div>
        <label style={L}>Licensed real estate agency?
          <select className="field" name="licensed_agent" defaultValue={yn(v.licensed_agent)}><option value="">Prefer not to say</option><option value="yes">Yes</option><option value="no">No</option></select>
        </label>
      </Section>

      <Section title="Fees and terms" hint="Published fees help owners shortlist you. The fee band shows on your public profile; the rest shows to signed-in owners.">
        <div style={grid(150)}>
          <label style={L}>Management fee from (%)<input className="field" name="fee_min" inputMode="decimal" defaultValue={v.fee_min ?? ''} /></label>
          <label style={L}>Management fee up to (%)<input className="field" name="fee_max" inputMode="decimal" defaultValue={v.fee_max ?? ''} /></label>
          <label style={L}>Plus GST?<select className="field" name="fee_gst" defaultValue={String(v.fee_note || '').includes('GST') ? 'yes' : 'no'}><option value="no">No / included</option><option value="yes">Yes, plus GST</option></select></label>
        </div>
        <div style={grid(150)}>
          <label style={L}>Setup fee (A$)<input className="field" name="setup_fee" inputMode="numeric" defaultValue={g.setupFee ?? ''} placeholder="0 for none" /></label>
          <label style={L}>Minimum term (months)<input className="field" name="min_term" inputMode="numeric" defaultValue={g.minTermMonths ?? ''} placeholder="0 for no lock-in" /></label>
          <label style={L}>Notice to leave (days)<input className="field" name="notice_days" inputMode="numeric" defaultValue={g.noticeDays ?? ''} /></label>
        </div>
        <div style={grid(200)}>
          <label style={L}>Cleaning fees
            <select className="field" name="cleaning" defaultValue={yn(g.cleaningPassedOn)}><option value="">Not set</option><option value="yes">Charged to guests</option><option value="no">Charged to the owner</option></select>
          </label>
          <label style={L}>Linen
            <select className="field" name="linen" defaultValue={yn(g.linenIncluded)}><option value="">Not set</option><option value="yes">Included</option><option value="no">Extra cost</option></select>
          </label>
          <label style={L}>Owners using the home themselves<input className="field" name="owner_stays" defaultValue={g.ownerStaysAllowed || ''} placeholder="e.g. Unlimited, with 14 days notice" /></label>
        </div>
        <label style={L}>What&apos;s included (one per line)<textarea className="field" name="inclusions" rows={3} defaultValue={(g.inclusions || []).join('\n')} placeholder={'Professional photos\nMonthly owner statement'} /></label>
      </Section>

      <Section title="Services and platforms">
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))' }}>
          {services.map((s) => <label key={s} style={{ display: 'flex', gap: 8 }}><input type="checkbox" name="services" value={s} defaultChecked={(v.services || []).includes(s)} style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} /> {s}</label>)}
        </div>
        <div className="label" style={{ marginTop: 6 }}>Where you list homes</div>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {platforms.map((p) => <label key={p} style={{ display: 'flex', gap: 8 }}><input type="checkbox" name="platforms" value={p} defaultChecked={(v.platforms || []).includes(p)} style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} /> {p}</label>)}
        </div>
      </Section>

      <Section title="Where you take on new homes" hint="We already show you to owners near homes you run. Add any other postcodes where you'd take on a property.">
        <label style={L}>Extra service postcodes<textarea className="field" name="postcodes" rows={2} defaultValue={(v.postcodes || []).join(', ')} placeholder="2026, 2024, 2034" /></label>
      </Section>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', position: 'sticky', bottom: 0, background: 'var(--surface)', padding: '12px 0' }}>
        <button className="btn primary" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</button>
        {state?.error && <span role="alert" style={{ color: 'var(--signal)' }}>{state.error}</span>}
        {state?.ok && <span role="status" style={{ color: 'var(--brand)', fontWeight: 600 }}>Saved. Your public profile is updated.</span>}
      </div>
    </form>
  );
}
