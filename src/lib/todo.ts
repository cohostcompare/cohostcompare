import 'server-only';
import { adminClient } from '@/lib/supabase/server';

/*
 What a manager needs to do, worked out from their quote requests:
 - quote:   a request with no quote yet
 - reply:   the owner sent the last message (read or not), so they're waiting on the manager
 - confirm: an owner accepted and the Free-plan client confirmation is waiting
 Used for the menu badge and pop-up, the dashboard's "Needs your attention" panel and the requests filters.
*/

export type Stage = 'needs' | 'waiting' | 'won' | 'lost';
export type ThreadRow = {
  id: string; manager_slug: string; manager_name: string; status: string; created_at: string; request_id: string;
  owner: string; where: string; property: string; timing: string;
  lastFrom: 'owner' | 'manager' | 'system' | null; lastAt: string | null; unread: number;
  todo: ('quote' | 'reply' | 'confirm')[]; stage: Stage; otherAccepted: boolean;
};

type Msg = { sender: string; created_at: string; read_by_manager: boolean };

export async function managerThreads(slugs: string[], limit = 300): Promise<ThreadRow[]> {
  if (!slugs.length) return [];
  const db = adminClient();
  const { data } = await db.from('quote_request_managers')
    .select('id, manager_slug, manager_name, status, created_at, request_id, messages(sender, created_at, read_by_manager), quote_requests(owner_name, suburb, state, postcode, property_type, bedrooms, start_timing)')
    .in('manager_slug', slugs).order('created_at', { ascending: false }).limit(limit);
  const rows = (data || []) as unknown as (Omit<ThreadRow, 'owner' | 'where' | 'property' | 'timing' | 'lastFrom' | 'lastAt' | 'unread' | 'todo' | 'stage' | 'otherAccepted'> & { messages: Msg[]; quote_requests: Record<string, unknown> | Record<string, unknown>[] | null })[];
  if (!rows.length) return [];
  const reqIds = [...new Set(rows.map((r) => r.request_id))];
  const [{ data: accepted }, { data: fees }] = await Promise.all([
    db.from('quote_request_managers').select('request_id, manager_slug').in('request_id', reqIds).eq('status', 'accepted'),
    db.from('success_fees').select('thread_id, status').in('thread_id', rows.map((r) => r.id)).in('status', ['awaiting_unlock', 'expired']),
  ]);
  const confirm = new Set((fees || []).map((f) => f.thread_id));
  return rows.map((r) => {
    const q = (Array.isArray(r.quote_requests) ? r.quote_requests[0] : r.quote_requests) || {};
    const people = (r.messages || []).filter((m) => m.sender !== 'system').sort((a, b) => a.created_at.localeCompare(b.created_at));
    const last = people[people.length - 1];
    const open = !['accepted', 'declined', 'withdrawn'].includes(r.status);
    const otherAccepted = (accepted || []).some((a) => a.request_id === r.request_id && a.manager_slug !== r.manager_slug);
    const todo: ThreadRow['todo'] = [];
    if (open && !otherAccepted && ['sent', 'viewed'].includes(r.status)) todo.push('quote');
    if (last?.sender === 'owner' && !otherAccepted && ['sent', 'viewed', 'quoted'].includes(r.status)) todo.push('reply'); // after an introduction they talk by email
    if (confirm.has(r.id)) todo.push('confirm');
    const stage: Stage = todo.length ? 'needs' : r.status === 'accepted' ? 'won' : otherAccepted || ['declined', 'withdrawn'].includes(r.status) ? 'lost' : 'waiting';
    const beds = Number(q.bedrooms);
    return {
      id: r.id, manager_slug: r.manager_slug, manager_name: r.manager_name, status: r.status, created_at: r.created_at, request_id: r.request_id,
      owner: String(q.owner_name || 'Owner').split(' ')[0], where: `${q.suburb || ''} ${q.state || ''} ${q.postcode || ''}`.replace(/\s+/g, ' ').trim(),
      property: `${q.property_type || ''}, ${beds === 0 ? 'studio' : `${beds} bed`}`, timing: String(q.start_timing || ''),
      lastFrom: (last?.sender as ThreadRow['lastFrom']) ?? null, lastAt: last?.created_at ?? null,
      unread: (r.messages || []).filter((m) => m.sender === 'owner' && !m.read_by_manager).length,
      todo, stage, otherAccepted,
    };
  });
}

/** True when a different manager's thread on the same request has been accepted (the owner has moved on), same rule as managerThreads. */
export async function otherAcceptedFor(requestId: string, mySlug: string) {
  const { data } = await adminClient().from('quote_request_managers').select('manager_slug').eq('request_id', requestId).eq('status', 'accepted').neq('manager_slug', mySlug).limit(1);
  return Boolean(data?.length);
}

export const todoLabel = (t: ThreadRow) =>
  t.todo.includes('confirm') ? `${t.owner} accepted your quote: confirm to get their details`
    : t.todo.includes('reply') ? `${t.owner} is waiting for your reply${t.unread ? ` (${t.unread} new message${t.unread === 1 ? '' : 's'})` : ''}`
      : `New request from ${t.owner} in ${t.where}: send your quote`;

/** To-dos for everyone the signed-in user manages (for the menu). Never throws. */
export async function todosForUser(userId: string) {
  try {
    const db = adminClient();
    const { data: mem } = await db.from('manager_members').select('managers(slug)').eq('user_id', userId);
    const slugs = (mem || []).map((m) => (m.managers as unknown as { slug: string } | null)?.slug).filter(Boolean) as string[];
    return (await managerThreads(slugs, 200)).filter((t) => t.todo.length);
  } catch { return []; }
}
