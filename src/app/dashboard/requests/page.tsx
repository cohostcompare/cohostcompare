import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import RequestList, { STAGES } from '@/components/RequestList';
import { myManagers } from '@/lib/managers';
import { managerThreads, type Stage } from '@/lib/todo';
import { currentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Quote requests', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Requests({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/dashboard/requests');
  const managers = await myManagers(user.id);
  if (!managers.length) redirect('/dashboard');
  const { f } = await searchParams;
  const rows = await managerThreads(managers.map((m) => m.slug), 500);
  const active = (STAGES.some((s) => s.key === f) ? f : rows.some((r) => r.stage === 'needs') ? 'needs' : 'all') as Stage | 'all';
  return (
    <main style={{ maxWidth: 920, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/dashboard" className="hint">← Dashboard</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,36px)', margin: 0 }}>Quote requests</h1>
      <RequestList rows={rows} active={active} base="/dashboard/requests" showManager={managers.length > 1} />
    </main>
  );
}
