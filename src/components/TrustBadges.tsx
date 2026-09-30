import type { PublicManager } from '@/lib/types';

const speed = (h: number) => (h <= 4 ? 'within a few hours' : h <= 24 ? 'within a day' : h <= 48 ? 'within 2 days' : `within ${Math.ceil(h / 24)} days`);

/** Factual trust signals. Unclaimed managers get an honest "not yet joined" note instead of a reply time. */
export default function TrustBadges({ m, full, compact }: { m: Pick<PublicManager, 'claimed' | 'responseHours' | 'verified'>; full?: boolean; compact?: boolean }) {
  if (compact && !m.claimed && !m.verified) return null;
  return (
    <span className="badges">
      {m.verified && <span className="badge ok" title="ABN checked on the Australian Business Register">✓ Verified business</span>}
      {m.claimed
        ? <span className="badge" title="This manager runs their own profile and replies to owners here">{m.responseHours != null ? `⚡ Usually quotes ${speed(m.responseHours)}` : '💬 Replies on CoHostCompare'}</span>
        : compact ? null : <span className="badge muted" title="This manager hasn't joined yet. We invite them to reply to your request, so it may take longer.">Not yet on CoHostCompare{full ? ': replies may take longer' : ''}</span>}
    </span>
  );
}
