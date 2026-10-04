import Link from 'next/link';

/*
 A small single-series bar chart of the last N weeks (server-rendered SVG, no library).
 One hue (brand), thin bars with rounded tops anchored to the baseline, a recessive axis,
 the latest period as the hero number with the change on the one before (`unit` is 'week' or 'month'). Hovering a bar shows its value.
*/
export default function WeekBars({ title, values, labels, href, note, unit = 'week' }: { title: string; values: number[]; labels: string[]; href?: string; note?: string; unit?: 'week' | 'month' }) {
  const W = 300, H = 96, pad = 2, n = values.length;
  const Unit = unit === 'month' ? 'Month' : 'Week';
  const max = Math.max(1, ...values);
  const slot = W / n, bw = Math.max(4, slot - 6);
  const now = values[n - 1] ?? 0, before = values[n - 2] ?? 0;
  const delta = now - before;
  const top = (v: number) => H - Math.max(v > 0 ? 3 : 0, (v / max) * (H - pad));
  const bar = (x: number, y: number, w: number) => {
    const h = H - y, r = Math.min(4, w / 2, h);
    return h <= 0 ? '' : `M${x},${H} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${H} Z`;
  };
  const head = (
    <div className="wb-head">
      <span className="wb-title">{title}</span>
      <span className="wb-now"><b>{now.toLocaleString('en-AU')}</b><span className={`wb-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>{delta > 0 ? `▲ ${delta}` : delta < 0 ? `▼ ${-delta}` : 'no change'} on the {unit} before</span></span>
    </div>
  );
  return (
    <figure className="wb">
      {href ? <Link href={href} className="wb-link">{head}</Link> : head}
      <svg viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label={`${title}, ${unit === 'month' ? 'monthly' : 'weekly'} for the last ${n} ${unit}s: ${values.join(', ')}`}>
        <line x1="0" x2={W} y1={H} y2={H} className="wb-axis" />
        {values.map((v, i) => {
          const x = i * slot + (slot - bw) / 2;
          return (
            <g key={i} className="wb-bar">
              <rect x={i * slot} y="0" width={slot} height={H} className="wb-hit"><title>{`${Unit} from ${labels[i]}: ${v}`}</title></rect>
              <path d={bar(x, top(v), bw)} className={i === n - 1 ? 'wb-mark now' : 'wb-mark'} />
            </g>
          );
        })}
        <text x="0" y={H + 13} className="wb-tick">{labels[0]}</text>
        <text x={W} y={H + 13} className="wb-tick" textAnchor="end">This {unit}</text>
      </svg>
      {note && <figcaption className="hint">{note}</figcaption>}
    </figure>
  );
}
