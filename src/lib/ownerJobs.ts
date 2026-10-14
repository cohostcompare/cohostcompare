import 'server-only';
import { TEST_SLUG, managersForArea } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { CATCHUP_FROM, unsubscribeUrl } from '@/lib/outreach';
import { mismatches } from '@/lib/requirements';
import type { NearbyManager } from '@/lib/types';
import { adminClient } from '@/lib/supabase/server';

/* Daily jobs for owners (SQL 022). Every one is best-effort and returns how many emails went. */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
const HOUR = 3600e3;
const ago = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
const suppressed = async (email: string) => Boolean((await adminClient().from('email_suppressions').select('email').eq('email', email.toLowerCase()).maybeSingle()).data);
const unsubHeaders = (email: string) => ({ 'List-Unsubscribe': `<${unsubscribeUrl(email, true)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });

/** Catch-up only covers requests made after this moment. Everything before it was testing (Ben, 2 Oct 2026), so it's never emailed. */

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
      text: `Hi,\n\nYou were about to request quotes from ${d.names || 'some managers'} but didn't send it. It only takes a minute to finish, and it's free.\n\nEach manager replies in the same format, so you can compare fees, terms and what's included side by side. There's no obligation.\n\nIf you've decided not to go ahead, no worries: we won't remind you again.\n\nThe CoHostCompare team\n\nDon't want emails from us? ${unsubscribeUrl(d.email)}`,
      cta: { label: 'Finish my request', url: `${SITE}/quote?${q.toString()}` },
      headers: unsubHeaders(d.email),
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
      headers: unsubHeaders(r.owner_email),
    });
    n++;
  }
  return n;
}

/** Days after a request before we tell the owner a manager hasn't replied (managers get their own nudge at 48 hours). */
export const NO_REPLY_DAYS = 3;

/** Signed link for an owner to turn on "email me when new managers cover it" from an email (/watch). */
export const watchUrl = async (requestId: string) => `${SITE}/watch?r=${requestId}&s=${(await import('@/lib/claims')).sign(`watch:${requestId}`)}`;

const names = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * Once per thread: if a manager hasn't replied NO_REPLY_DAYS after a request, tell the owner why that can happen,
 * that the request stays open, and either list other managers on the site who cover the property (and fit it)
 * or, if there are none, say so and offer to email them when one starts. One email per request (SQL 032).
 */
