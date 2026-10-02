import 'server-only';
import { TEST_SLUG, managersForArea } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { adminClient } from '@/lib/supabase/server';

/* Daily jobs for owners (SQL 022). Every one is best-effort and returns how many emails went. */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
const HOUR = 3600e3;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const suppressed = async (email: string) => Boolean((await adminClient().from('email_suppressions').select('email').eq('email', email.toLowerCase()).maybeSingle()).data);

/** Catch-up only covers requests made after this moment. Everything before it was testing (Ben, 2 Oct 2026), so it's never emailed. */
const CATCHUP_FROM = '2026-10-02T05:00:00Z'; // 3pm 2 Oct 2026 Sydney

/** Request emails to unclaimed managers that were missed (e.g. a send failed). Last 14 days, never before CATCHUP_FROM. */
export async function catchUpUnclaimed(limit = 40) {
  const db = adminClient();
  const { data, error } = await db.from('quote_request_managers').select('id, manager_slug, quote_requests(suburb, state)').in('status', ['sent', 'viewed']).is('unclaimed_notified_at', null).gte('created_at', ago(14 * 24) > CATCHUP_FROM ? ago(14 * 24) : CATCHUP_FROM).neq('manager_slug', TEST_SLUG).limit(200);
  if (error || !data?.length) return 0;
  const { notifyUnclaimedOfRequest, requestEmailsOn } = await import('@/lib/outreach');
  if (!requestEmailsOn()) return 0;
  const slugs = [...new Set(data.map((t) => t.manager_slug))];
  const { data: ms } = await db.from('managers').select('slug, claimed').in('slug', slugs);
  const unclaimed = new Set((ms || []).filter((m) => !m.claimed).map((m) => m.slug));
  let n = 0;
  for (const t of data) {
    if (n >= limit || !unclaimed.has(t.manager_slug)) continue;
    const q = (Array.isArray(t.quote_requests) ? t.quote_requests[0] : t.quote_requests) as { suburb: string | null; state: string | null } | null;
    n += await notifyUnclaimedOfRequest(t.manager_slug, `${q?.suburb || ''} ${q?.state || ''}`.trim() || 'your area', t.id).catch(() => 0);
  }
  return n;
}

/** One reminder to owners who opened the quote form with managers picked but didn't send it (20 hours to 7 days later). */
export async function draftReminders(limit = 40) {
  const db = adminClient();
  const { data, error } = await db.from('quote_drafts').select('*').eq('done', false).is('reminded_at', null).lte('updated_at', ago(20)).gte('updated_at', ago(7 * 24)).limit(limit);
  if (error || !data?.length) return 0;
  let n = 0;
  for (const d of data) {
    const { count } = await db.from('quote_requests').select('id', { count: 'exact', head: true }).eq('owner_id', d.user_id).gte('created_at', d.created_at);
    if (count || (await suppressed(d.email))) { await db.from('quote_drafts').update({ reminded_at: new Date().toISOString(), done: Boolean(count) }).eq('user_id', d.user_id); continue; }
    const q = new URLSearchParams(d.query); q.set('managers', d.managers);
    await sendEmail({
      to: d.email, subject: 'Your quote request isn’t sent yet',
      text: `Hi,\n\nYou were about to request quotes from ${d.names || 'some managers'} but didn't send it. It only takes a minute to finish, and it's free.\n\nEach manager replies in the same format, so you can compare fees, terms and what's included side by side. There's no obligation.\n\nIf you've decided not to go ahead, no worries: we won't remind you again.\n\nThe CoHostCompare team`,
      cta: { label: 'Finish my request', url: `${SITE}/quote?${q.toString()}` },
    });
    await db.from('quote_drafts').update({ reminded_at: new Date().toISOString() }).eq('user_id', d.user_id);
    n++;
  }
  return n;
}

/** Weekly: tells owners who asked to know when new managers start covering their property. */
export async function newManagerAlerts(limit = 30) {
  const db = adminClient();
  const { data, error } = await db.from('quote_requests').select('id, owner_email, owner_name, address, suburb, state, postcode, lat, lng, known_slugs, watch_checked_at').eq('watch_new', true).or(`watch_checked_at.is.null,watch_checked_at.lt.${ago(7 * 24)}`).limit(limit);
  if (error || !data?.length) return 0;
  let n = 0;
  for (const r of data) {
    if (r.lat == null || r.lng == null) continue;
    const now = await managersForArea(Number(r.lat), Number(r.lng), r.postcode);
    const known = new Set(r.known_slugs || []);
    const fresh = now.filter((m) => !known.has(m.slug));
    await db.from('quote_requests').update({ known_slugs: now.map((m) => m.slug), watch_checked_at: new Date().toISOString() }).eq('id', r.id);
    if (!fresh.length || (await suppressed(r.owner_email))) continue;
    const q = new URLSearchParams({ postcode: r.postcode, ...(r.suburb ? { suburb: r.suburb } : {}), ...(r.state ? { state: r.state } : {}), lat: String(r.lat), lng: String(r.lng) });
    await sendEmail({
      to: r.owner_email, subject: `${fresh.length} new manager${fresh.length === 1 ? '' : 's'} near ${r.suburb || r.postcode}`,
      text: `Hi ${String(r.owner_name || '').split(' ')[0] || 'there'},\n\nAs you asked, here ${fresh.length === 1 ? 'is a manager' : 'are managers'} now running homes near ${r.address || r.suburb || r.postcode}:\n\n${fresh.slice(0, 8).map((m) => `- ${m.name}${m.nearby ? ` (${m.nearby} home${m.nearby === 1 ? '' : 's'} nearby)` : ''}`).join('\n')}\n\nYou can compare them and request quotes in a couple of minutes.\n\nTo stop these emails, open your inbox and choose "Stop these emails" on that request.`,
      cta: { label: 'See them', url: `${SITE}/search?${q.toString()}` },
    });
    n++;
  }
  return n;
}
