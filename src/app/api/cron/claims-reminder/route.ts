import { NextResponse, type NextRequest } from 'next/server';
import { sendEmail } from '@/lib/email';
import { adminClient } from '@/lib/supabase/server';

// Daily at 8am Sydney (see vercel.json). Emails hello@ about claims waiting on us for more than 24 hours,
// and claimants who haven't replied to an info request after 3 days.
export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return new NextResponse('Not found', { status: 404 });

  const db = adminClient();
  const dayAgo = new Date(Date.now() - 24 * 3600e3).toISOString();
  const threeDaysAgo = new Date(Date.now() - 72 * 3600e3).toISOString();
  const { data: ours } = await db.from('manager_claims').select('name, email, status, status_changed_at, managers(name)')
    .in('status', ['pending', 'info_received']).lt('status_changed_at', dayAgo).order('status_changed_at');
  const { data: theirs } = await db.from('manager_claims').select('name, email, status_changed_at, managers(name)')
    .eq('status', 'info_requested').lt('status_changed_at', threeDaysAgo).order('status_changed_at');
  if (!ours?.length && !theirs?.length) return NextResponse.json({ sent: false });

  const mgr = (c: { managers: unknown }) => ((Array.isArray(c.managers) ? c.managers[0] : c.managers) as { name: string } | null)?.name;
  const hrs = (d: string) => Math.round((Date.now() - new Date(d).getTime()) / 3600e3);
  const lines = [
    ...(ours?.length ? ['Waiting on us for more than 24 hours:', ...ours.map((c) => `- ${mgr(c)}: ${c.name} <${c.email}>, ${c.status === 'info_received' ? 'reply received' : 'new claim'} ${hrs(c.status_changed_at)} hours ago`), ''] : []),
    ...(theirs?.length ? ['No reply from the claimant after 3 days (consider a nudge or rejecting):', ...theirs.map((c) => `- ${mgr(c)}: ${c.name} <${c.email}>, asked ${hrs(c.status_changed_at)} hours ago`)] : []),
  ];
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
  await sendEmail({
    to: 'hello@cohostcompare.com',
    subject: `Reminder: ${(ours?.length || 0) + (theirs?.length || 0)} profile claim${(ours?.length || 0) + (theirs?.length || 0) === 1 ? '' : 's'} need attention`,
    text: lines.join('\n'),
    cta: { label: 'Review claims', url: `${base}/admin/claims` },
  });
  return NextResponse.json({ sent: true });
}
