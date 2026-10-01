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
      {sp.done ? <p className="lede">Done. You won&apos;t get any more emails like that from us. Emails you need about your own quote requests or account still arrive. If that was a mistake, email hello@cohostcompare.com.</p>
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
