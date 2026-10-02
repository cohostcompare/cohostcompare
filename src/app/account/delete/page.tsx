import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase/server';
import DeleteForm from './DeleteForm';

export const metadata: Metadata = { title: 'Delete your account', robots: { index: false } };

export default async function DeleteAccount() {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/account/delete');
  return (
    <main style={{ maxWidth: 620, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/account" className="hint">← Back to inbox</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,36px)', margin: 0 }}>Delete your account</h1>
      <p style={{ margin: 0 }}>This permanently deletes your CoHostCompare account ({user.email}), your quote requests, your messages with managers and any reviews you&apos;ve written. It can&apos;t be undone.</p>
      <p className="hint" style={{ margin: 0 }}>Managers you&apos;ve already been introduced to keep the contact details you shared with them. If you just want fewer emails, use the unsubscribe link in any email instead.</p>
      <DeleteForm />
    </main>
  );
}
