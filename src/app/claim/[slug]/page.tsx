import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EmailSignIn from '@/components/EmailSignIn';
import { emailMatchesSite, siteDomain } from '@/lib/claims';
import { managerForClaim, publicManager } from '@/lib/data';
import { adminClient, currentUser } from '@/lib/supabase/server';
import ClaimForm from './ClaimForm';
import { SUCCESS_FEE_TEXT } from '@/lib/pro';

export const metadata: Metadata = { title: 'Claim your profile', robots: { index: false } };

type P = Promise<{ slug: string }>;

export default async function Claim({ params }: { params: P }) {
  const { slug } = await params;
  const m = await managerForClaim(slug);
  if (!m) notFound();
  const user = await currentUser();
  const domain = siteDomain(m.website);
  const pub = await publicManager(slug);
  const { count: waiting } = await adminClient().from('quote_request_managers').select('id', { count: 'exact', head: true }).eq('manager_slug', slug).in('status', ['sent', 'viewed']);
  const existing = user ? (await adminClient().from('manager_claims').select('status').eq('manager_id', m.id).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()).data : null;

  return (
    <main className="claim" style={{ paddingBlock: '16px 64px' }}>
      <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>
      <Link href={`/managers/${m.slug}`} className="hint">← Back to {m.name}</Link>
      <div style={{ display: 'grid', gap: 8 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>Free for managers</span>
        <h1 style={{ fontSize: 'clamp(28px,4.4vw,40px)', margin: 0 }}>Claim {m.name}</h1>
        <p className="lede" style={{ margin: 0 }}>Owners near your homes can already find {m.name} here. Claiming lets you tell your side: your fees, services and photos, and reply to owners who ask you for a quote.</p>
      </div>

      {!!waiting && !m.claimed && (
        <div className="panel" style={{ borderColor: 'var(--signal)', background: 'var(--surface)' }}>
          <b>{waiting === 1 ? 'An owner is' : `${waiting} owners are`} waiting for a quote from {m.name}.</b> Claim your profile to see the property details and reply.
        </div>
      )}
      {pub && (
        <section className="panel" style={{ display: 'grid', gap: 10 }} aria-label="How owners see you now">
          <span className="label">How owners see you today</span>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="av" aria-hidden="true" style={pub.tile ? { background: pub.tile.bg, color: pub.tile.fg } : undefined}>{pub.initials}</div>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 18 }}>{pub.name}</b>
              <div className="meta" style={{ margin: '2px 0 0' }}>
                {pub.propertyCount ? <span><b>{pub.propertyCount}</b> Airbnb homes tracked</span> : <span>No listing figures yet</span>}
                {pub.avgRating != null && <span><b>{pub.avgRating.toFixed(2)} ★</b> guest rating</span>}
                <span>Fee: <b>{pub.feeMin != null ? `${pub.feeMin}${pub.feeMax && pub.feeMax !== pub.feeMin ? `–${pub.feeMax}` : ''}%` : 'on request'}</b></span>
              </div>
            </div>
          </div>
          <ul className="ticks">
            <li className={pub.feeMin != null ? 'done' : ''}>Your fees and contract terms, in the same format as everyone else</li>
            <li className={pub.logoUrl ? 'done' : ''}>Your logo and photos of homes you manage</li>
            <li>Every platform you use, not just Airbnb</li>
            <li>A &ldquo;Replies on CoHostCompare&rdquo; badge instead of &ldquo;Not yet on CoHostCompare&rdquo;</li>
            <li>Quote requests from owners, with the property details filled in</li>
            <li>A &ldquo;Verified business&rdquo; badge when your ABN checks out</li>
          </ul>
        </section>
      )}

      <section className="facts-grid">
        <div className="panel"><h3>What it costs</h3><p>Claiming, editing your profile, receiving quote requests and replying are free, with no lock-in. The Free plan includes 4 accepted clients a month, then {SUCCESS_FEE_TEXT} each. Claim by 31 January 2027 and you get <Link href="/managers#pricing">Pro</Link> free for three months, with unlimited clients.</p></div>
        <div className="panel"><h3>Where the figures come from</h3><p>Public listing data and your own website, measured the same way for every manager. <Link href="/managers#why-listed">How we build profiles</Link></p></div>
      </section>
      <p className="hint" style={{ margin: 0 }}>Not your business, or rather not be listed? Email <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a> and we&apos;ll sort it out.</p>
      </div>

      <aside className="sticky" style={{ display: 'grid', gap: 12 }}>
      {m.claimed && existing?.status !== 'approved' ? (
        <div className="panel">This profile has already been claimed. If you work there, ask your colleague to invite you from <b>Team</b> in their dashboard. If that wasn&apos;t you or your team, email <b>hello@cohostcompare.com</b>.</div>
      ) : existing?.status === 'approved' ? (
        <div className="panel" style={{ background: 'var(--tint)' }}>You manage this profile. <Link href="/dashboard">Open your dashboard</Link></div>
      ) : existing?.status === 'info_requested' || existing?.status === 'info_received' ? (
        <div className="panel" style={{ background: 'var(--tint)' }}><b>We&apos;ve emailed you asking for a little more information</b> to confirm you manage {m.name}. Reply to that email and we&apos;ll finish your claim.</div>
      ) : existing?.status === 'pending' ? (
        <div className="panel" style={{ background: 'var(--tint)' }}><b>Thanks, your claim is being checked.</b> We&apos;ll email you once it&apos;s approved, usually within one business day.</div>
      ) : existing?.status === 'rejected' ? (
        <div className="panel">We couldn&apos;t verify your last claim. Email <b>hello@cohostcompare.com</b> and we&apos;ll sort it out.</div>
      ) : user?.email ? (
        <ClaimForm slug={m.slug} name={m.name} email={user.email} instant={emailMatchesSite(user.email, m.website)} />
      ) : (
        <EmailSignIn
          next={`/claim/${m.slug}`}
          intro={domain
            ? `First, confirm your work email. If it ends in @${domain}, you'll be approved instantly. Otherwise we'll check your claim by hand.`
            : "First, confirm your work email. We'll check your claim by hand, usually within one business day."}
        />
      )}
      </aside>
    </main>
  );
}
