import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import RequirementsForm from '@/components/RequirementsForm';
import { requireAdmin } from '@/lib/admin';
import { requirementsFor } from '@/lib/requirementsServer';
import { adminClient } from '@/lib/supabase/server';
import { adminSaveRequirements } from './actions';

export const metadata: Metadata = { title: 'Manager requirements', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminRequirements({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin('/admin/managers');
  const { id } = await params;
  const { data: m } = await adminClient().from('managers').select('id, slug, name, claimed').eq('id', id).maybeSingle();
  if (!m) notFound();
  const r = (await requirementsFor([m.slug])).get(m.slug) ?? null;
  return (
    <main style={{ maxWidth: 720, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href={`/admin/managers?q=${encodeURIComponent(m.name)}`} className="hint">← Managers</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,36px)', margin: 0 }}>Properties {m.name} takes on</h1>
      <p style={{ margin: 0 }}>Set on {m.name}&apos;s behalf. {m.claimed ? 'They can see and change these in their dashboard.' : 'They haven’t claimed their profile, so only you can change these.'} Changes are logged.</p>
      <RequirementsForm action={adminSaveRequirements} hidden={{ id: m.id }} r={r} who="they" />
    </main>
  );
}
