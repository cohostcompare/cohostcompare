import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin';
import { adminClient, currentUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Who's signed in, for the header. Fetched from the browser so every public page can be cached:
 * the page itself never depends on the visitor.
 */
export async function GET() {
  const user = await currentUser().catch(() => null);
  const headers = { 'cache-control': 'private, no-store' };
  if (!user) return NextResponse.json({ email: null }, { headers });
  const { todoLabel, todosForUser } = await import('@/lib/todo');
  const db = adminClient();
  const ownerUnread = async () => {
    try {
      const { data: ts } = await db.from('quote_request_managers').select('id, quote_requests!inner(owner_id)').eq('quote_requests.owner_id', user.id);
      const ids = (ts || []).map((t) => t.id);
      return ids.length ? (await db.from('messages').select('id', { count: 'exact', head: true }).in('thread_id', ids).eq('read_by_owner', false).neq('sender', 'owner')).count ?? 0 : 0;
    } catch { return 0; }
  };
  const [isManager, unread, todos] = await Promise.all([
    db.from('manager_members').select('manager_id', { count: 'exact', head: true }).eq('user_id', user.id).then((r) => Boolean(r.count), () => false),
    ownerUnread(),
    todosForUser(user.id).catch(() => []),
  ]);
  const ask = !(await cookies()).get('cc_fb');
  return NextResponse.json({
    email: user.email || '',
    isAdmin: isAdminEmail(user.email),
    isManager,
    unread,
    todos: todos.map((t) => ({ id: t.id, label: todoLabel(t), manager: t.manager_name })),
    ask,
  }, { headers });
}
