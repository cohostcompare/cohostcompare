'use client';

import Link from 'next/link';
import AccountMenu from './AccountMenu';
import FeedbackPrompt from './FeedbackPrompt';
import ManagerMenu from './ManagerMenu';
import { useMe } from '@/lib/client/me';

/** The signed-in parts of the header. Loaded in the browser so the page around them can be cached. */
export function OwnerSlot() {
  const me = useMe();
  if (me?.email) return <AccountMenu email={me.email} unread={me.unread || 0} />;
  return <Link className="btn primary small" href="/signin">Sign in or join free</Link>;
}

export function ManagerSlot() {
  const me = useMe();
  if (me?.isManager) return <ManagerMenu items={me.todos || []} managers={me.managers || []} />;
  return <Link className="btn secondary small" href="/dashboard">Manager portal</Link>;
}

export function AdminSlot() {
  const me = useMe();
  if (!me?.isAdmin) return null;
  return <div className="menu-group admin"><Link className="admin-link" href="/admin">Admin</Link></div>;
}

export function FeedbackSlot() {
  const me = useMe();
  return me?.email && me.ask ? <FeedbackPrompt /> : null;
}
