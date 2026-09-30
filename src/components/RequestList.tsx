import Link from 'next/link';
import type { Stage, ThreadRow } from '@/lib/todo';

export const STAGES: { key: Stage | 'all'; label: string }[] = [
  { key: 'needs', label: 'Needs your reply' },
  { key: 'waiting', label: 'Quoted, waiting on owner' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Not chosen or closed' },
  { key: 'all', label: 'All' },
];

const badge = (t: ThreadRow): [string, string] =>
  t.todo.includes('confirm') ? ['Confirm client', 'var(--signal)']
    : t.todo.includes('reply') ? ['Owner waiting on you', 'var(--signal)']
      : t.todo.includes('quote') ? ['Send your quote', 'var(--signal)']
        : t.stage === 'won' ? ['Won', 'var(--brand)']
          : t.stage === 'lost' ? [t.otherAccepted ? 'Owner chose another manager' : t.status === 'declined' ? 'You declined' : 'Closed', 'var(--muted)']
            : ['Quote sent, waiting on owner', 'var(--brand)'];

/** Filter chips plus the list of quote requests. */
export default function RequestList({ rows, active, base, showManager }: { rows: ThreadRow[]; active: Stage | 'all'; base: string; showManager?: boolean }) {
  const counts = Object.fromEntries(STAGES.map((s) => [s.key, s.key === 'all' ? rows.length : rows.filter((r) => r.stage === s.key).length]));
  const list = active === 'all' ? rows : rows.filter((r) => r.stage === active);
  return (
    <div className="panel" style={{ display: 'grid', gap: 0, padding: 0, overflow: 'hidden' }}>
      <div className="req-filters">
        {STAGES.map((s) => (
          <Link key={s.key} href={`${base}${base.includes('?') ? '&' : '?'}f=${s.key}`} scroll={false} className={`chip${active === s.key ? ' on' : ''}`} aria-current={active === s.key}>
            {s.label} <b>{counts[s.key]}</b>
          </Link>
        ))}
      </div>
      {!list.length ? (
        <p style={{ margin: 0, padding: '14px 18px', color: 'var(--muted)' }}>{active === 'needs' ? 'Nothing needs your reply right now.' : 'No quote requests here yet. We email you when one arrives.'}</p>
      ) : list.map((t) => {
        const [label, colour] = badge(t);
        return (
          <Link key={t.id} href={`/dashboard/requests/${t.id}`} className="req-row">
            <b>{t.owner} · {t.where}{t.unread ? <span style={{ color: 'var(--signal)' }}> · {t.unread} new message{t.unread === 1 ? '' : 's'}</span> : null}</b>
            <span style={{ fontWeight: 700, color: colour, fontSize: 14, textAlign: 'right' }}>{label}</span>
            <span className="hint">{t.property}{t.timing ? ` · ${t.timing.toLowerCase()}` : ''}{showManager ? ` · ${t.manager_name}` : ''}</span>
            <span className="hint" style={{ textAlign: 'right' }}>{new Date(t.lastAt || t.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
          </Link>
        );
      })}
    </div>
  );
}
