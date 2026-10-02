import 'server-only';
import { TEST_SLUG } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { unsubscribeUrl } from '@/lib/outreach';
import { adminClient } from '@/lib/supabase/server';

/*
 One review invite per quote request (daily cron, SQL 017), sent to EVERY owner, not just happy ones
 (Trustpilot and the ACCC both rule out selective inviting):
 - accepted a quote and introduced: 14 days after accepting, asks for a review of the manager on CoHostCompare
   and of CoHostCompare on Trustpilot (and ProductReview once listed)
 - didn't accept one: 21 days after the request, asks for a review of CoHostCompare only
 At most one invite per owner every 180 days, never to unsubscribed addresses, never for admin test requests.
*/

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
const DAY = 86400e3;
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();
const first = (n: unknown) => String(n || '').split(' ')[0] || 'there';
export const TRUSTPILOT_WRITE = 'https://www.trustpilot.com/evaluate/cohostcompare.com';
export const PRODUCTREVIEW_WRITE = 'https://www.productreview.com.au/listings/cohostcompare/write-review';

type T = { id: string; manager_name: string; manager_slug: string; status: string; accepted_at: string | null };
type R = { id: string; created_at: string; owner_name: string; owner_email: string; suburb: string | null; quote_request_managers: T[] };

export async function sendReviewInvites(limit = 40) {
  const db = adminClient();
  const { data, error } = await db.from('quote_requests')
    .select('id, created_at, owner_name, owner_email, suburb, quote_request_managers(id, manager_name, manager_slug, status, accepted_at)')
    .is('review_invited_at', null).gte('created_at', ago(90)).lte('created_at', ago(7)).order('created_at').limit(300);
  if (error || !data?.length) return 0; // error = 017 not run yet
  const productReview = PRODUCTREVIEW_WRITE;
  let sent = 0;
  for (const r of data as unknown as R[]) {
    if (sent >= limit) break;
    const ts = r.quote_request_managers || [];
    const mark = () => db.from('quote_requests').update({ review_invited_at: new Date().toISOString() }).eq('id', r.id);
    if (!ts.length || ts.every((t) => t.manager_slug === TEST_SLUG)) { await mark(); continue; }
    const won = ts.find((t) => t.status === 'accepted');
    let introduced = false;
    if (won) {
      const { data: fee } = await db.from('success_fees').select('status').eq('thread_id', won.id).maybeSingle();
      introduced = !fee || !['awaiting_unlock', 'expired'].includes(fee.status);
    }
    // Not due yet: wait for 14 days after accepting (once introduced), or 21 days after the request.
    if (won && introduced) { if (!won.accepted_at || won.accepted_at > ago(14)) continue; }
    else if (r.created_at > ago(21)) continue;
    const email = r.owner_email.toLowerCase();
    const { data: sup } = await db.from('email_suppressions').select('email').eq('email', email).maybeSingle();
    const { count: recent } = await db.from('quote_requests').select('id', { count: 'exact', head: true }).ilike('owner_email', email).gte('review_invited_at', ago(180));
    if (sup || recent) { await mark(); continue; }
    const managerPart = won && introduced
      ? `It's been a couple of weeks since you accepted ${won.manager_name}'s quote. How is it going? A short review of ${won.manager_name} helps the next owner choose, and it shows on their profile as a verified owner review:\n${SITE}/account/review/${won.id}\n\n`
      : '';
    const text = `Hi ${first(r.owner_name)},\n\nThanks for using CoHostCompare to compare managers${r.suburb ? ` for your place in ${r.suburb}` : ''}.\n\n${managerPart}We're a small Australian business, and honest reviews, good or bad, are the best way for other owners to find us and for us to improve. Could you spare a minute to review CoHostCompare on Trustpilot?\n${TRUSTPILOT_WRITE}${productReview ? `\n\nOr on ProductReview:\n${productReview}` : ''}\n\nWe won't keep asking.\n\nThanks,\nBen Deeley\nFounder, CoHostCompare\n\nDon't want emails like this? ${unsubscribeUrl(email)}`;
    const ok = await sendEmail({
      to: r.owner_email,
      subject: won && introduced ? `How is it going with ${won.manager_name}?` : 'How did CoHostCompare go for you?',
      text,
      cta: won && introduced ? { label: `Review ${won.manager_name}`, url: `${SITE}/account/review/${won.id}` } : { label: 'Review us on Trustpilot', url: TRUSTPILOT_WRITE },
      from: 'Ben from CoHostCompare <hello@cohostcompare.com>',
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl(email, true)}>, <mailto:hello@cohostcompare.com?subject=unsubscribe>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
    if (ok) { await mark(); sent++; }
  }
  return sent;
}
