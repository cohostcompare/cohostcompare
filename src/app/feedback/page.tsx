import type { Metadata } from 'next';
import Link from 'next/link';
import { feedbackContext, MIN_GENUINE, OWNER_REWARD_LIMIT } from '@/lib/feedback';
import { currentUser } from '@/lib/supabase/server';
import FeedbackForm from './FeedbackForm';

export const metadata: Metadata = { title: 'Feedback', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ thanks?: string; r?: string; from?: string }>;

export default async function Feedback({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await currentUser();
  const ctx = user ? await feedbackContext(user).catch(() => null) : null;
  const role = ctx?.role ?? 'visitor';
  if (sp.thanks) {
    return (
      <main style={{ maxWidth: 640, paddingBlock: '32px 80px', display: 'grid', gap: 14 }}>
        <h1 style={{ fontSize: 'clamp(30px,4.6vw,40px)', margin: 0 }}>Thank you</h1>
        <p className="lede" style={{ margin: 0 }}>We read every reply, and yours helps decide what we build next.</p>
        {sp.r === 'granted' && <p className="panel" style={{ margin: 0, background: 'var(--tint)' }}><b>We&apos;ve added 1 month of Pro free to your account.</b> It shows on your dashboard now.</p>}
        {sp.r === 'to_send' && <p className="panel" style={{ margin: 0, background: 'var(--tint)' }}><b>Your A$25 gift card is on its way.</b> We&apos;ll email it to you within a few business days.</p>}
        {sp.r === 'manual' && <p className="panel" style={{ margin: 0, background: 'var(--tint)' }}><b>We&apos;ll credit a month of Pro to your account</b> and confirm by email.</p>}
        <p style={{ margin: 0 }}><Link href={role === 'manager' ? '/dashboard' : role === 'owner' ? '/account' : '/'}>Back to {role === 'manager' ? 'your dashboard' : role === 'owner' ? 'your inbox' : 'CoHostCompare'} →</Link></p>
      </main>
    );
  }
  return (
    <main style={{ maxWidth: 680, paddingBlock: '16px 64px', display: 'grid', gap: 16 }}>
      <span className="label" style={{ color: 'var(--brand)' }}>Feedback</span>
      <h1 style={{ fontSize: 'clamp(30px,4.6vw,42px)', margin: 0 }}>Help us build this for you</h1>
      <p className="lede" style={{ margin: 0 }}>CoHostCompare is new. We&apos;re building it for {role === 'manager' ? 'managers like you' : role === 'owner' ? 'owners like you' : 'owners and the managers who look after their homes'}, so we&apos;d love to hear what works, what doesn&apos;t and what&apos;s missing. It takes about two minutes, and good or bad, it all helps.</p>
      {ctx?.reward && (
        <div className="panel" style={{ background: 'var(--tint)', display: 'grid', gap: 4 }}>
          <b>Our thank-you: {ctx.reward}{ctx.role === 'owner' ? ` (for the first ${OWNER_REWARD_LIMIT} owners)` : ''}.</b>
          <span className="hint">{ctx.role === 'manager' ? `Added to ${ctx.managerName || 'your account'} straight away, on top of any free Pro you already have.` : 'We’ll email it to you within a few business days.'} One per {ctx.role === 'manager' ? 'business' : 'person'}, for an honest answer to &quot;what should we improve&quot; (at least {MIN_GENUINE} characters). It doesn&apos;t matter whether your feedback is good or bad.</span>
        </div>
      )}
      {ctx?.given && !ctx.reward && <p className="hint" style={{ margin: 0 }}>Thanks for your earlier feedback. You&apos;re welcome to send more any time.</p>}
      <FeedbackForm role={role} signedIn={Boolean(user)} page={sp.from} minGenuine={MIN_GENUINE} reward={ctx?.reward ?? null} />
      <p className="hint" style={{ margin: 0 }}>Your feedback goes to Ben, the founder. We don&apos;t publish it or share it with managers or owners. See our <Link href="/privacy">privacy policy</Link>.</p>
    </main>
  );
}
