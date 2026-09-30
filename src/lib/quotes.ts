import 'server-only';

/** The standard quote format every manager replies with, so owners can compare like with like. */
export type Quote = {
  feePct: number;
  gst: boolean;
  setupFee: number;
  minTermMonths: number;
  noticeDays: number | null;
  cleaning: 'guests' | 'owner' | null;
  linenIncluded: boolean | null;
  estNightlyRate: number | null;
  estOccupancyPct: number | null;
  included: string[];
  note: string | null;
};

export function parseQuote(form: FormData): Quote | { error: string } {
  const n = (k: string) => { const s = String(form.get(k) ?? '').trim(); return s === '' ? null : Number(s); };
  const feePct = n('fee_pct'), setup = n('setup_fee'), term = n('min_term'), notice = n('notice_days'), rate = n('est_rate'), occ = n('est_occ');
  if (feePct == null || !Number.isFinite(feePct) || feePct < 0 || feePct > 50) return { error: 'Enter your management fee as a percentage (0–50).' };
  if (setup == null || !Number.isFinite(setup) || setup < 0 || setup > 20000) return { error: 'Enter your setup fee in A$ (0 if none).' };
  if (term == null || !Number.isFinite(term) || term < 0 || term > 60) return { error: 'Enter the minimum term in months (0 for no lock-in).' };
  for (const [v, label, max] of [[notice, 'notice period', 365], [rate, 'nightly rate', 20000], [occ, 'occupancy', 100]] as const) {
    if (v != null && (!Number.isFinite(v) || v < 0 || v > max)) return { error: `Check the ${label}.` };
  }
  const c = String(form.get('cleaning') || '');
  const l = String(form.get('linen') || '');
  return {
    feePct, gst: form.get('gst') === 'yes', setupFee: setup, minTermMonths: term, noticeDays: notice,
    cleaning: c === 'guests' || c === 'owner' ? c : null,
    linenIncluded: l === 'yes' ? true : l === 'no' ? false : null,
    estNightlyRate: rate, estOccupancyPct: occ,
    included: String(form.get('included') || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 12),
    note: String(form.get('note') || '').trim().slice(0, 1500) || null,
  };
}

/** Rough yearly cost to the owner at the manager's own estimates (fee + setup), for comparison only. */
export function yearOneCost(q: Quote): number | null {
  if (q.estNightlyRate == null || q.estOccupancyPct == null) return null;
  const revenue = q.estNightlyRate * 365 * (q.estOccupancyPct / 100);
  return Math.round(revenue * (q.feePct / 100) * (q.gst ? 1.1 : 1) + q.setupFee);
}
