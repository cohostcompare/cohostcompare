/**
 * Keeps manager contact details out of quotes and messages until the owner accepts.
 * Owners get the manager's details (and the manager gets theirs) in the introduction
 * email that acceptance triggers, so there's no need to share them earlier.
 * Shared by server actions and the quote form (pure, no server-only imports).
 */

export type ContactKind = 'email' | 'phone' | 'website';

const EMAIL = /[\w.+-]+\s*(?:@|\(at\)|\[at\]|\{at\})\s*[\w-]+(?:\s*(?:\.|\(dot\)|\[dot\])\s*[\w-]+|\s+dot\s+[\w-]+)+/gi;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi;
// Bare domains like staysbythebay.com.au. Platform names owners expect to see are allowed.
const DOMAIN = /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com\.au|net\.au|org\.au|id\.au|asn\.au|com|net|org|au|io|co|biz|info|me|app|homes|rentals|holiday|holidays|travel|online|site)\b/gi;
const ALLOWED_DOMAINS = /^(?:[\w-]+\.)*(?:airbnb|stayz|booking|vrbo|expedia|homeaway|cohostcompare|google|instagram|facebook|tripadvisor|hometogo|wotif)\.(?:com\.au|com|au|net)$/i;
// Runs of digits with spaces, dots, dashes, brackets or a leading +.
const DIGITS = /\+?\(?\d[\d\s().-]{6,}\d/g;

function isPhone(run: string): boolean {
  const d = run.replace(/\D/g, '');
  if (d.length < 8 || d.length > 12) return false;
  // Australian mobiles and landlines (04…, 02…, 03…, 07…, 08…), +61/61, 1300/1800/13 numbers.
  return /^(?:0[2-578]\d{8}|61[2-578]\d{8}|1[38]00\d{6}|13\d{4}|0\d{9})$/.test(d) || (run.trim().startsWith('+') && d.length >= 9);
}

type Hit = { kind: ContactKind; start: number; end: number };

function hits(text: string): Hit[] {
  const out: Hit[] = [];
  for (const m of text.matchAll(EMAIL)) out.push({ kind: 'email', start: m.index!, end: m.index! + m[0].length });
  for (const m of text.matchAll(URL)) out.push({ kind: 'website', start: m.index!, end: m.index! + m[0].length });
  for (const m of text.matchAll(DOMAIN)) {
    if (ALLOWED_DOMAINS.test(m[0])) continue;
    // Part of an email address already caught above.
    if (out.some((h) => m.index! >= h.start && m.index! < h.end)) continue;
    out.push({ kind: 'website', start: m.index!, end: m.index! + m[0].length });
  }
  for (const m of text.matchAll(DIGITS)) {
    if (isPhone(m[0])) out.push({ kind: 'phone', start: m.index!, end: m.index! + m[0].length });
  }
  return out;
}

/** The kinds of contact detail in the text, if any. */
export function findContactDetails(text: string | null | undefined): ContactKind[] {
  if (!text) return [];
  return [...new Set(hits(text).map((h) => h.kind))];
}

/** Replaces any contact details with a short placeholder (used where we can't ask the sender to edit, e.g. email replies). */
export function redactContactDetails(text: string): { text: string; removed: ContactKind[] } {
  const list = hits(text).sort((a, b) => a.start - b.start);
  if (!list.length) return { text, removed: [] };
  // Merge overlaps, then rebuild from the end so indexes stay valid.
  const merged: Hit[] = [];
  for (const h of list) {
    const last = merged[merged.length - 1];
    if (last && h.start <= last.end) last.end = Math.max(last.end, h.end);
    else merged.push({ ...h });
  }
  let out = text;
  for (const h of merged.reverse()) out = out.slice(0, h.start) + '[contact details hidden]' + out.slice(h.end);
  return { text: out, removed: [...new Set(list.map((h) => h.kind))] };
}

const LABEL: Record<ContactKind, string> = { email: 'email address', phone: 'phone number', website: 'website' };

/** "your email address and phone number" */
export function describeKinds(kinds: ContactKind[]): string {
  const words = kinds.map((k) => LABEL[k]);
  return words.length <= 1 ? `your ${words[0] ?? 'contact details'}` : `your ${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** The error a manager sees when a note or message includes contact details before acceptance. */
export function contactDetailsError(kinds: ContactKind[], where: 'note' | 'message'): string {
  return `Please take ${describeKinds(kinds)} out of your ${where}. The owner gets your contact details, and you get theirs, as soon as they accept your quote.`;
}

export const CONTACT_HINT = 'Leave out your phone, email and website. If the owner accepts your quote, we introduce you both by email with everyone’s contact details.';
