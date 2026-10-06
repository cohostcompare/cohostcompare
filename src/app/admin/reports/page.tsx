import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNotice from '@/components/AdminNotice';
import { requireAdmin } from '@/lib/admin';
import { allRegions, periodLabel, periodOf } from '@/lib/reports';
import { adminClient } from '@/lib/supabase/server';
import { generateReports } from './actions';

export const metadata: Metadata = { title: 'Regional reports', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Row = { id: string; area_slug: string; area_label: string; period: string; created_at: string; notified_at: string | null; manager_ids: string[] | null; homes: number | null };

/** Every quarterly regional report, newest quarter first. Made by the daily run (8 a day) or the button here. */
export default async function AdminReports({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  await requireAdmin('/admin/reports');
  const sp = await searchParams;
  const { data, error } = await adminClient().from('suburb_reports').select('id, area_slug, area_label, period, created_at, notified_at, manager_ids, homes:data->market->homes').order('period', { ascending: false }).order('area_label').limit(1000);
  const rows = (data || []) as unknown as Row[];
  const regions = await allRegions();
  const current = periodOf();
  const thisQ = new Set(rows.filter((r) => r.period === current).map((r) => r.area_slug));
  const missing = regions.filter((r) => !thisQ.has(r.slug));
  const periods = [...new Set(rows.map((r) => r.period))];
  const when = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Sydney' });

  return (
    <main className="admin" style={{ maxWidth: 1000, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href="/admin" className="hint">← Admin</Link>
      <div>
        <h1 style={{ fontSize: 34, margin: 0 }}>Regional reports</h1>
        <p className="hint" style={{ margin: '4px 0 0' }}>One report per region each quarter, with a by-suburb table. The daily run makes up to 8 a day and emails the managers who get them (Pro and Enterprise can open them). Regions with fewer than 10 homes are made but not sent.</p>
      </div>
      <AdminNotice done={sp.done} />
      {error && <p className="panel" style={{ margin: 0 }}>Couldn&apos;t load reports: {error.message}</p>}
      <section className="kpis">
        <div className="kpi k-blue"><span>{periodLabel(current)}</span><b>{thisQ.size} of {regions.length}</b><small>regions with a report this quarter</small></div>
        <div className="kpi k-teal"><span>All reports</span><b>{rows.length}</b><small>across {periods.length} quarter{periods.length === 1 ? '' : 's'}</small></div>
      </section>
      {missing.length > 0 && (
        <form action={generateReports} className="panel" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <span><b>{missing.length} region{missing.length === 1 ? '' : 's'} still to do this quarter:</b> <span className="hint">{missing.slice(0, 8).map((r) => r.label).join(', ')}{missing.length > 8 ? '…' : ''}</span></span>
          <label className="hint" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" name="confirm" value="yes" required /> Make up to 8 reports now and email the managers who get them.</label>
          <button className="btn primary small" type="submit">Make them now</button>
        </form>
      )}
      {periods.map((p) => (
        <section key={p} style={{ display: 'grid', gap: 8 }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>{periodLabel(p)}</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label={`Reports for ${periodLabel(p)}`}>
            <table className="data-table">
              <thead><tr><th scope="col">Region</th><th scope="col">Homes</th><th scope="col">Managers</th><th scope="col">Made</th><th scope="col">Emailed</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
              <tbody>{rows.filter((r) => r.period === p).map((r) => (
                <tr key={r.id}>
                  <th scope="row">{r.area_label}</th>
                  <td>{r.homes ?? '–'}</td>
                  <td>{(r.manager_ids || []).length}</td>
                  <td>{when(r.created_at)}</td>
                  <td>{r.notified_at ? when(r.notified_at) : 'Waiting'}</td>
                  <td><Link href={`/dashboard/reports/${r.id}`}>Open →</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ))}
      {!rows.length && <p className="panel" style={{ margin: 0 }}>No reports yet. Use &ldquo;Make them now&rdquo; or wait for the daily run.</p>}
    </main>
  );
}
