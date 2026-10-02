/*
 Manager requirements: the properties a manager will take on (SQL 021, managers.requirements).
 Shared by the browser (search results, quote form) and the server (enforced when a request is sent).
 Owners describe their property once (search results "Your property" bar, saved in this browser, and the quote form);
 managers whose requirements don't match are shown separately and can't be sent a request.
 Requirements never change ranking among the managers that do match.
*/

export const PROPERTY_TYPES = ['Apartment', 'House', 'Townhouse', 'Granny flat or studio'] as const;
export const AVAILABILITY = [
  { v: '12', label: 'All year', months: 12 },
  { v: '9', label: '9 to 11 months a year', months: 9 },
  { v: '6', label: '6 to 8 months a year', months: 6 },
  { v: '3', label: '3 to 5 months a year', months: 3 },
  { v: '1', label: '1 to 2 months a year (for example, holidays only)', months: 1 },
] as const;
export const SITUATIONS = ['I own the property', 'I’m buying it now (under contract or about to settle)', 'I’m planning to buy a property'] as const;
export const FULL = 'Full management';

export type Requirements = {
  minMonths?: number | null;       // property must be available at least this many months a year
  types?: string[] | null;         // property types taken on (empty = all)
  minBeds?: number | null;
  maxBeds?: number | null;
  fullOnly?: boolean | null;       // only full management
  ownersOnly?: boolean | null;     // not people who are only planning to buy
  note?: string | null;            // anything else, shown on their profile (not enforced)
};
export type PropertyDetails = { availability?: string | null; type?: string | null; beds?: number | null; services?: string[] | null; situation?: string | null };

export const availabilityLabel = (v?: string | null) => AVAILABILITY.find((a) => a.v === v)?.label ?? null;
const monthsOf = (v?: string | null) => AVAILABILITY.find((a) => a.v === v)?.months ?? null;
const bedsText = (n: number) => (n === 0 ? 'studios' : `${n} bedroom${n === 1 ? '' : 's'}`);
const PLURAL: Record<string, string> = { Apartment: 'apartments', House: 'houses', Townhouse: 'townhouses', 'Granny flat or studio': 'granny flats and studios' };
const plural = (t: string) => PLURAL[t] || t.toLowerCase();
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** Cleans requirements from a form or the database. Returns null when nothing is set. */
export function cleanRequirements(r: Partial<Requirements> | null | undefined): Requirements | null {
  if (!r) return null;
  const out: Requirements = {};
  const mm = Number(r.minMonths); if ([3, 6, 9, 12].includes(mm)) out.minMonths = mm;
  const types = (r.types || []).filter((t) => (PROPERTY_TYPES as readonly string[]).includes(t));
  if (types.length && types.length < PROPERTY_TYPES.length) out.types = types;
  const lo = Number(r.minBeds), hi = Number(r.maxBeds);
  if (r.minBeds != null && String(r.minBeds) !== '' && lo > 0 && lo <= 6) out.minBeds = lo;
  if (r.maxBeds != null && String(r.maxBeds) !== '' && hi >= 0 && hi < 6) out.maxBeds = hi;
  if (out.minBeds != null && out.maxBeds != null && out.maxBeds < out.minBeds) delete out.maxBeds;
  if (r.fullOnly) out.fullOnly = true;
  if (r.ownersOnly) out.ownersOnly = true;
  const note = String(r.note || '').trim().slice(0, 300); if (note) out.note = note;
  return Object.keys(out).length ? out : null;
}

/** Plain-English list of what a manager takes on (for profiles and dashboards). */
export function describe(r: Requirements | null | undefined): string[] {
  if (!r) return [];
  const out: string[] = [];
  if (r.minMonths) out.push(r.minMonths === 12 ? 'Properties available all year' : `Properties available at least ${r.minMonths} months a year`);
  if (r.types?.length) out.push(`${list(r.types.map(plural))} only`.replace(/^./, (c) => c.toUpperCase()));
  if (r.minBeds != null && r.maxBeds != null) out.push(`${r.minBeds} to ${r.maxBeds} bedrooms`);
  else if (r.minBeds != null) out.push(`${bedsText(r.minBeds)} or more`.replace(/^./, (c) => c.toUpperCase()));
  else if (r.maxBeds != null) out.push(`Up to ${bedsText(r.maxBeds)}`);
  if (r.fullOnly) out.push('Full management only');
  if (r.ownersOnly) out.push('Owners and buyers under contract (not people still planning to buy)');
  return out;
}

/** Why a manager won't take on this property (empty = a match). Only checks details the owner has given. */
export function mismatches(r: Requirements | null | undefined, d: PropertyDetails | null | undefined): string[] {
  if (!r || !d) return [];
  const out: string[] = [];
  const m = monthsOf(d.availability);
  if (r.minMonths && m != null && m < r.minMonths) out.push(r.minMonths === 12 ? 'Only takes properties available all year' : `Only takes properties available at least ${r.minMonths} months a year`);
  if (r.types?.length && d.type && !r.types.includes(d.type)) out.push(`Doesn’t manage ${plural(d.type).replace(' and ', ' or ')}`);
  if (d.beds != null && !Number.isNaN(d.beds)) {
    if (r.minBeds != null && d.beds < r.minBeds) out.push(`Only manages homes with ${bedsText(r.minBeds)} or more`);
    if (r.maxBeds != null && d.beds > r.maxBeds) out.push(`Only manages homes with up to ${bedsText(r.maxBeds)}`);
  }
  if (r.fullOnly && d.services && d.services.length && !d.services.includes(FULL)) out.push('Only offers full management');
  if (r.ownersOnly && d.situation && /planning to buy/i.test(d.situation)) out.push('Only quotes once you own the property or are buying it');
  return out;
}

/** Owner's property details remembered in this browser between the search results and the quote form. */
export const PROPERTY_KEY = 'cc_property';

/** Link to the earnings estimate for a known place, which runs the estimate straight away. */
export function earningsHref(p: { lat?: number | string | null; lng?: number | string | null; place?: string | null; beds?: number | string | null }) {
  const q = new URLSearchParams();
  if (p.lat != null && p.lng != null && p.lat !== '' && p.lng !== '') { q.set('lat', String(p.lat)); q.set('lng', String(p.lng)); }
  if (p.place) q.set('place', String(p.place).slice(0, 120));
  if (p.beds != null && p.beds !== '' && !Number.isNaN(Number(p.beds))) q.set('beds', String(Math.min(5, Math.max(0, Number(p.beds)))));
  const s = q.toString();
  return `/earnings${s ? `?${s}` : ''}#estimate`;
}
