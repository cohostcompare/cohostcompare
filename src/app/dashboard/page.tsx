import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { myManagers } from '@/lib/managers';
import { eventTotals, searchDemand } from '@/lib/events';
import RequestList from '@/components/RequestList';
import { managerThreads, todoLabel } from '@/lib/todo';
import { planName, planOf, plansFor, PRO_FEATURES, PRO_PRICE, SUCCESS_FEE_TEXT } from '@/lib/pro';
import { adminClient, currentUser } from '@/lib/supabase/server';
import ProInterest from './ProInterest';
import { manageBilling, startPro } from './billing/actions';
import { stripeOn } from '@/lib/stripe';

export const metadata: Metadata = { title: 'Manager portal', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ claimed?: string; pro?: string; billing?: string }>;


export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const user = await currentUser();
  if (!user) redirect('/signin?next=/dashboard');
  const sp = await searchParams;
  const managers = await myManagers(user.id);
  if (managers.length) { const { recordActivity } = await import('@/lib/activity'); await recordActivity(user.id); }

  if (!managers.length) {
    // A manager who signed in from an outreach email lands here with nothing to claim yet: find their profile by email domain.
    const domain = (user.email || '').split('@')[1]?.toLowerCase() || '';
    const generic = /^(gmail|outlook|hotmail|yahoo|icloud|live|bigpond|optusnet|me|protonmail|proton)\./i.test(domain);
    const { data: likely } = domain && !generic ? await adminClient().from('managers').select('slug, name, website').eq('published', true).eq('claimed', false).ilike('website', `%${domain}%`).limit(3) : { data: [] };
    const matches = (likely || []).filter((m) => { try { return new URL(m.website || '').hostname.replace(/^www\./, '') === domain; } catch { return false; } });
    return (
      <main style={{ maxWidth: 640, paddingBlock: '16px 64px', display: 'grid', gap: 14 }}>
        <span className="label">Manager portal</span>
        <h1 style={{ fontSize: 34, margin: 0 }}>{matches.length ? 'Is this your business?' : 'You don’t manage a profile yet'}</h1>
        {matches.map((m) => (
          <div key={m.slug} className="panel" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', borderColor: 'var(--brand)' }}>
            <span><b>{m.name}</b> <span className="hint">· matches your email domain, so claiming is approved instantly</span></span>
            <Link className="btn primary" href={`/claim/${m.slug}`}>Claim {m.name}</Link>
          </div>
        ))}
        <div className="panel" style={{ display: 'grid', gap: 8 }}>
          <p style={{ margin: 0 }}>Search for your business by an address you manage near, open your profile and click <b>Claim this page</b>. If you use an email address on your business&apos;s own domain, you&apos;re approved instantly.</p>
          <p style={{ margin: 0 }}>Not listed yet? <Link href="/managers">Tell us about your business</Link>.</p>
        </div>
      </main>
    );
  }

  const db = adminClient();
  const threads = await managerThreads(managers.map((m) => m.slug), 300);
  const insight = new Map<string, { searches: number; peers: number; reports: number }>();
  for (const m of managers) {
    const demand = await searchDemand(m.postcodes || [], 30);
    const { count: peers } = m.postcodes?.length ? await db.from('managers').select('id', { count: 'exact', head: true }).eq('published', true).neq('id', m.id).overlaps('postcodes', m.postcodes) : { count: 0 };
    const { count: reports } = await db.from('suburb_reports').select('id', { count: 'exact', head: true }).contains('manager_ids', [m.id]);
    insight.set(m.id, { searches: [...demand.values()].reduce((a, x) => a + x.count, 0), peers: peers ?? 0, reports: reports ?? 0 });
  }
  const events = await eventTotals(managers.map((m) => m.id));
  const ownerReviews = await (await import('@/lib/reviews')).reviewSummaries(managers.map((m) => m.slug));
  const { data: abns } = await db.from('managers').select('id, abn_verified_at').in('id', managers.map((m) => m.id)); // needs 009
  const verified = new Set((abns || []).filter((a) => a.abn_verified_at).map((a) => a.id));
  const since = Date.now() - 30 * 86400e3;
  const pro = await plansFor(managers.map((m) => m.id));
  const { data: billRows } = await db.from('managers').select('id, stripe_customer_id, stripe_subscription_id').in('id', managers.map((m) => m.id)); // needs 016
  const bill = new Map((billRows || []).map((b) => [b.id, b]));
  const billing = stripeOn();
  const { data: freshReports } = await db.from('suburb_reports').select('id, area_label, manager_ids').overlaps('manager_ids', managers.map((m) => m.id)).gte('created_at', new Date(Date.now() - 21 * 86400e3).toISOString()); // needs 014

  return (
    <main style={{ maxWidth: 920, paddingBlock: '16px 64px', display: 'grid', gap: 22 }}>
      {sp.pro && <div className="panel" style={{ background: 'var(--tint)' }}><b>Welcome to Pro.</b> It can take a minute to show here. Manage your card and invoices under Billing.</div>}
      {sp.billing === 'soon' && <div className="panel">Card payments are being switched on. Please try again shortly, or email hello@cohostcompare.com.</div>}
      {sp.claimed && <div className="panel" style={{ background: 'var(--tint)' }}><b>You&apos;re in.</b> Start by adding your fees, services and logo so owners can compare you properly.</div>}
      {managers.map((m) => {
        const mine = threads.filter((t) => t.manager_slug === m.slug);
        const todo = mine.filter((t) => t.todo.length);
        const g = (m.gated || {}) as Record<string, unknown>;
        const checks: [string, boolean][] = [
          ['A short tagline', Boolean(m.tagline)], ['An about section (a few sentences)', (m.about || '').length >= 80],
          ['Your management fee', m.fee_min != null], ['Minimum term and notice period', g.minTermMonths != null && g.noticeDays != null],
          ['The services you offer', m.services.length > 0], ['Every platform you list on', (m.platforms || []).length > 1],
          ['Your logo', Boolean(m.logo_url)], ['At least 3 photos of homes you manage', m.photos.length >= 3],
          ['A phone number for owners who accept your quote', Boolean(m.contact_phone)], ['Your ABN, for the Verified business badge', verified.has(m.id)],
          ['Which properties you take on (minimum availability, types, bedrooms)', Boolean(m.requirements && Object.keys(m.requirements).length)],
        ];
        const score = Math.round((checks.filter(([, ok]) => ok).length / checks.length) * 100);
        const ev = events.get(m.id) || { view: 0, search: 0 };
        const recent = threads.filter((t) => t.manager_slug === m.slug && new Date(t.created_at).getTime() >= since).length;
        return (
          <section key={m.id} style={{ display: 'grid', gap: 12 }}>
            <div className="dash-head">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <span className="label">Manager portal</span>
                  <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: 0 }}>{m.name}</h1>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link className="btn primary" href={`/dashboard/${m.slug}/edit`}>Edit profile</Link>
                  <Link className="btn secondary" href={`/dashboard/${m.slug}/requirements`}>Properties you take on</Link>
                </div>
              </div>
              <nav className="dash-actions" aria-label="Portal sections">
                <Link className="dash-tab" href={`/managers/${m.slug}`}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>Profile</Link>
                <Link className="dash-tab" href="/dashboard/requests"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H7l-3 3V4Z" /></svg>Requests</Link>
                <Link className="dash-tab" href={`/dashboard/${m.slug}/insights`}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>Insights</Link>
                <Link className={`dash-tab${planOf(pro.get(m.id)) === 'free' ? ' locked' : ''}`} href="/dashboard/reports" title={planOf(pro.get(m.id)) === 'free' ? 'Regional reports are part of Pro' : undefined}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l5 5v13H6V3Z" /><path d="M14 3v6h6M9 14h6M9 17h6" /></svg>Reports</Link>
                <span className="sep" aria-hidden="true" />
                <Link className="dash-tab" href={`/dashboard/${m.slug}/alerts`}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>Alerts</Link>
                <Link className="dash-tab" href={`/dashboard/${m.slug}/team`}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3" /></svg>Team</Link>
                <Link className={`dash-tab${planOf(pro.get(m.id)) === 'free' ? ' locked' : ''}`} href={`/dashboard/${m.slug}/templates`} title={planOf(pro.get(m.id)) === 'free' ? 'Quote templates are part of Pro' : undefined}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true">{planOf(pro.get(m.id)) === 'free' ? <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></> : <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5" /></>}</svg>Templates</Link>
                {ownerReviews.has(m.slug) && <Link className="dash-tab" href={`/dashboard/${m.slug}/reviews`}><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg>Reviews ({ownerReviews.get(m.slug)!.count})</Link>}
                {bill.get(m.id)?.stripe_customer_id && (
                  <form action={manageBilling} style={{ display: 'contents' }}><input type="hidden" name="slug" value={m.slug} /><button className="dash-tab" type="submit"><svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>Billing</button></form>
                )}
              </nav>
            </div>
            {todo.length > 0 && (
              <section className="panel todo-panel" aria-label="Needs your attention">
                <h2>Needs your attention ({todo.length})</h2>
                {todo.slice(0, 8).map((t) => <Link key={t.id} href={`/dashboard/requests/${t.id}`}>{todoLabel(t)}<span className="go">Open →</span></Link>)}
                {todo.length > 8 && <Link href="/dashboard/requests?f=needs">See all {todo.length}<span className="go">→</span></Link>}
              </section>
            )}
            <div className="dash-stats colour">
              <div className="panel" style={{ '--c': '#0F5E57' } as React.CSSProperties}><b>{ev.search.toLocaleString('en-AU')}</b><span>times you appeared in owner searches</span></div>
              <div className="panel" style={{ '--c': '#2B6CB0' } as React.CSSProperties}><b>{ev.view.toLocaleString('en-AU')}</b><span>profile views</span></div>
              <Link className="panel stat-link" href="/dashboard/requests?f=all" style={{ '--c': '#B7791F' } as React.CSSProperties}><b>{recent}</b><span>quote requests →</span></Link>
              <Link className="panel stat-link" href={`/dashboard/${m.slug}/edit`} style={{ '--c': score === 100 ? '#2F855A' : '#9B2C6F' } as React.CSSProperties}><b>{score}%</b><span>profile complete{score < 100 ? ' →' : ''}</span></Link>
            </div>
            <p className="hint" style={{ margin: '-4px 0 0' }}>Last 30 days. Views from you and your team aren&apos;t counted.</p>
            {(() => {
              const fresh = (freshReports || []).filter((r) => (r.manager_ids as string[]).includes(m.id));
              return fresh.length ? (
                <Link href="/dashboard/reports" className="panel" style={{ display: 'block', background: 'var(--tint)', color: 'inherit', textDecoration: 'none' }}>
                  <b>New regional report{fresh.length > 1 ? 's' : ''}:</b> {fresh.slice(0, 3).map((r) => r.area_label).join(', ')}{fresh.length > 3 ? ` and ${fresh.length - 3} more` : ''} →
                </Link>
              ) : null;
            })()}
            {score < 100 && (
              <div className="panel" style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <b>Finish your profile</b>
                  <Link className="btn secondary small" href={`/dashboard/${m.slug}/edit`}>Edit profile</Link>
                </div>
                <div className="meter" aria-hidden="true"><span style={{ width: `${score}%` }} /></div>
                <p className="hint" style={{ margin: 0 }}>Owners compare fees, terms and photos first, so complete profiles get asked for more quotes.</p>
                <ul className="ticks">{checks.map(([label, ok]) => <li key={label} className={ok ? 'done' : ''}><span className="sr-only">{ok ? 'Done: ' : 'To do: '}</span>{label}</li>)}</ul>
              </div>
            )}
            {(() => {
              const p = pro.get(m.id);
              const plan = planOf(p);
              const ins = insight.get(m.id)!;
              const card = (
                <Link href={`/dashboard/${m.slug}/insights`} className="insight-card">
                  <div>
                    <span className="eyebrow">{plan === 'free' ? 'Pro insights' : 'Your insights'}</span>
                    <h2>{plan === 'free' ? 'See what owners near you are searching for' : 'How you stack up against local managers'}</h2>
                    <p>Owner demand in your postcodes, how your fees and ratings compare with other managers covering the same areas, and your quote win rate.</p>
                    <span className="go">{plan === 'free' ? 'See what’s inside →' : 'Open insights →'}</span>
                  </div>
                  <div className="peek">
                    <div className={plan === 'free' ? 'locked' : ''}>{plan === 'free' ? <><b aria-hidden="true">000</b><span className="sr-only">Available with Pro: </span></> : <b>{ins.searches}</b>}<span>owner searches in your postcodes, last 30 days</span></div>
                    <div className={plan === 'free' ? 'locked' : ''}>{plan === 'free' ? <><b aria-hidden="true">00</b><span className="sr-only">Available with Pro: </span></> : <b>{ins.peers}</b>}<span>other managers covering your postcodes</span></div>
                    <div><b>{ins.reports}</b><span>market report{ins.reports === 1 ? '' : 's'} for your regions</span></div>
                  </div>
                </Link>
              );
              if (plan !== 'free') return (
                <>
                {card}
                <div className="panel" style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', borderColor: 'var(--brand)' }}>
                  <span><b>{planName(plan)}{p?.pro_note === 'founding' ? ' (founding manager)' : ''}</b>{p?.pro_until ? `${p.pro_note === 'founding' ? ' is free for you' : ''} until ${new Date(p.pro_until).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}: insights, market reports, SMS alerts, quote templates and more photos.{bill.get(m.id)?.stripe_subscription_id && p?.pro_note !== 'ending' && p?.pro_until && new Date(p.pro_until).getTime() > Date.now() ? <> <span className="hint">You&apos;re subscribed: first charge on {new Date(p.pro_until).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.</span></> : null}</span>
                  <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {bill.get(m.id)?.stripe_subscription_id ? null : billing && p?.pro_note === 'founding' ? (
                      <form action={startPro}><input type="hidden" name="slug" value={m.slug} /><button className="btn secondary small">Keep Pro after the free months</button></form>
                    ) : null}
                  </span>
                </div>
                </>
              );
              return (
                <>
                {card}
                <div className="panel" style={{ display: 'grid', gap: 8 }}>
                  <b>CoHostCompare Pro (optional)</b>
                  <span className="hint">Your profile, quote requests and replies stay free, including 4 accepted clients a month, then {SUCCESS_FEE_TEXT} each. Pro ({PRO_PRICE}) includes unlimited clients and adds {PRO_FEATURES.filter((f) => f.title !== 'Unlimited clients').map((f) => f.title.toLowerCase()).join(', ')}. It never changes where you appear or what owners see.</span>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>{billing ? <form action={startPro}><input type="hidden" name="slug" value={m.slug} /><button className="btn primary small">Start Pro</button></form> : <ProInterest managerId={m.id} />}<Link href="/managers#pricing">See plans</Link></div>
                </div>
                </>
              );
            })()}
            <div id="requests" style={{ display: 'grid', gap: 8, scrollMarginTop: 96 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                <h2 style={{ fontSize: 22, margin: 0 }}>Quote requests</h2>
                <Link href="/dashboard/requests">Open full list →</Link>
              </div>
              <RequestList rows={mine} limit={12} active={todo.length ? 'needs' : 'all'} base="/dashboard/requests" />
            </div>
          </section>
        );
      })}
    </main>
  );
}
