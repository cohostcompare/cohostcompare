import { randomUUID } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail } from '@/lib/admin';
import { adminClient, currentUser } from '@/lib/supabase/server';
import { BOT, classify } from '@/lib/traffic';

// Called once per browser session (and again on any new ad click) by <TrafficBeacon />.
export async function POST(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  try {
    const ua = req.headers.get('user-agent') || '';
    if (!ua || BOT.test(ua)) return res;
    const b = await req.json().catch(() => ({})) as { path?: string; q?: string; ref?: string };
    const q = new URLSearchParams(String(b.q || '').slice(0, 1000));
    const fresh = classify({ gclid: q.get('gclid') || q.get('gbraid') || q.get('wbraid'), utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), ref: b.ref });
    const campaign = (q.get('utm_campaign') || q.get('gad_campaignid') || q.get('campaignid') || '').slice(0, 80) || null;
    let src: { s: string; c: string | null } | null = null;
    try { src = JSON.parse(decodeURIComponent(req.cookies.get('cc_src')?.value || '')); } catch { /* none */ }
    // An ad click always takes over; anything else only fills an empty slot (first touch wins).
    if (fresh && (fresh === 'ads' || !src)) {
      src = { s: fresh, c: campaign };
      res.cookies.set('cc_src', encodeURIComponent(JSON.stringify(src)), { maxAge: 30 * 86400, sameSite: 'lax', secure: true, httpOnly: true, path: '/' });
    }
    let sid = req.cookies.get('cc_sid')?.value;
    const newSession = !sid;
    if (!sid) { sid = randomUUID(); res.cookies.set('cc_sid', sid, { sameSite: 'lax', secure: true, httpOnly: true, path: '/' }); }
    if (newSession || fresh === 'ads') {
      const user = await currentUser().catch(() => null);
      if (!isAdminEmail(user?.email)) {
        await adminClient().from('funnel_events').insert({ sid, kind: 'visit', source: src?.s || 'direct', campaign: src?.c ?? null, landing: String(b.path || '/').slice(0, 120) });
      }
    }
  } catch { /* never break the page */ }
  return res;
}
