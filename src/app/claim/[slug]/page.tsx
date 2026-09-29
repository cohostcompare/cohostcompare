import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EmailSignIn from '@/components/EmailSignIn';
import { emailMatchesSite, siteDomain } from '@/lib/claims';
import { managerForClaim } from '@/lib/data';
import { adminClient, currentUser } from '@/lib/supabase/server';
import ClaimForm from './ClaimForm';

export const metadata: Metadata = { title: 'Claim your profile', robots: { index: false } };

type P = Promise<{ slug: string }>;

export default async function Claim({ params }: { params: P }) {
  const { slug } = await params;
  const m = await managerForClaim(slug);
  if (!m) notFound();
  const user = await currentUser();
  const domain = siteDomain(m.website);
  const existing = user ? (await adminClient().from('manager_claims').select('status').eq('manager_id', m.id).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()).data : null;

  return (
    <main style={{ maxWidth: 640, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <Link href={`/managers/${m.slug}`} className="hint">← Back to {m.name}</Link>
      <h1 style={{ fontSize: 'clamp(28px,4.4vw,38px)', margin: 0 }}>Claim {m.name}</h1>
      <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)', display: 'grid', gap: 4 }}>
        <li>Add your fees, services, platforms, logo and photos</li>
        <li>Receive and reply to owners&apos; quote requests</li>
        <li>Free during launch</li>
      </ul>

      {m.claimed && existing?.status !== 'approved' ? (
        <div className="panel">This profile has already been claimed. If that wasn&apos;t you or your team, email <b>hello@cohostcompare.com</b>.</div>
      ) : existing?.status === 'approved' ? (
        <div className="panel" style={{ background: 'var(--tint)' }}>You manage this profile. <Link href="/dashboard">Open your dashboard</Link></div>
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
    </main>
  );
}
