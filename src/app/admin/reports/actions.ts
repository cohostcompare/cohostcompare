'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';

/** Makes any missing reports for this quarter (a few per run) and emails managers about new ones. */
export async function generateReports() {
  await requireAdmin('/admin/reports');
  const { runReports } = await import('@/lib/reports');
  const r = await runReports();
  revalidatePath('/admin/reports');
  redirect(`/admin/reports?done=${encodeURIComponent(`Made ${r.made} report${r.made === 1 ? '' : 's'}, emailed ${r.notified} manager${r.notified === 1 ? '' : 's'}.${'remaining' in r && r.remaining ? ` ${r.remaining} regions still to do: run it again.` : ''}`)}`);
}