export async function noReplyFollowUps(limit = 40) {
  const db = adminClient();
  const { data, error } = await db.from('quote_request_managers')
    .select('id, request_id, manager_slug, manager_name')
    .in('status', ['sent', 'viewed']).is('owner_no_reply_at', null)
    .lt('created_at', ago(NO_REPLY_DAYS * 24)).gte('created_at', ago(30 * 24) > CATCHUP_FROM ? ago(30 * 24) : CATCHUP_FROM)
    .neq('manager_slug', TEST_SLUG).limit(300);
  if (error || !data?.length) return 0; // error = 032 not run yet
  const byReq = new Map<string, typeof data>();
  for (const t of data) byReq.set(t.request_id, [...(byReq.get(t.request_id) || []), t]);
  const { withReach } = await import('@/lib/reach');
  const { requirementsFor } = await import('@/lib/requirementsServer');
  let n = 0;
  for (const [reqId, waiting] of byReq) {
    if (n >= limit) break;
    const { data: r } = await db.from('quote_requests')
      .select('id, owner_email, owner_name, address, street, suburb, state, postcode, lat, lng, property_type, bedrooms, availability, services, situation, watch_new')
      .eq('id', reqId).maybeSingle();
    const mark = () => db.from('quote_request_managers').update({ owner_no_reply_at: new Date().toISOString() }).in('id', waiting.map((t) => t.id));
    if (!r?.owner_email) { await mark(); continue; }
    const { data: all } = await db.from('quote_request_managers').select('manager_slug, status').eq('request_id', reqId);
    const asked = new Set((all || []).map((t) => t.manager_slug));
    const quoted = (all || []).filter((t) => t.status === 'quoted' || t.status === 'accepted').length;
    const { data: ms } = await db.from('managers').select('slug, claimed').in('slug', waiting.map((t) => t.manager_slug));
    const claimed = new Set((ms || []).filter((m) => m.claimed).map((m) => m.slug));

    // Other managers on the site who cover this property and whose requirements it meets. Same order as search results.
    let others: (NearbyManager & { slowReply: boolean })[] = [];
    if (r.lat != null && r.lng != null) {
      const area = (await managersForArea(Number(r.lat), Number(r.lng), r.postcode)).filter((m) => !asked.has(m.slug) && m.slug !== TEST_SLUG);
      const reqs = await requirementsFor(area.map((m) => m.slug));
      const details = { type: r.property_type, beds: r.bedrooms, availability: r.availability, services: r.services, situation: r.situation };
      const fit = area.filter((m) => !mismatches(reqs.get(m.slug), details).length);
      const score = (m: (typeof fit)[number]) => m.nearbyRating ?? m.avgRating ?? -1;
      others = await withReach(fit.sort((a, b) => score(b) - score(a)));
    }

    const place = r.address || [r.street, r.suburb].filter(Boolean).join(', ') || `postcode ${r.postcode}`;
    const area = r.suburb || r.postcode;
    const who = names(waiting.map((t) => t.manager_name));
    const one = waiting.length === 1;
    const unclaimedOnly = waiting.every((t) => !claimed.has(t.manager_slug));
    const why = [
      `That happens sometimes. Managers can be busy, full for now, or not taking on new homes in your area.`,
      unclaimedOnly
        ? `${one ? `${who} isn’t` : 'They aren’t'} on CoHostCompare yet, so we contacted ${one ? 'them' : 'each of them'} directly, which can take longer.`
        : `We’ve sent ${one ? 'them' : 'each of them'} a reminder.`,
      `Your request stays open. If ${one ? 'they reply' : 'any of them reply'}, we’ll email you straight away.`,
    ].join(' ');
    const firstName = String(r.owner_name || '').trim().split(/\s+/)[0] || 'there';
    const intro = `Hi ${firstName.charAt(0).toUpperCase() + firstName.slice(1)},\n\nIt’s been ${NO_REPLY_DAYS} days since you asked ${who} for a quote for ${place}, and ${one ? 'they haven’t' : 'none of them have'} replied yet.\n\n${why}${quoted ? `\n\nYou already have ${quoted === 1 ? 'a quote' : `${quoted} quotes`} to look at in your inbox.` : ''}`;

    let ok: boolean;
    if (others.length) {
      const shown = others.slice(0, 6);
      const line = (m: (typeof shown)[number]) => {
        const bits = [m.nearby ? `${m.nearby} home${m.nearby === 1 ? '' : 's'} nearby` : null, (m.nearbyRating ?? m.avgRating) ? `${(m.nearbyRating ?? m.avgRating)!.toFixed(2)} guest rating` : null, m.feeMin != null ? `fees from ${m.feeMin}%` : null].filter(Boolean);
        return `- ${m.name}${bits.length ? ` (${bits.join(', ')})` : ''}${m.slowReply ? '. Not on CoHostCompare yet, so may be slow to reply' : ''}`;
      };
      const q = new URLSearchParams({ managers: shown.slice(0, 5).map((m) => m.slug).join(','), postcode: r.postcode, ...(r.street ? { street: r.street } : {}), ...(r.suburb ? { suburb: r.suburb } : {}), ...(r.state ? { state: r.state } : {}), lat: String(r.lat), lng: String(r.lng) });
      ok = await sendEmail({
        to: r.owner_email,
        subject: `${others.length === 1 ? 'Another manager covers' : `${others.length} other managers cover`} ${area}`,
        text: `${intro}\n\nWhile you wait, ${others.length === 1 ? 'one other manager on CoHostCompare covers' : `${others.length} other managers on CoHostCompare cover`} your property and take${others.length === 1 ? 's' : ''} on homes like yours:\n\n${shown.map(line).join('\n')}${others.length > shown.length ? `\n- and ${others.length - shown.length} more` : ''}\n\nYou can compare them and send ${others.length === 1 ? 'them' : 'any of them'} the same request in a couple of minutes. It’s free and there’s no obligation.\n\nThe CoHostCompare team`,
        cta: { label: others.length === 1 ? 'See this manager' : 'Compare these managers', url: `${SITE}/compare?${q.toString()}` },
      });
    } else {
      ok = await sendEmail({
        to: r.owner_email,
        subject: `No reply yet from ${one ? who : 'the managers you asked'}`,
        text: `${intro}\n\nRight now, no other managers on CoHostCompare cover ${area} and take on homes like yours. We’re adding managers all the time.\n\n${r.watch_new ? 'You’ve asked us to tell you when a new manager starts covering your property, so we’ll email you as soon as one does.' : 'We can email you as soon as a new manager starts covering your property. Just tap the button below.'}\n\nIf anything about your plans changes, reply to this email.\n\nThe CoHostCompare team`,
        cta: r.watch_new ? { label: 'See your request', url: `${SITE}/account` } : { label: 'Email me when one does', url: await watchUrl(r.id) },
      });
    }
    if (ok) { await mark(); n++; }
  }
  return n;
}
