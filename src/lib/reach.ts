import 'server-only';
import { unclaimedReach } from '@/lib/outreach';

/** Owners see this next to managers we can't email about a request (unclaimed, no usable address on file). */
export const SLOW_REPLY_NOTE = 'Not on CoHostCompare yet, so may be slow to reply';

/** Marks unclaimed managers we have no usable email for. Never changes order or visibility. */
export async function withReach<T extends { slug: string; claimed: boolean }>(list: T[]): Promise<(T & { slowReply: boolean })[]> {
  const un = list.filter((m) => !m.claimed).map((m) => m.slug);
  const reach = un.length ? await unclaimedReach(un).catch(() => new Map()) : new Map();
  return list.map((m) => ({ ...m, slowReply: !m.claimed && reach.has(m.slug) && reach.get(m.slug) !== 'ok' }));
}
