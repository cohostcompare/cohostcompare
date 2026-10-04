import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { verify } from '@/lib/claims';
import { unsubscribe } from '@/lib/outreach';

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ e?: string; s?: string; done?: string }>;

async function confirm(form: FormData) {
  'use server';
  const e = String(form.get('e') || ''), s = String(form.get('s') || '');
  if (verify(`unsub:${e.toLowerCase()}`, s)) await unsubscribe(e);
  redirect('/unsubscribe?done=1');
}

export default async function Unsubscribe({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ok = sp.e && sp.s && verify(`unsub:${sp.e.toLowerCase()}`, sp.s);
  return (
    <main style={{ maxWidth: 560, paddingBlock: '48px 80px', display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>Unsubscribe</h1>
      {sp.done ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <p className="lede" style={{ margin: 0 }}>Done. You won&apos;t get any more emails like that from us: no invitations to claim a profile, tips, market reports or review invitations.</p>
            <p style={{ margin: 0 }}>Two kinds of email still arrive, because they&apos;re about something you or an owner asked for: a notice when an owner asks your business for a quote through CoHostCompare, and emails about your own quote requests or account. If you&apos;d rather your business wasn&apos;t listed at all, email hello@cohostcompare.com and we&apos;ll remove the profile.</p>
            <p className="hint" style={{ margin: 0 }}>Unsubscribed by mistake? Email hello@cohostcompare.com.</p>
          </div>
        )
        : ok ? (
          <form action={confirm} style={{ display: 'grid', gap: 12 }}>
            <input type="hidden" name="e" value={sp.e} /><input type="hidden" name="s" value={sp.s} />
            <p className="lede" style={{ margin: 0 }}>Stop emails to <b>{sp.e}</b> about CoHostCompare?</p>
            <button className="btn primary" type="submit" style={{ justifySelf: 'start' }}>Unsubscribe</button>
          </form>
        ) : <p className="lede">This link isn&apos;t valid. Email hello@cohostcompare.com and we&apos;ll remove you straight away.</p>}
    </main>
  );
}
