import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import SuburbReport from '@/components/SuburbReport';
import { isAdminEmail } from '@/lib/admin';
import { myManagers } from '@/lib/managers';
import { reportsFor, type ReportData } from '@/lib/reports';
import { adminClient, currentUser } from '@/lib/supabase/server';
import PrintButton from './PrintButton';

export const metadata: Metadata = { title: 'Suburb report', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Report({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/signin?next=/dashboard/reports/${id}`);
  const { data: r } = await adminClient().from('suburb_reports').select('id, data, area_slug').eq('id', id).maybeSingle();
  if (!r) notFound();
  let allowed = isAdminEmail(user.email);
  if (!allowed) {
    const mine = await myManagers(user.id);
    const { data: prefs } = await adminClient().from('managers').select('id, report_follow').in('id', mine.map((m) => m.id));
    for (const m of mine) {
      const { plan, rows } = await reportsFor(m.id, ((prefs || []).find((p) => p.id === m.id)?.report_follow as string[]) || []);
      if (plan !== 'free' && rows.some((x) => x.id === r.id)) { allowed = true; break; }
    }
  }
  if (!allowed) redirect('/dashboard/reports');
  return (
    <main style={{ maxWidth: 920, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/dashboard/reports" className="hint">← All reports</Link>
        <PrintButton />
      </div>
      <SuburbReport r={r.data as ReportData} />
    </main>
  );
}
