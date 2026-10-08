import Link from 'next/link';

/*
 A small single-series bar chart of the last N weeks (server-rendered SVG, no library).
 One hue (brand), thin bars with rounded tops anchored to the baseline, a light y-axis (0, half, top),
 the latest period as the hero number with the change on the one before (`unit` is 'week' or 'month'). Hovering a bar shows its value and week at once.
*/
type Parts = { labels: string[]; colors: string[]; values: number[][] };

export default function WeekBars({ title, values, labels, href, note, unit = 'week', parts }: { title: string; values: number[]; labels: string[]; href?: string; note?: string; unit?: 'day' | 'week' | 'month'; parts?: Parts }) {
  const W = 300, H = 96, pad = 2, n = values.length, L = 30; // L = left gutter for the y-axis labels
  const Unit = unit === 'month' ? 'Month' : unit === 'day' ? 'Day' : 'Week';
  // Y axis: a "nice" top (1, 2, 5 × 10^k) at or above the biggest bar, with a line at the top and halfway.
  const raw = Math.max(1, ...values);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const max = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw) ?? raw;
  const ticks = [max, max / 2].filter((t) => Number.isInteger(t) || max >= 10);
  const fmtTick = (t: number) => (Number.isInteger(t) ? t.toLocaleString('en-AU') : t.toFixed(1));
  const slot = (W - L) / n, bw = Math.max(4, slot - 6);
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
      <svg viewBox={`0 0 ${W} ${H + 16}`} role="img" aria-label={`${title}, ${unit === 'month' ? 'monthly' : unit === 'day' ? 'daily' : 'weekly'} for the last ${n} ${unit}s: ${values.join(', ')}`}>
        {ticks.map((t) => {
          const y = H - (t / max) * (H - pad);
          return <g key={t}><line x1={L} x2={W} y1={y} y2={y} className="wb-gline" /><text x={L - 5} y={y + 3.5} className="wb-tick" textAnchor="end">{fmtTick(t)}</text></g>;
        })}
        <line x1={L} x2={W} y1={H} y2={H} className="wb-axis" />
        <text x={L - 5} y={H + 3.5} className="wb-tick" textAnchor="end">0</text>
        {values.map((v, i) => {
          const x = L + i * slot + (slot - bw) / 2;
          const cx = L + i * slot + slot / 2;
          const y = top(v);
          const head = `${v.toLocaleString('en-AU')} · ${i === n - 1 ? (unit === 'day' ? 'today' : `this ${unit}`) : unit === 'day' ? labels[i] : `${Unit.toLowerCase()} of ${labels[i]}`}`;
          const detail = parts && v > 0 ? (parts.values[i] || []).map((sv, k) => (sv ? `${parts.labels[k]} ${sv}` : null)).filter(Boolean).join(' · ') : '';
          // Keep the hover label inside the chart: centre it on the bar, then clamp by its approximate width.
          const place = (t: string) => { const w = t.length * 7; return Math.min(W - w / 2, Math.max(L + w / 2, cx)); };
          return (
            <g key={i} className="wb-bar">
              <rect x={L + i * slot} y="0" width={slot} height={H} className="wb-hit" />
              {parts && v > 0 ? (() => {
                // Stack the segments bottom-up; the top one gets the rounded corners.
                const segs = parts.values[i] || []; let acc = 0; const out = [];
                const scale = (H - y) / v;
                for (let k = 0; k < segs.length; k++) {
                  const sv = segs[k]; if (!sv) continue;
                  const h = sv * scale, yTop = H - (acc + sv) * scale; acc += sv;
                  const top = acc === v;
                  out.push(top ? <path key={k} d={bar(x, yTop, bw)} className="wb-seg" style={{ fill: parts.colors[k] }} /> : <rect key={k} x={x} y={yTop} width={bw} height={h} className="wb-seg" style={{ fill: parts.colors[k] }} />);
                }
                return out;
              })() : <path d={bar(x, y, bw)} className={i === n - 1 ? 'wb-mark now' : 'wb-mark'} />}
              <text x={place(head)} y={Math.max(detail ? 24 : 10, y - (detail ? 20 : 6))} className="wb-val" textAnchor="middle">{head}</text>
              {detail && <text x={place(detail)} y={Math.max(24, y - 6)} className="wb-val wb-val-detail" textAnchor="middle">{detail}</text>}
            </g>
          );
        })}
        <text x={L} y={H + 13} className="wb-tick">{labels[0]}</text>
        <text x={W} y={H + 13} className="wb-tick" textAnchor="end">{unit === 'day' ? 'Today' : `This ${unit}`}</text>
      </svg>
      {parts && <div className="wb-legend" aria-hidden="true">{parts.labels.map((l, k) => <span key={l}><i style={{ background: parts.colors[k] }} />{l}</span>)}</div>}
      {note && <figcaption className="hint">{note}</figcaption>}
    </figure>
  );
}
