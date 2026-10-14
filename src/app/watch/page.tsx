import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { verify } from '@/lib/claims';
import { managersForArea } from '@/lib/data';
import { adminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'New manager alerts', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SP = Promise<{ r?: string; s?: string; done?: string }>;

// Turns on "email me when new managers cover it" from the owner no-reply email (src/lib/ownerJobs.ts watchUrl).
// A button rather than on page load, so email link checkers can't switch it on.
async function turnOn(form: FormData) {
  'use server';
  const r = String(form.get('r') || ''), s = String(form.get('s') || '');
  if (!verify(`watch:${r}`, s)) redirect('/watch');
  const db = adminClient();
  const { data: q } = await db.from('quote_requests').select('id, lat, lng, postcode').eq('id', r).maybeSingle();
  if (q) {
    const patch: Record<string, unknown> = { watch_new: true, watch_checked_at: new Date().toISOString() };
    if (q.lat != null && q.lng != null) patch.known_slugs = (await managersForArea(Number(q.lat), Number(q.lng), q.postcode)).map((m) => m.slug);
    await db.from('quote_requests').update(patch).eq('id', q.id);
  }
  redirect(`/watch?r=${encodeURIComponent(r)}&s=${encodeURIComponent(s)}&done=1`);
}

export default async function Watch({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const ok = Boolean(sp.r && sp.s && verify(`watch:${sp.r}`, sp.s));
  const req = ok ? (await adminClient().from('quote_requests').select('address, suburb, postcode, watch_new').eq('id', sp.r!).maybeSingle()).data : null;
  const place = req ? req.address || req.suburb || `postcode ${req.postcode}` : '';
  return (
    <main style={{ maxWidth: 560, paddingBlock: '48px 80px', display: 'grid', gap: 14 }}>
      <h1 style={{ fontSize: 34, margin: 0 }}>New manager alerts</h1>
      {!req ? (
        <p className="lede" style={{ margin: 0 }}>This link isn&apos;t valid any more. You can turn alerts on from <Link href="/account">your requests</Link>.</p>
      ) : sp.done || req.watch_new ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <p className="lede" style={{ margin: 0 }}>Done. We&apos;ll email you when a new manager starts covering {place}.</p>
          <p className="hint" style={{ margin: 0 }}>We check once a week. You can stop these emails any time from <Link href="/account">your requests</Link>.</p>
        </div>
      ) : (
        <form action={turnOn} style={{ display: 'grid', gap: 12 }}>
          <p className="lede" style={{ margin: 0 }}>We&apos;ll email you when a new manager starts covering {place}.</p>
          <input type="hidden" name="r" value={sp.r} /><input type="hidden" name="s" value={sp.s} />
          <button className="btn primary" type="submit" style={{ justifySelf: 'start' }}>Email me when one does</button>
        </form>
      )}
    </main>
  );
}
