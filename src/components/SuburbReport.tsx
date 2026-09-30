import Link from 'next/link';
import type { ReportData } from '@/lib/reports';

const money = (x: number | null) => (x == null ? '–' : `A$${Math.round(x).toLocaleString('en-AU')}`);
const pc = (x: number | null) => (x == null ? '–' : `${Math.round(x * 100)}%`);
const change = (now: number | null, before: number | null) => {
  if (now == null || before == null || !before) return null;
  const d = (now - before) / before;
  if (Math.abs(d) < 0.02) return 'about the same as last quarter';
  return `${d > 0 ? 'up' : 'down'} ${Math.round(Math.abs(d) * 100)}% on last quarter`;
};

/** The suburb report itself, used in the dashboard and for printing. */
export default function SuburbReport({ r }: { r: ReportData }) {
  const m = r.market;
  const maxOcc = Math.max(0.01, ...(r.seasonality || []).map((x) => x.occupancy || 0));
  const rates = (r.seasonality || []).map((x) => x.nightly || 0).filter((x) => x > 0);
  const minRate = rates.length ? Math.min(...rates) : 0, maxRate = rates.length ? Math.max(...rates) : 1;
  const rateW = (x: number | null) => (!x ? 0 : maxRate === minRate ? 60 : 15 + 85 * ((x - minRate) / (maxRate - minRate)));
  return (
    <article className="report" style={{ display: 'grid', gap: 22 }}>
      <header style={{ display: 'grid', gap: 4 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>Suburb report · {r.periodLabel}</span>
        <h1 style={{ fontSize: 'clamp(28px,4.4vw,40px)', margin: 0 }}>Short stays in {r.area.label}</h1>
        <p className="hint" style={{ margin: 0 }}>Airbnb homes within {r.area.radiusKm} km of central {r.area.label}, {r.area.city}. Figures cover the 12 months to {r.asOf ? new Date(r.asOf).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) : 'the latest data'}.</p>
      </header>

      <section className="dash-stats">
        <div className="panel"><b>{m.homes.toLocaleString('en-AU')}</b><span>active Airbnb homes{r.previous ? ` (${change(m.homes, r.previous.homes)})` : ''}</span></div>
        <div className="panel"><b>{money(m.nightly)}</b><span>typical nightly rate{r.previous && change(m.nightly, r.previous.nightly) ? ` (${change(m.nightly, r.previous.nightly)})` : ''}</span></div>
        <div className="panel"><b>{money(m.revenue)}</b><span>typical yearly revenue per home</span></div>
        <div className="panel"><b>{pc(m.occupancy)}</b><span>typical Airbnb occupancy</span></div>
        <div className="panel"><b>{m.rating != null ? `${m.rating.toFixed(2)} ★` : '–'}</b><span>typical guest rating</span></div>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>By number of bedrooms</h2>
        <div className="panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="rtable">
            <thead><tr><th>Home size</th><th>Homes</th><th>Nightly rate</th><th>Yearly revenue</th><th>Occupancy</th></tr></thead>
            <tbody>{m.buckets.map((b) => <tr key={b.label}><td>{b.label}</td><td>{b.homes}</td><td>{b.homes >= 5 ? money(b.nightly) : '–'}</td><td>{b.homes >= 5 ? money(b.revenue) : '–'}</td><td>{b.homes >= 5 ? pc(b.occupancy) : '–'}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="hint" style={{ margin: 0 }}>Typical means the median home. Sizes with fewer than 5 homes aren&apos;t shown. Occupancy only counts Airbnb bookings, so homes also let on other sites will be busier than this.</p>
      </section>

      {r.seasonality && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>Seasonality in the wider market</h2>
          <div className="panel" style={{ display: 'grid', gap: 6 }}>
            {r.seasonality.map((x) => (
              <div key={x.month} style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1fr) minmax(0,1fr)', gap: 10, alignItems: 'center', fontSize: 14 }}>
                <span className="hint">{new Date(`${x.month}-01T00:00:00`).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 44px', gap: 6, alignItems: 'center' }}><div className="meter"><span style={{ width: `${((x.occupancy || 0) / maxOcc) * 100}%` }} /></div><span>{pc(x.occupancy)}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 56px', gap: 6, alignItems: 'center' }}><div className="meter"><span style={{ width: `${rateW(x.nightly)}%`, background: 'var(--signal)' }} /></div><span>{money(x.nightly)}</span></div>
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0,1fr) minmax(0,1fr)', gap: 10 }} className="hint"><span /><span>Occupancy</span><span>Nightly rate (bars show the range from lowest to highest month)</span></div>
          </div>
        </section>
      )}

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Managers and fees</h2>
        <p style={{ margin: 0 }}>{r.managers.count} managers run homes near {r.area.label}. {m.professional != null ? `About ${pc(m.professional)} of homes are run by professional hosts or managers.` : ''} {r.managers.withFees ? `Of the ${r.managers.withFees} that publish a fee, the midpoint is ${r.managers.feeMedian?.toFixed(1)}% (range ${r.managers.feeLow}% to ${r.managers.feeHigh}%).` : 'Few managers here publish their fees.'}</p>
        {r.managers.top.length > 0 && (
          <div className="panel" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="rtable">
              <thead><tr><th>Most active managers nearby</th><th>Homes nearby</th><th>Guest rating nearby</th></tr></thead>
              <tbody>{r.managers.top.map((t) => <tr key={t.slug}><td><Link href={`/managers/${t.slug}`}>{t.name}</Link></td><td>{t.homes}</td><td>{t.rating ? `${Number(t.rating).toFixed(2)} ★` : '–'}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Owners looking for a manager</h2>
        <p style={{ margin: 0 }}>{r.owners.requests90d == null ? 'Owner activity will show here once there is enough of it.' : `${r.owners.requests90d} owner${r.owners.requests90d === 1 ? '' : 's'} near ${r.area.label} asked for quotes on CoHostCompare in the last 90 days.`}{r.owners.quotedFeeMedian != null ? ` The typical fee quoted to them was ${r.owners.quotedFeeMedian.toFixed(1)}%.` : ''}</p>
      </section>

      {r.rules && (
        <section style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>Rules in {r.rules.state}</h2>
          <p style={{ margin: 0 }}>{r.rules.summary} <Link href="/rules">Latest rules and official sources</Link></p>
        </section>
      )}

      <footer className="hint" style={{ display: 'grid', gap: 4 }}>
        <span>Figures are estimates from public listing data and activity on CoHostCompare, for your own business use. Please don&apos;t republish them without naming CoHostCompare and AirROI as sources.</span>
        <span>Data source: AirROI (www.airroi.com).</span>
      </footer>
    </article>
  );
}
