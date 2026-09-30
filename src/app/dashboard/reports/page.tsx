import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ProInterest from '@/app/dashboard/ProInterest';
import { myManagers } from '@/lib/managers';
import { planName, PRO_FOLLOW_LIMIT, PRO_PRICE } from '@/lib/pro';
import { allRegions, periodLabel, reportsFor } from '@/lib/reports';
import { adminClient, currentUser } from '@/lib/supabase/server';
import { setFollow } from './actions';

export const metadata: Metadata = { title: 'Regional reports', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Reports() {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/dashboard/reports');
  const managers = await myManagers(user.id);
  if (!managers.length) redirect('/dashboard');
  const { data: prefs } = await adminClient().from('managers').select('id, report_follow').in('id', managers.map((m) => m.id)); // needs 014
  const follows = new Map((prefs || []).map((p) => [p.id, (p.report_follow as string[]) || []]));
  const allAreas = (await allRegions()).map((r) => ({ slug: r.slug, label: r.label }));

  return (
    <main style={{ maxWidth: 920, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      <Link href="/dashboard" className="hint">← Dashboard</Link>
      <div>
        <span className="label">Regional reports</span>
        <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: 0 }}>Market reports for your regions</h1>
        <p className="hint" style={{ margin: '4px 0 0' }}>New reports come out at the start of each quarter, with a breakdown by suburb. Every past report stays here.</p>
      </div>
      {await Promise.all(managers.map(async (m) => {
        const follow = follows.get(m.id) || [];
        const { plan, rows } = await reportsFor(m.id, follow);
        const paid = plan !== 'free';
        const byArea = new Map<string, typeof rows>();
        for (const r of rows) byArea.set(r.area_slug, [...(byArea.get(r.area_slug) || []), r]);
        const latest = rows.reduce<string | null>((x, r) => (!x || r.period > x ? r.period : x), null);
        return (
          <section key={m.id} style={{ display: 'grid', gap: 10 }}>
            {managers.length > 1 && <h2 style={{ fontSize: 22, margin: 0 }}>{m.name} <span className="hint" style={{ fontSize: 14 }}>{planName(plan)}</span></h2>}
            {!paid && (
              <div className="panel" style={{ display: 'grid', gap: 8, borderColor: 'var(--brand)' }}>
                <b>Regional reports are part of Pro ({PRO_PRICE})</b>
                <span className="hint">Each report covers nightly rates and revenue by bedrooms and by suburb, seasonality, how busy the market is, how manager fees compare and how many owners are asking for quotes. Here&apos;s what&apos;s ready for {m.name}&apos;s regions:</span>
                <ProInterest managerId={m.id} />
              </div>
            )}
            {!rows.length ? (
              <p className="panel" style={{ margin: 0 }}>No reports for your regions yet. Reports cover regions where you run homes that we track{plan === 'pro' ? ', plus any regions you follow below' : ''}. The next ones come out at the start of the quarter.</p>
            ) : (
              <div className="panel report-list">
                {[...byArea.entries()].map(([slug, reps]) => (
                  <div key={slug}>
                    <b>{reps[0].area_label}{reps[0].period === latest && Date.now() - new Date(reps[0].created_at).getTime() < 21 * 86400e3 ? <span className="chip" style={{ marginLeft: 8, fontSize: 12 }}>New</span> : null}</b>
                    <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'end' }}>
                      {reps.map((r) => paid ? <Link key={r.id} href={`/dashboard/reports/${r.id}`}>{periodLabel(r.period)}</Link> : <span key={r.id} className="hint">🔒 {periodLabel(r.period)}</span>)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {plan === 'pro' && (
              <details className="panel">
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Follow more regions ({follow.length} of {PRO_FOLLOW_LIMIT})</summary>
                <form action={setFollow} style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                  <input type="hidden" name="slug" value={m.slug} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 6 }}>
                    {allAreas.map((a) => <label key={a.slug} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}><input type="checkbox" name="area" value={a.slug} defaultChecked={follow.includes(a.slug)} />{a.label}</label>)}
                  </div>
                  <span className="hint">Pick up to {PRO_FOLLOW_LIMIT}. Enterprise includes every region.</span>
                  <div><button className="btn primary small">Save regions</button></div>
                </form>
              </details>
            )}
          </section>
        );
      }))}
    </main>
  );
}
