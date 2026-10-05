import 'server-only';
import { cookies, headers } from 'next/headers';
import { adminClient } from '@/lib/supabase/server';

/*
 Where visitors come from, so we can see what Google Ads (and everything else) actually produces.
 Two first-party cookies, no personal details:
 - cc_sid: a random id for this browser session (ends when the browser closes)
 - cc_src: how they first arrived in the last 30 days, e.g. {"s":"ads","c":"campaign id"}. A new ad click replaces it.
 Events go in funnel_events (SQL 017): one 'visit' per session, plus 'search' and 'quote'.
*/

export type Source = 'ads' | 'google' | 'social' | 'referral' | 'email' | 'direct';
export const SOURCES: Source[] = ['ads', 'google', 'social', 'referral', 'email', 'direct'];
export const sourceLabel: Record<Source, string> = { ads: 'Google Ads', google: 'Google search (free)', social: 'Social media', referral: 'Other websites', email: 'Email', direct: 'Direct or unknown' };

export const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora|pinterest|vercel-screenshot|headless|lighthouse|adsbot|mediapartners/i;

export type Device = 'phone' | 'tablet' | 'desktop';
export const DEVICES: Device[] = ['phone', 'tablet', 'desktop'];
/** Device type from the user agent only (SQL 027 funnel_events.device). iPadOS Safari reports as a Mac, so it counts as desktop. */
export function deviceOf(ua: string | null | undefined): Device {
  const s = ua || '';
  if (/iPad|Tablet/i.test(s) || (/Android/i.test(s) && !/Mobi/i.test(s))) return 'tablet';
  if (/Mobi|Android/i.test(s)) return 'phone';
  return 'desktop';
}
const SOCIAL = /(^|\.)(linkedin|lnkd|facebook|fb|instagram|t\.co|twitter|x\.com|reddit|youtube|tiktok)\./i;
const OWN = /(^|\.)cohostcompare\.com$/i;

export function classify(p: { gclid?: string | null; utm_source?: string | null; utm_medium?: string | null; ref?: string | null }): Source | null {
  const med = (p.utm_medium || '').toLowerCase(), src = (p.utm_source || '').toLowerCase();
  if (p.gclid || /cpc|ppc|paid/.test(med)) return 'ads';
  if (med === 'email' || src === 'email') return 'email';
  if (/social/.test(med) || /linkedin|facebook|instagram/.test(src)) return 'social';
  if (src) return 'referral';
  let host = '';
  try { host = p.ref ? new URL(p.ref).hostname : ''; } catch { /* bad referrer */ }
  if (!host || OWN.test(host)) return null; // nothing new to say
  // Webmail: a link clicked in Gmail arrives with a mail.google.com referrer, which is email, not a Google search.
  if (/^mail\.|outlook\.(live|office)\.com|mail\.yahoo|protonmail|proton\.me|fastmail/i.test(host)) return 'email';
  if (/(^|\.)google\./i.test(host) || /(^|\.)bing\.com$|duckduckgo|ecosia|yahoo/i.test(host)) return 'google';
  if (SOCIAL.test(host + '.')) return 'social';
  return 'referral';
}

export async function currentSource(): Promise<{ source: Source; campaign: string | null }> {
  try {
    const raw = (await cookies()).get('cc_src')?.value;
    const j = raw ? JSON.parse(decodeURIComponent(raw)) as { s?: string; c?: string } : null;
    const s = SOURCES.includes(j?.s as Source) ? (j!.s as Source) : 'direct';
    return { source: s, campaign: j?.c ? String(j.c).slice(0, 80) : null };
  } catch { return { source: 'direct', campaign: null }; }
}

/** Records a search or quote request against this session. Never throws, skips bots and admins. */
export async function logFunnel(kind: 'search' | 'quote') {
  try {
    const ua = (await headers()).get('user-agent') || '';
    if (!ua || BOT.test(ua)) return;
    const sid = (await cookies()).get('cc_sid')?.value;
    if (!sid) return; // no visit beacon (scripts blocked): counted nowhere rather than guessed
    const { currentUser } = await import('@/lib/supabase/server');
    const { isAdminEmail } = await import('@/lib/admin');
    if (isAdminEmail((await currentUser().catch(() => null))?.email)) return;
    const { source, campaign } = await currentSource();
    await adminClient().from('funnel_events').insert({ sid: sid.slice(0, 40), kind, source, campaign, device: deviceOf(ua) });
  } catch { /* best-effort */ }
}
