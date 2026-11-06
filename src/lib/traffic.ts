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

export type Source = 'ads' | 'google' | 'ai' | 'social' | 'referral' | 'email' | 'direct';
export const SOURCES: Source[] = ['ads', 'google', 'ai', 'social', 'referral', 'email', 'direct'];
export const sourceLabel: Record<Source, string> = { ads: 'Google Ads', google: 'Search engines (free)', ai: 'AI assistants', social: 'Social media', referral: 'Other websites', email: 'Email', direct: 'Direct or unknown' };

/*
 Quote-flow steps (SQL 034), in order. Each counts once per session.
 visit → search (address searched) → details (property bar complete) → pick (a manager added)
 → form (quote form opened) → held (signed out: request held, email link sent) → link (email link opened) → quote (request sent).
*/
export type Step = 'visit' | 'search' | 'details' | 'pick' | 'form' | 'held' | 'link' | 'quote';
export const STEPS: Step[] = ['visit', 'search', 'details', 'pick', 'form', 'held', 'link', 'quote'];
export const stepLabel: Record<Step, string> = {
  visit: 'Visited', search: 'Searched an address', details: 'Filled in property details', pick: 'Added a manager',
  form: 'Opened the quote form', held: 'Submitted, signed out (email link sent)', link: 'Opened the email link', quote: 'Request sent',
};
/** Steps the browser may report through /api/step; the rest are logged by the server. */
export const CLIENT_STEPS: Step[] = ['details', 'pick', 'form'];

// AI assistants: ChatGPT adds utm_source=chatgpt.com to links it cites; the others show up as referrers.
const AI_SRC = /chatgpt|openai|perplexity|copilot|gemini|claude|anthropic|deepseek|mistral|grok/i;
const AI_HOST = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|bard\.google\.com|claude\.ai|chat\.deepseek\.com|chat\.mistral\.ai|grok\.com|you\.com|phind\.com)$/i;

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
  if (AI_SRC.test(src)) return 'ai';
  if (src) return 'referral';
  let host = '';
  try { host = p.ref ? new URL(p.ref).hostname : ''; } catch { /* bad referrer */ }
  if (!host || OWN.test(host)) return null; // nothing new to say
  // Webmail: a link clicked in Gmail arrives with a mail.google.com referrer, which is email, not a Google search.
  if (AI_HOST.test(host)) return 'ai'; // before Google: gemini.google.com is an assistant, not a search
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

/** Records a funnel step against this session. Never throws, skips bots and admins. once: skip if this session already has it. */
export async function logFunnel(kind: Exclude<Step, 'visit'>, once = false) {
  try {
    const ua = (await headers()).get('user-agent') || '';
    if (!ua || BOT.test(ua)) return;
    const sid = (await cookies()).get('cc_sid')?.value;
    if (!sid) return; // no visit beacon (scripts blocked): counted nowhere rather than guessed
    const { currentUser } = await import('@/lib/supabase/server');
    const { isAdminEmail } = await import('@/lib/admin');
    if (isAdminEmail((await currentUser().catch(() => null))?.email)) return;
    const db = adminClient();
    if (once) {
      const { count } = await db.from('funnel_events').select('id', { count: 'exact', head: true }).eq('sid', sid.slice(0, 40)).eq('kind', kind);
      if (count) return;
    }
    const { source, campaign } = await currentSource();
    await db.from('funnel_events').insert({ sid: sid.slice(0, 40), kind, source, campaign, device: deviceOf(ua) });
  } catch { /* best-effort */ }
}
