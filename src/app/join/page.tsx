import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import EmailSignIn from '@/components/EmailSignIn';
import { adminClient, currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Join your team', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Join({ searchParams }: { searchParams: Promise<{ i?: string }> }) {
  const { i } = await searchParams;
  const db = adminClient();
  const { data: inv } = i && /^[0-9a-f-]{36}$/.test(i) ? await db.from('manager_invites').select('id, email, manager_id, accepted_at, managers(name)').eq('id', i).maybeSingle() : { data: null };
  const name = (inv?.managers as unknown as { name: string } | null)?.name || 'your team';
  const user = await currentUser();
  if (!inv) return <main className="legal"><h1>This invite isn&apos;t valid</h1><p>Ask your colleague to send a new one from their dashboard.</p></main>;
  if (!user) return (
    <main style={{ maxWidth: 520, paddingBlock: '16px 64px', display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 32, margin: 0 }}>Join {name} on CoHostCompare</h1>
      <EmailSignIn next={`/join?i=${inv.id}`} intro={`Sign in with ${inv.email} to accept the invite.`} />
    </main>
  );
  if ((user.email || '').toLowerCase() !== inv.email.toLowerCase()) return <main className="legal"><h1>Wrong account</h1><p>This invite is for {inv.email}, but you&apos;re signed in as {user.email}. Sign out and sign in with {inv.email}.</p></main>;
  if (!inv.accepted_at) {
    await db.from('manager_members').upsert({ manager_id: inv.manager_id, user_id: user.id, role: 'member' });
    await db.from('manager_invites').update({ accepted_at: new Date().toISOString() }).eq('id', inv.id);
  }
  redirect('/dashboard');
  return <Link href="/dashboard">Open dashboard</Link>;
}
