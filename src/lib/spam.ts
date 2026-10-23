import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

/*
 Spam checks for public forms (feedback first). Layers, cheapest first:
 1. honeypot field (in the form)
 2. a signed "form shown at" token from the server, plus a field the browser fills only when JavaScript runs:
    bots that post straight to the endpoint, or submit within seconds, fail
 3. a content filter for signed-out visitors: links, domains and the usual sales pitches
 4. a rate limit per network address (in the action, via rate.ts)
 Failures of 1–2 are dropped; content-filter hits are kept but flagged and not emailed. Either way the
 sender sees the normal thank-you, so bots learn nothing.
*/

const key = () => process.env.ADMIN_TOKEN || 'dev-only';
const sign = (v: string) => createHmac('sha256', key()).update(`form|${v}`).digest('hex').slice(0, 24);

/** A token recording when the form was shown. Put it in a hidden field. */
export function formToken(now = Date.now()) {
  const t = String(now);
  return `${t}.${sign(t)}`;
}

/** Whether the token is ours, and the form was open for between `minMs` and `maxMs`. */
export function tokenOk(token: string | null | undefined, minMs = 4000, maxMs = 2 * 86400e3, now = Date.now()) {
  const [t, sig] = String(token || '').split('.');
  if (!t || !sig) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(t));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const age = now - Number(t);
  return Number.isFinite(age) && age >= minMs && age <= maxMs;
}

const LINK = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|co|live|pro|xyz|info|biz|site|online|top|shop|store|agency|digital|today|click|link|ru|in)\b/i;
const PITCHES: RegExp[] = [
  /\bsearch (?:index|engine|register|results)/i, /\bseo\b/i, /\bbacklinks?\b/i, /\branking\b.*\bgoogle\b|\bgoogle\b.*\b(?:first page|page one|rank)/i,
  /\b(?:explainer|promo(?:tional)?|animated|engaging|impactful)\s+video/i, /\bvideos? (?:are|cost|start)\b/i,
  /\b(?:usd|gbp|£|€)\s?\d|\$\s?\d+\s?(?:usd|aud)\b/i, /\bper month\b.*\b(?:leads|traffic|visitors)\b/i,
  /\b(?:web ?design|website redesign|app development|virtual assistant|outsourc|lead generation|guest post|crypto|bitcoin|casino|loan offer)/i,
  /\b(?:let me know if you(?:'|’)?re interested|send (?:you )?some samples|previous work)\b/i,
];

/** True when the text reads like a sales pitch or link drop rather than feedback. For signed-out visitors only. */
export function looksLikeSpam(...texts: (string | null | undefined)[]) {
  const all = texts.filter(Boolean).join('\n');
  if (!all) return false;
  const links = all.match(new RegExp(LINK.source, 'gi')) || [];
  if (links.some((l) => !/(?:cohostcompare|airbnb|stayz|booking|vrbo|google)\.(?:com|au)/i.test(l))) return true;
  return PITCHES.filter((r) => r.test(all)).length >= 1;
}
