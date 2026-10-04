import type { Quote } from '@/lib/quotes';
import { gstModeOf, gstSuffix } from '@/lib/gst';

const money = (n: number) => `A$${Math.round(n).toLocaleString('en-AU')}`;
const revenue = (q: Quote) => (q.estNightlyRate != null && q.estOccupancyPct != null ? q.estNightlyRate * 365 * (q.estOccupancyPct / 100) : null);
const effFee = (q: Quote) => q.feePct * (gstModeOf(q) === 'plus' ? 1.1 : 1); // only "plus GST" adds 10%

export type QuoteCol = { name: string; href?: string; q: Quote; accepted?: boolean; nearby?: { homes: number; rating: number | null } };

/**
 * Side-by-side comparison in the standard format. To keep it neutral, year-one fees are worked out on the SAME
 * revenue for every manager (the average of their estimates), so an optimistic or pessimistic estimate can't make
 * one look cheaper. "Stands out for" labels are plain facts from the quotes and our listing data, never paid for.
 */
export default function QuoteTable({ quotes }: { quotes: QuoteCol[] }) {
  const revs = quotes.map((x) => revenue(x.q)).filter((v): v is number => v != null);
  const R = revs.length ? revs.reduce((a, b) => a + b, 0) / revs.length : null;
  const cost = (q: Quote) => (R == null ? null : R * (effFee(q) / 100) + q.setupFee);
  const multi = quotes.length > 1;
  const showNearby = quotes.some((x) => x.nearby);

  // Facts that set a quote apart. Only awarded when the quotes actually differ; ties share it.
  const badges = quotes.map(() => [] as string[]);
  const award = (label: string, val: (x: QuoteCol) => number | null, best: 'min' | 'max') => {
    const vs = quotes.map(val);
    const known = vs.filter((v): v is number => v != null);
    if (known.length < 2 || new Set(known).size < 2) return;
    const target = best === 'min' ? Math.min(...known) : Math.max(...known);
    vs.forEach((v, i) => { if (v === target) badges[i].push(typeof label === 'string' ? label : ''); });
  };
  if (multi) {
    award('Lowest fees', (x) => (R != null ? cost(x.q) : effFee(x.q)), 'min');
    award(Math.min(...quotes.map((x) => x.q.minTermMonths)) === 0 ? 'No lock-in' : 'Shortest lock-in', (x) => x.q.minTermMonths, 'min');
    award('Shortest notice', (x) => x.q.noticeDays, 'min');
    award('Top-rated homes nearby', (x) => (x.nearby && x.nearby.homes >= 3 ? x.nearby.rating : null), 'max');
    award('Most homes nearby', (x) => x.nearby?.homes ?? null, 'max');
  }

  const rows: [string, (x: QuoteCol, i: number) => React.ReactNode][] = [
    ['Management fee', (x) => `${x.q.feePct}%${gstSuffix(gstModeOf(x.q))}`],
    ['Setup fee', (x) => (x.q.setupFee ? money(x.q.setupFee) : 'None')],
    [R != null ? `Year-one fees on ${money(R)} bookings` : 'Year-one fees', (x) => { const c = cost(x.q); return c == null ? 'Needs a revenue estimate' : `≈ ${money(c)}`; }],
    ['Minimum term', (x) => (x.q.minTermMonths ? `${x.q.minTermMonths} months` : 'No lock-in')],
    ['Notice to leave', (x) => (x.q.noticeDays != null ? `${x.q.noticeDays} days` : 'Not stated')],
    ['Cleaning fees', (x) => (x.q.cleaning === 'guests' ? 'Charged to guests' : x.q.cleaning === 'owner' ? 'Charged to you' : 'Not stated')],
    ['Linen', (x) => (x.q.linenIncluded === true ? 'Included' : x.q.linenIncluded === false ? 'Extra cost' : 'Not stated')],
    ['Their revenue estimate', (x) => { const r = revenue(x.q); return r == null ? 'Not given' : `${money(r)} a year (${money(x.q.estNightlyRate!)}/night, ${x.q.estOccupancyPct}% booked)`; }],
    ...(showNearby ? [
      ['Homes they run nearby', (x: QuoteCol) => (x.nearby ? String(x.nearby.homes) : '—')],
      ['Guest rating, nearby homes', (x: QuoteCol) => (x.nearby?.rating != null ? `${x.nearby.rating.toFixed(2)} ★` : '—')],
    ] as [string, (x: QuoteCol) => React.ReactNode][] : []),
  ];

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ overflowX: 'auto' }} tabIndex={0} role="region" aria-label="Quote comparison" className="scroll-region">
        <table className={`qtable${multi ? ' multi' : ''}`}>
          {multi && (
            <thead>
              <tr><th scope="col"><span className="sr-only">Item</span></th>{quotes.map((x) => (
                <th key={x.name} scope="col">{x.href ? <a href={x.href}>{x.name}</a> : x.name}{x.accepted ? <span className="qtag">Accepted</span> : null}</th>
              ))}</tr>
            </thead>
          )}
          <tbody>
            {multi && badges.some((b) => b.length) && (
              <tr><th scope="row">Stands out for</th>{badges.map((b, i) => (
                <td key={quotes[i].name}>{b.length ? <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{b.map((l) => <span key={l} className="qbadge">{l}</span>)}</span> : '—'}</td>
              ))}</tr>
            )}
            {rows.map(([label, f]) => (
              <tr key={label}><th scope="row">{label}</th>{quotes.map((x, i) => <td key={x.name}>{f(x, i)}</td>)}</tr>
            ))}
            {quotes.some((x) => x.q.included?.length) && (
              <tr><th scope="row">Included</th>{quotes.map((x) => <td key={x.name}>{x.q.included?.length ? x.q.included.join(' · ') : '—'}</td>)}</tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        {R != null && multi ? 'Year-one fees use the same booking revenue for every manager (the average of their estimates), so you compare fees, not forecasts. ' : ''}
        Revenue estimates are each manager&apos;s own and aren&apos;t guaranteed.
        {multi ? ' “Stands out for” labels are facts from the quotes and listing data. No manager can pay for them, and we don’t rank quotes, because the right pick depends on what matters to you.' : ''}
        {showNearby ? ' Nearby homes and ratings are estimates. Data source: AirROI (www.airroi.com).' : ''}
      </p>
    </div>
  );
}
