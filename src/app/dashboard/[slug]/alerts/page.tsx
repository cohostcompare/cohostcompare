import type { Metadata } from 'next';
import Link from 'next/link';
import { requireManager } from '@/lib/managers';
import { isPro, plansFor, PRO_PRICE } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';
import { AlertsForm } from './Forms';

export const metadata: Metadata = { title: 'Alerts', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Alerts({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/alerts`);
  const pro = isPro((await plansFor([m.id])).get(m.id));
  const { data } = await adminClient().from('managers').select('sms_mobile, sms_enabled, report_emails').eq('id', m.id).maybeSingle(); // needs 014
  return (
    <main style={{ maxWidth: 640, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/dashboard" className="hint">← Dashboard</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,36px)', margin: 0 }}>Alerts for {m.name}</h1>
      <p style={{ margin: 0 }}>Quote requests always arrive by email and on your dashboard. {pro ? 'With Pro you can also get a text message, so you can reply first.' : <>Text message alerts are part of <Link href="/managers#pricing">Pro</Link> ({PRO_PRICE}).</>}</p>
      <AlertsForm slug={m.slug} mobile={data?.sms_mobile || ''} sms={Boolean(data?.sms_enabled)} reports={data?.report_emails ?? true} pro={pro} />
      <p className="hint" style={{ margin: 0 }}>We only text you about quote requests and accepted quotes. Texts don&apos;t include owners&apos; contact details.</p>
    </main>
  );
}
