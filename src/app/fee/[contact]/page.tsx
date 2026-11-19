import type { Metadata } from 'next';
import Link from 'next/link';
import { feeContact } from '@/lib/followups';
import FeeForm from './FeeForm';

export const metadata: Metadata = { title: 'Confirm your fee', robots: { index: false } };
export const dynamic = 'force-dynamic';

const num = (v?: string) => (v && /^\d{1,2}(\.\d)?$/.test(v) ? v : '');

/** Reached from the fee question email: a signed link, so no account is needed. */
export default async function FeePage({ params, searchParams }: { params: Promise<{ contact: string }>; searchParams: Promise<{ s?: string; f?: string; t?: string }> }) {
  const [{ contact }, sp] = await Promise.all([params, searchParams]);
  const found = await feeContact(contact, sp.s || '');
  if (!found) {
    return <main className="legal"><h1>This link isn&apos;t working</h1><p>It may have been cut off by your email app. Reply to our email with your fee and we&apos;ll add it, or write to <a href="mailto:hello@cohostcompare.com">hello@cohostcompare.com</a>.</p></main>;
  }
  const m = found.manager;
  if (m.claimed) {
    return <main className="legal"><h1>{m.name} has been claimed</h1><p>The fee is now set from the manager dashboard. <Link href="/dashboard">Go to your dashboard</Link>.</p></main>;
  }
  const min = num(sp.f) || (m.fee_min != null ? String(m.fee_min) : '');
  const max = num(sp.t) || (!num(sp.f) && m.fee_max != null && m.fee_max !== m.fee_min ? String(m.fee_max) : '');
  return (
    <main style={{ maxWidth: 640, paddingBlock: '28px 72px', display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <span className="label" style={{ color: 'var(--brand)' }}>{m.name}</span>
        <h1 style={{ margin: 0, fontSize: 'clamp(28px,5vw,40px)' }}>Confirm your management fee</h1>
        <p className="lede">Owners comparing managers see this next to your guest rating and the homes you run near them. Check the figure, then confirm.</p>
      </div>
      <FeeForm contact={found.contactId} s={sp.s || ''} name={m.name} slug={m.slug} min={min} max={max} />
      <p className="hint" style={{ margin: 0 }}>No account needed: this link was sent to the address published for {m.name}. You can change the fee any time by claiming the profile.</p>
    </main>
  );
}
