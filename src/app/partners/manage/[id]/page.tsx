import type { Metadata } from 'next';
import { CATEGORIES, manageOk, type Partner } from '@/lib/partners';
import { adminClient } from '@/lib/supabase/server';
import PartnerForm from '../../PartnerForm';

export const metadata: Metadata = { title: 'Your partner offer', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const STATUS: Record<Partner['status'], string> = {
  pending: 'We’re reviewing your offer. We’ll email you once it’s approved.',
  approved: 'Approved. Your offer shows to owners whenever partner offers are live on CoHostCompare.',
  hidden: 'Your offer is paused and not showing to owners. Email hello@cohostcompare.com if you’d like it back.',
  rejected: 'We aren’t able to list this offer at the moment. Email hello@cohostcompare.com if you’d like to talk about it.',
};

export default async function Manage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const { id } = await params;
  const { s = '' } = await searchParams;
  const ok = /^[0-9a-f-]{36}$/i.test(id) && manageOk(id, s);
  const db = ok ? adminClient() : null;
  const { data: p } = db ? await db.from('partners').select('*').eq('id', id).maybeSingle() : { data: null };
  if (!p) return <main style={{ maxWidth: 560, paddingBlock: '48px 80px' }}><h1 style={{ fontSize: 30 }}>Link not valid</h1><p>This partner link isn&apos;t valid. Email hello@cohostcompare.com and we&apos;ll send you a new one.</p></main>;
  if (!db) return null;
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();
  const [{ count: d30 }, { count: all }] = await Promise.all([
    db.from('partner_clicks').select('id', { count: 'exact', head: true }).eq('partner_id', id).gte('created_at', since),
    db.from('partner_clicks').select('id', { count: 'exact', head: true }).eq('partner_id', id),
  ]);
  const partner = p as Partner;
  return (
    <main style={{ maxWidth: 760, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <span className="label" style={{ color: 'var(--brand)' }}>Partner page</span>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: 0 }}>{partner.name}</h1>
      <p className="panel" style={{ margin: 0, background: partner.status === 'approved' ? 'var(--tint)' : undefined }}><b>Status:</b> {STATUS[partner.status]}</p>
      <section className="dash-stats" aria-label="Clicks">
        <div className="panel"><b>{d30 ?? 0}</b><span>owners clicked your offer in the last 30 days</span></div>
        <div className="panel"><b>{all ?? 0}</b><span>clicks in total</span></div>
      </section>
      <PartnerForm categories={CATEGORIES} p={partner} manage={{ id, s }} />
      <p className="hint" style={{ margin: 0 }}>Keep this page&apos;s link private: anyone with it can edit your offer. To change your business name or email, contact hello@cohostcompare.com.</p>
    </main>
  );
}
