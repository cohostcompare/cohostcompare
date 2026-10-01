'use server';

import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { isAdminEmail } from '@/lib/admin';
import { estimateEarnings, type Estimate } from '@/lib/earnings';
import { adminClient, currentUser } from '@/lib/supabase/server';

/*
 Limits on the earnings estimator (SQL 019), so it can't be scraped or run up our AirROI bill:
 - without an account: ESTIMATES_ANON different places a day per device/network, then we ask them to sign in free
 - signed in: ESTIMATES_SIGNED_IN different places a day
 Changing the bedrooms for a place already estimated doesn't count. Admins are unlimited.
 (A global cap on new AirROI lookups per day also sits in src/lib/earnings.ts.)
*/
const ESTIMATES_ANON = 3;
const ESTIMATES_SIGNED_IN = 10;

export type EstimateResult = Estimate | { error: string; signin?: boolean };

export async function getEstimate(lat: number, lng: number, bedrooms: number): Promise<EstimateResult> {
  if (![lat, lng, bedrooms].every(Number.isFinite)) return { error: 'Pick an address from the suggestions first.' };
  const h = await headers();
  if (/bot|crawl|spider|headless|python|curl|wget/i.test(h.get('user-agent') || '')) return { error: 'Estimates aren’t available here.' };
  const user = await currentUser().catch(() => null);
  if (!isAdminEmail(user?.email)) {
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
    const who = user ? `u:${user.id}` : `ip:${createHash('sha256').update(`${ip}|${process.env.ADMIN_TOKEN || ''}`).digest('hex').slice(0, 24)}`;
    const place = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const db = adminClient();
    const { data, error } = await db.from('rate_events').select('item').eq('kind', 'estimate').eq('who', who).gte('created_at', new Date(Date.now() - 86400e3).toISOString()).limit(200);
    if (!error) {
      const places = new Set((data || []).map((r) => r.item));
      if (!places.has(place)) {
        const limit = user ? ESTIMATES_SIGNED_IN : ESTIMATES_ANON;
        if (places.size >= limit) {
          return user
            ? { error: `You’ve estimated ${limit} different places today, which is our daily limit. Try again tomorrow, or email hello@cohostcompare.com if you need more.` }
            : { error: `You’ve done ${limit} free estimates today. Sign in free with just your email to keep going.`, signin: true };
        }
        await db.from('rate_events').insert({ kind: 'estimate', who, item: place }).then(() => {}, () => {});
      }
    }
  }
  return estimateEarnings(lat, lng, bedrooms);
}
