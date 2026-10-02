import type { Metadata } from 'next';
import Link from 'next/link';
import WeekBars from '@/components/WeekBars';
import { requireAdmin } from '@/lib/admin';
import { TEST_SLUG } from '@/lib/data';
import { PRO_CENTS } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Revenue', robots: { index: false } };
export const dynamic = 'force-dynamic';

/*
 Money in, by month (Sydney time), ex GST:
 - client confirmations: A$99 unlocks actually paid (success_fees.status = 'paid')
 - Pro: paying subscribers now x the monthly price (a snapshot, not history; Stripe has the exact invoices)
 Partner referral fees are agreed and invoiced by hand, so they aren't tracked here yet.
*/
const money = (n: number) => `A$${Math.round(n).toLocaleString('en-AU')}`;

export default async function Revenue() {
  await requireAdmin('/admin/revenue');
  const db = adminClient();
  const [{ data: fees }, { data: ms }] = await Promise.all([
    db.from('success_fees').select('amount, status, updated_at, created_at').eq('status', 'paid').limit(10000),
    db.from('managers').select('slug, plan, pro_until, pro_note, stripe_subscription_id').eq('claimed', true).neq('slug', TEST_SLUG).limit(5000),
  ]);
  const months: string[] = [];
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); }
  const key = (iso: string) => { const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Australia/Sydney' })); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const unlocks = new Map(months.map((m) => [m, { n: 0, amt: 0 }]));
  for (const f of fees || []) { const k = key(f.updated_at || f.created_at); const x = unlocks.get(k); if (x) { x.n++; x.amt += Number(f.amount || 0); } }
  const paying = (ms || []).filter((m) => m.stripe_subscription_id).length;
  const live = (d?: string | null) => Boolean(d && new Date(d).getTime() > Date.now());
  const freePro = (ms || []).filter((m) => !m.stripe_subscription_id && (live(m.pro_until) || ((m.plan === 'pro' || m.plan === 'enterprise') && !m.pro_until))).length;
  const founding = (ms || []).filter((m) => m.pro_note === 'founding' && live(m.pro_until)).length;
  const mrr = paying * PRO_CENTS / 100;
  const label = (m: string) => new Date(`${m}-15`).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
  const thisMonth = unlocks.get(months[11])!;
  const allTime = (fees || []).reduce((s, f) => s + Number(f.amount || 0), 0);
  return (
    <main className="admin" style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <h1 style={{ fontSize: 34, margin: 0 }}>Revenue</h1>
      <section className="kpis">
        <div className="kpi k-green"><span>This month so far</span><b>{money(thisMonth.amt + mrr)}</b><small>{money(thisMonth.amt)} client confirmations + {money(mrr)} Pro</small></div>
        <div className="kpi k-teal"><span>Pro: monthly recurring</span><b>{money(mrr)}</b><small>{paying} paying · {freePro} on free Pro ({founding} founding)</small></div>
        <div className="kpi k-blue"><span>Client confirmations</span><b>{thisMonth.n}</b><small>paid this month ({money(thisMonth.amt)})</small></div>
        <div className="kpi k-purple"><span>All time</span><b>{money(allTime)}</b><small>client confirmations paid, ex GST</small></div>
      </section>
      <div className="wb-grid">
        <WeekBars title="Client confirmation fees by month (A$)" values={months.map((m) => Math.round(unlocks.get(m)!.amt))} labels={months.map(label)} />
        <WeekBars title="Client confirmations by month" values={months.map((m) => unlocks.get(m)!.n)} labels={months.map(label)} />
      </div>
      <div className="cmp-wrap">
        <table className="cmp" style={{ minWidth: 560 }}>
          <thead><tr>{['Month', 'Client confirmations', 'Amount'].map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
          <tbody>{[...months].reverse().map((m) => <tr key={m}><th scope="row" style={{ position: 'static' }}>{new Date(`${m}-15`).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</th><td>{unlocks.get(m)!.n}</td><td>{money(unlocks.get(m)!.amt)}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="hint" style={{ margin: 0 }}>Amounts are ex GST. Pro is a snapshot of paying subscribers today × A${PRO_CENTS / 100}; Stripe has the exact invoices, refunds and fees (<a href="https://dashboard.stripe.com" target="_blank" rel="noopener">open Stripe</a>). Partner referral fees are invoiced by hand and aren&apos;t included yet. The charts&apos; &ldquo;this week&rdquo; label means this month here.</p>
    </main>
  );
}
