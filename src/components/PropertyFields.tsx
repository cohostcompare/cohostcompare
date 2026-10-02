'use client';
import { AVAILABILITY, FULL, PROPERTY_TYPES, type PropertyDetails } from '@/lib/requirements';

/** The four property questions (type, bedrooms, availability, help wanted). */
export default function PropertyFields({ prop, update }: { prop: PropertyDetails; update: (k: keyof PropertyDetails, v: unknown) => void }) {
  return (
    <div className="prop-fields">
      <label>Type<select className="field" data-empty={prop.type ? undefined : '1'} value={prop.type || ''} onChange={(e) => update('type', e.target.value)}><option value="" disabled>Choose</option>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label>Bedrooms<select className="field" data-empty={prop.beds != null ? undefined : '1'} value={prop.beds ?? ''} onChange={(e) => update('beds', Number(e.target.value))}><option value="" disabled>Choose</option>{[0, 1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n === 0 ? 'Studio' : n === 6 ? '6+' : n}</option>)}</select></label>
      <label>Available for guests<select className="field" data-empty={prop.availability ? undefined : '1'} value={prop.availability || ''} onChange={(e) => update('availability', e.target.value)}><option value="" disabled>Choose</option>{AVAILABILITY.map((a) => <option key={a.v} value={a.v}>{a.label.replace(' (for example, holidays only)', '')}</option>)}</select></label>
      <label>Help wanted<select className="field" data-empty={prop.services?.length ? undefined : '1'} value={prop.services?.length ? (prop.services.includes(FULL) ? 'full' : 'some') : ''} onChange={(e) => update('services', e.target.value === 'full' ? [FULL] : ['Some services'])}><option value="" disabled>Choose</option><option value="full">Full management</option><option value="some">Only some services</option></select></label>
    </div>
  );
}
