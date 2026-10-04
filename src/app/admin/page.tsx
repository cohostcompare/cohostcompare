import type { Metadata } from 'next';
import Link from 'next/link';
import WeekBars from '@/components/WeekBars';
import { requireAdmin } from '@/lib/admin';
import { adminStats } from '@/lib/adminStats';
import { TEST_SLUG } from '@/lib/data';
import { DAILY_OVERDUE_HOURS, lastGoodRunHours, recentCronRuns } from '@/lib/reminders';
import { adminClient } from '@/lib/supabase/server';
import { setFeeStatus, setFlagStatus } from './actions';

export const metadata: Metadata = { title: 'Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Admin() {
  await requireAdmin('/admin');
  const db = adminClient();
  const count = async (table: string, f?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = db.from(table).select('*', { count: 'exact', head: true });
    if (f) q = f(q);
    return (await q).count ?? 0;
  };
  const isTest = (ms: { manager_slug: string }[] | null | undefined) => Boolean(ms?.length && ms.every((m) => m.manager_slug === TEST_SLUG));
  const [openClaims, allReqs, owners] = await Promise.all([
    count('manager_claims', (q) => q.in('status', ['pending', 'info_requested', 'info_received'])),
    db.from('quote_requests').select('id, quote_request_managers(manager_slug)').limit(20000).then((r) => r.data || []),
    count('waitlist'),
  ]);
  // Requests that only went to the internal test profile aren't counted or listed here (they're under Quote requests → Test requests).
  const requests = allReqs.filter((r) => !isTest(r.quote_request_managers as { manager_slug: string }[] | null)).length;
  const { data: recentAll } = await db.from('quote_requests').select('id, created_at, owner_name, owner_email, address, quote_request_managers(manager_name, manager_slug)').order('created_at', { ascending: false }).limit(40);
  const recent = (recentAll || []).filter((r) => !isTest(r.quote_request_managers as { manager_slug: string }[] | null)).slice(0, 20);

  // Needs SQL 012; empty until then.
  const [{ data: interest }, { data: errors }, { data: inbound }] = await Promise.all([
    db.from('interest_signups').select('id, kind, email, name, area, note, created_at').order('created_at', { ascending: false }).limit(25),
    db.from('error_events').select('sig, route, message, count, last_seen_at').order('last_seen_at', { ascending: false }).limit(10),
    db.from('inbound_emails').select('email_id, from_email, subject, outcome, created_at').order('created_at', { ascending: false }).limit(10),
  ]);
  const [{ data: fees }, { data: flags }] = await Promise.all([
    db.from('success_fees').select('id, amount, status, created_at, managers(name)').order('created_at', { ascending: false }).limit(30), // needs 015
    db.from('account_flags').select('id, user_id, reason, created_at, managers(name)').eq('status', 'open').order('created_at', { ascending: false }).limit(20),
  ]);
  const when = (d: string) => new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' });
  const [st, partnersPending, thanks, reviewsCount, unreached, partnerEdits, partnersNoLink, emailFails, emailFailRows, runs, lastGood] = await Promise.all([
    adminStats(),
    count('partners', (q) => q.eq('status', 'pending')).catch(() => 0),
    count('feedback', (q) => q.eq('reward_status', 'manual')).catch(() => 0),
    count('manager_reviews').catch(() => 0),
    import('@/lib/outreach').then((o) => o.unreachedThreads()).then((x) => x.length, () => 0),
    count('partners', (q) => q.eq('pending_review', true)).catch(() => 0), // 027
    db.from('partners').select('id').eq('status', 'approved').not('agreed_at', 'is', null).is('offer_url', null).is('website', null).then((r) => r.data?.length ?? 0, () => 0),
    count('email_failures', (q) => q.gte('created_at', new Date(Date.now() - 7 * 86400e3).toISOString())).catch(() => 0), // 027
    db.from('email_failures').select('id, created_at, to_domain, subject, status, detail').order('created_at', { ascending: false }).limit(20).then((r) => r.data || [], () => []),
    recentCronRuns(5).catch(() => []),
    lastGoodRunHours().catch(() => null),
  ]);
  const awaiting = (fees || []).filter((f) => f.status === 'awaiting_unlock').length;
  const openErrors = (errors || []).filter((e) => Date.now() - new Date(e.last_seen_at).getTime() < 7 * 86400e3).length;
  const runOverdue = lastGood == null || lastGood > DAILY_OVERDUE_HOURS;
  const lastRun = runs[0];

  type Item = { label: string; href: string; n?: number; ext?: boolean };
  const GROUPS: { title: string; tone: string; items: Item[] }[] = [
    { title: 'Managers', tone: 'g-teal', items: [{ label: 'Claims to review', href: '/admin/claims', n: openClaims }, { label: 'Managers and plans', href: '/admin/managers' }, { label: 'Manager outreach', href: '/admin/outreach' }, { label: 'Regional reports', href: '/admin/reports' }, { label: 'Listing data', href: '/admin/data' }] },
    { title: 'Owners', tone: 'g-blue', items: [{ label: 'All quote requests', href: '/admin/requests' }, { label: 'Owners', href: '/admin/owners' }, { label: 'Managers not told', href: '/admin/requests?f=unreached&d=30', n: unreached }, { label: 'Overdue quotes', href: '/admin/requests?f=overdue&d=90', n: st.overdueRequests }, { label: 'Owner reviews', href: '/admin/reviews', n: reviewsCount }, { label: 'Feedback', href: '/admin/feedback', n: thanks }] },
    { title: 'Growth', tone: 'g-amber', items: [{ label: 'Ad results', href: '/admin/ads' }, { label: 'Partners', href: '/admin/partners', n: partnersPending + partnerEdits }, { label: 'Setup guide sign-ups', href: '/admin/owners#guide' }, { label: 'Interest sign-ups', href: '#interest' }] },
    { title: 'Money', tone: 'g-green', items: [{ label: 'Revenue by month', href: '/admin/revenue' }, { label: 'Client confirmations', href: '#fees', n: awaiting }, { label: 'Shared logins', href: '#flags', n: (flags || []).length }, { label: 'Stripe dashboard', href: 'https://dashboard.stripe.com', ext: true }] },
    { title: 'System', tone: 'g-rose', items: [{ label: 'Site errors', href: '#errors', n: openErrors }, { label: 'Email failures (7 days)', href: '#email-failures', n: emailFails }, { label: 'Daily run', href: '#daily-run', n: runOverdue ? 1 : 0 }, { label: 'Email replies', href: '#inbound' }, { label: 'Vercel', href: 'https://vercel.com/dashboard', ext: true }, { label: 'Supabase', href: 'https://supabase.com/dashboard/project/hkntldmrckaosytpjakw', ext: true }] },
  ];
  const needs: [string, number, string][] = ([
    ['claims to review', openClaims, '/admin/claims'], ['unclaimed managers not told about a request', unreached, '/admin/requests?f=unreached&d=30'], ['quote requests with overdue managers', st.overdueRequests, '/admin/requests?f=overdue&d=90'], ['partner applications', partnersPending, '/admin/partners'], ['client confirmations waiting', awaiting, '#fees'],
    ['possible shared logins', (flags || []).length, '#flags'], ['Pro months to credit by hand', thanks, '/admin/feedback'], ['site errors this week', openErrors, '#errors'],
    ['partner offer edits to review', partnerEdits, '/admin/partners'], ['approved partners with no link to send owners to', partnersNoLink, '/admin/partners'], ['email failures this week', emailFails, '#email-failures'],
  ] as [string, number, string][]).filter(([, n]) => n > 0);
  const delta = ([a, b]: [number, number]) => { const d = a - b; return <span className={`wb-delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>{d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : '–'} vs last week</span>; };
  const conv = st.week.visitors[0] ? `${Math.round((st.week.requests[0] / st.week.visitors[0]) * 1000) / 10}%` : '–';
  const Sec = ({ id, tone, title, children }: { id: string; tone: string; title: string; children: React.ReactNode }) => (
    <section id={id} className={`panel admin-sec ${tone}`}><h2>{title}</h2>{children}</section>
  );

  return (
    <main className="admin" style={{ maxWidth: 1100, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 34, margin: 0 }}>Admin</h1>
        <span className="hint">Weeks are the last 7 days, compared with the 7 before. Your own visits and test requests aren&apos;t counted.</span>
      </div>

      <nav className="admin-nav" aria-label="Admin sections">
        {GROUPS.map((g) => (
          <div key={g.title} className={`admin-group ${g.tone}`}>
            <span className="admin-group-title">{g.title}</span>
            {g.items.map((it) => it.ext
              ? <a key={it.label} href={it.href} target="_blank" rel="noopener">{it.label} ↗</a>
              : <Link key={it.label} href={it.href}>{it.label}{it.n ? <span className="badge">{it.n}</span> : null}</Link>)}
          </div>
        ))}
      </nav>

      {(needs.length > 0 || runOverdue) && (
        <div className="admin-needs" role="status">
          <b>Needs you:</b>
          {runOverdue && <a href="#daily-run" style={{ color: '#B3261E' }}>Daily run overdue{lastGood == null ? ' (no successful run recorded)' : ` (last good run ${Math.round(lastGood)}h ago)`}</a>}
          {needs.map(([l, n, h]) => <Link key={l} href={h}>{n} {l}</Link>)}
        </div>
      )}
      <p id="daily-run" className="hint" style={{ margin: '-10px 0 0', scrollMarginTop: 90 }}>
        Last daily run: {lastRun ? <>{when(lastRun.started_at)} · {lastRun.finished_at ? (lastRun.ok ? <b style={{ color: 'var(--brand)' }}>ok</b> : <b style={{ color: '#B3261E' }}>problems</b>) : 'still running or cut short'}{lastRun.summary ? ` · ${lastRun.summary}` : ''}{lastRun.error ? <> · <span style={{ color: '#B3261E' }}>{lastRun.error.split('\n')[0]}</span></> : null}</> : 'none recorded yet (needs update 027; runs at 8am Sydney)'}.
      </p>

      <section className="kpis" aria-label="This week at a glance">
        <Link href="/admin/requests?d=7" className="kpi k-blue"><span>Quote requests</span><b>{st.week.requests[0]}</b>{delta(st.week.requests as [number, number])}<small>{st.week.contacted[0]} managers contacted</small></Link>
        <Link href="/admin/requests?f=accepted&d=7" className="kpi k-green"><span>Accepted quotes</span><b>{st.week.accepted[0]}</b>{delta(st.week.accepted as [number, number])}<small>introductions made</small></Link>
        <Link href="/admin/requests?f=overdue&d=90" className={`kpi ${st.overdueRequests ? 'k-alert' : 'k-teal'}`}><span>Overdue quotes</span><b>{st.overdueRequests}</b><small>{st.overdueManagers} manager{st.overdueManagers === 1 ? '' : 's'} 48h+ without replying</small></Link>
        <div className="kpi k-amber"><span>Visitors</span><b>{st.week.visitors[0]}</b>{delta(st.week.visitors as [number, number])}<small>{st.week.ads[0]} from ads · {st.week.google[0]} from Google search</small></div>
        <div className="kpi k-purple"><span>Visitor to request</span><b>{conv}</b><small>quote requests per visitor this week</small></div>
        <Link href="/admin/claims" className={`kpi ${openClaims ? 'k-alert' : 'k-teal'}`}><span>Claims to review</span><b>{openClaims}</b><small>{st.claimed} claimed of {st.published} published profiles</small></Link>
        <Link href="/admin/managers?plan=pro" className="kpi k-teal"><span>Pro managers</span><b>{st.payingPro + st.freePro}</b><small>{st.payingPro} paying (A${st.mrr.toLocaleString('en-AU')} a month) · {st.freePro} on free Pro</small></Link>
        <a href="#fees" className="kpi k-green"><span>Client confirmation fees</span><b>A${st.unlocks30.toLocaleString('en-AU')}</b><small>last 30 days: A$99 unlocks paid by Free-plan managers for clients beyond their 4 free a month</small></a>
        <Link href="/admin/feedback" className="kpi k-rose"><span>Recommend score</span><b>{st.nps ?? '–'}</b><small>{st.npsCount ? `from ${st.npsCount} feedback replies` : 'no feedback yet'}</small></Link>
      </section>

      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Last 12 weeks</h2>
        {!st.trackingReady && <p className="hint" style={{ margin: 0 }}>Visitor charts fill in once traffic tracking (update 017) has data.</p>}
        <div className="wb-grid">
          <WeekBars title="Visitors from Google Ads" values={st.series.ads} labels={st.labels} href="/admin/ads" />
          <WeekBars title="Visitors from Google search (free)" values={st.series.google} labels={st.labels} href="/admin/ads" />
          <WeekBars title="All other visitors" values={st.series.other} labels={st.labels} href="/admin/ads" note="Direct, social, email and other websites" />
          <WeekBars title="Quote requests" values={st.series.requests} labels={st.labels} href="/admin/requests?d=90" />
          <WeekBars title="Accepted quotes" values={st.series.accepted} labels={st.labels} href="/admin/requests?f=accepted&d=90" />
          <WeekBars title="New profile claims" values={st.series.claims} labels={st.labels} href="/admin/claims" />
        </div>
      </section>

      <Sec id="requests" tone="g-blue" title="Latest quote requests">
        <span className="hint">{requests.toLocaleString('en-AU')} in total · {owners} waitlist sign-ups · <Link href="/admin/requests">See all with filters →</Link></span>
        {!recent?.length ? <span className="hint">None yet.</span> : recent.map((r) => (
          <div key={r.id} className="row">
            <span><b>{r.owner_name}</b> <span className="hint">{r.owner_email} · {when(r.created_at)}</span></span>
            <span className="hint">{r.address} → {(r.quote_request_managers || []).map((m: { manager_name: string }) => m.manager_name).join(', ')}</span>
          </div>
        ))}
      </Sec>

      <div className="admin-two">
        <Sec id="fees" tone="g-green" title="Client confirmations (Free plan, A$ ex GST)">
          {!fees?.length ? <span className="hint">None yet.</span> : fees.map((f) => (
            <div key={f.id} className="row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span><b>{(f.managers as unknown as { name: string } | null)?.name}</b> · ${f.amount} · {f.status} <span className="hint">{when(f.created_at)}</span></span>
              {f.status === 'awaiting_unlock' && (
                <details className="req-del" style={{ marginLeft: 'auto' }}><summary className="hint" style={{ color: 'var(--brand)' }}>Waive and introduce</summary>
                  <form action={setFeeStatus} className="req-del-pop"><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="waived" />
                    <label className="hint" style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}><input type="checkbox" name="confirm" value="yes" required style={{ marginTop: 3 }} /> <span>Skip the A$99 fee and send the introduction email to the owner and manager now. It can&apos;t be undone.</span></label>
                    <button className="btn primary small" type="submit">Waive and introduce</button>
                  </form>
                </details>
              )}
            </div>
          ))}
        </Sec>
        <Sec id="flags" tone="g-green" title="Possible shared logins (Free plan)">
          {!flags?.length ? <span className="hint">None flagged.</span> : flags.map((f) => (
            <div key={f.id} className="row">
              <span><b>{(f.managers as unknown as { name: string } | null)?.name}</b> <span className="hint">{when(f.created_at)}</span></span>
              <span className="hint">{f.reason}</span>
              <span style={{ display: 'flex', gap: 12 }}>
                <form action={setFlagStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="ok" /><button className="linkish">Looks fine</button></form>
                <form action={setFlagStatus}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="status" value="actioned" /><button className="linkish">Contacted them</button></form>
              </span>
            </div>
          ))}
        </Sec>
      </div>

      <Sec id="interest" tone="g-amber" title="Interest sign-ups (Pro, Enterprise, partners)">
        {!interest?.length ? <span className="hint">None yet.</span> : interest.map((r) => (
          <div key={r.id} className="row">
            <span><b>{r.kind === 'pro' ? 'Pro' : r.kind === 'report' ? 'Report' : r.kind === 'enterprise' ? 'Enterprise' : 'Partner'}</b> {r.name ? `${r.name} · ` : ''}{r.email}{r.area ? ` · ${r.area}` : ''} <span className="hint">{when(r.created_at)}</span></span>
            {r.note && <span className="hint">{r.note}</span>}
          </div>
        ))}
      </Sec>

      <div className="admin-two">
        <Sec id="errors" tone="g-rose" title="Recent site errors">
          {!errors?.length ? <span className="hint">None recorded.</span> : errors.map((r) => (
            <div key={r.sig} className="row"><span><b>{r.route}</b> × {r.count} <span className="hint">last {when(r.last_seen_at)}</span></span><span className="hint" style={{ overflowWrap: 'anywhere' }}>{r.message}</span></div>
          ))}
        </Sec>
        <Sec id="inbound" tone="g-rose" title="Email replies received">
          {!inbound?.length ? <span className="hint">None yet.</span> : inbound.map((r) => (
            <div key={r.email_id} className="row"><span>{r.from_email} · {r.subject}</span><span className="hint">{when(r.created_at)} · {r.outcome || 'processing'}</span></div>
          ))}
        </Sec>
      </div>

      <Sec id="email-failures" tone="g-rose" title={`Email failures (${emailFails} in 7 days)`}>
        <span className="hint">Emails Resend refused, couldn&apos;t deliver (bounced) or that were marked as spam (complained). Bounced and complained addresses are never emailed again. Needs update 027.</span>
        {!emailFailRows.length ? <span className="hint">None recorded.</span> : emailFailRows.map((r) => (
          <div key={r.id} className="row"><span><b>{r.status}</b> · {r.subject} <span className="hint">→ {r.to_domain || '?'} · {when(r.created_at)}</span></span>{r.detail && <span className="hint" style={{ overflowWrap: 'anywhere' }}>{r.detail.slice(0, 240)}</span>}</div>
        ))}
      </Sec>
    </main>
  );
}
