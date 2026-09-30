import type { Quote } from '@/lib/quotes';

const money = (n: number) => `A$${n.toLocaleString('en-AU')}`;

/** Rough yearly management cost at the manager's own estimates (fee + setup). Mirrors yearOneCost in lib/quotes. */
export function estYearCost(q: Quote): number | null {
  if (q.estNightlyRate == null || q.estOccupancyPct == null) return null;
  return Math.round(q.estNightlyRate * 365 * (q.estOccupancyPct / 100) * (q.feePct / 100) * (q.gst ? 1.1 : 1) + q.setupFee);
}

const ROWS: [string, (q: Quote) => string][] = [
  ['Management fee', (q) => `${q.feePct}%${q.gst ? ' + GST' : ''}`],
  ['Setup fee', (q) => (q.setupFee ? money(q.setupFee) : 'None')],
  ['Minimum term', (q) => (q.minTermMonths ? `${q.minTermMonths} months` : 'No lock-in')],
  ['Notice to leave', (q) => (q.noticeDays != null ? `${q.noticeDays} days` : 'Not stated')],
  ['Cleaning fees', (q) => (q.cleaning === 'guests' ? 'Charged to guests' : q.cleaning === 'owner' ? 'Charged to you' : 'Not stated')],
  ['Linen', (q) => (q.linenIncluded === true ? 'Included' : q.linenIncluded === false ? 'Extra cost' : 'Not stated')],
  ['Their estimate', (q) => (q.estNightlyRate != null && q.estOccupancyPct != null ? `${money(q.estNightlyRate)}/night, ${q.estOccupancyPct}% booked` : 'Not given')],
  ['Est. cost, year one', (q) => { const c = estYearCost(q); return c == null ? '—' : `≈ ${money(c)}`; }],
];

/** Side-by-side comparison of one or more quotes in the standard format. */
export default function QuoteTable({ quotes }: { quotes: { name: string; href?: string; q: Quote; accepted?: boolean }[] }) {
  const costs = quotes.map((x) => estYearCost(x.q));
  const best = quotes.length > 1 ? Math.min(...quotes.map((x) => x.q.feePct)) : null;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="qtable">
        {quotes.length > 1 && (
          <thead>
            <tr><th scope="col"><span className="sr-only">Item</span></th>{quotes.map((x) => (
              <th key={x.name} scope="col">{x.href ? <a href={x.href}>{x.name}</a> : x.name}{x.accepted ? <span className="qtag">Accepted</span> : null}</th>
            ))}</tr>
          </thead>
        )}
        <tbody>
          {ROWS.map(([label, f]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {quotes.map((x, i) => (
                <td key={x.name} style={label === 'Management fee' && best != null && x.q.feePct === best ? { fontWeight: 700, color: 'var(--brand)' } : undefined}>
                  {label === 'Est. cost, year one' && costs[i] == null ? '—' : f(x.q)}
                </td>
              ))}
            </tr>
          ))}
          {quotes.some((x) => x.q.included?.length) && (
            <tr><th scope="row">Included</th>{quotes.map((x) => <td key={x.name}>{x.q.included?.length ? x.q.included.join(' · ') : '—'}</td>)}</tr>
          )}
        </tbody>
      </table>
      <p className="hint" style={{ margin: '8px 0 0' }}>Estimates are each manager&apos;s own and aren&apos;t guaranteed. Year-one cost = their estimated bookings × fee, plus setup.</p>
    </div>
  );
}
