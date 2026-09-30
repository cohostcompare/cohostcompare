import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { sign } from '@/lib/claims';

/*
 Automatic reply tracking (Resend inbound).
 Emails about a conversation carry a Reply-To like t-<thread>-m-<sig>@reply.cohostcompare.com.
 When someone hits reply, Resend posts `email.received` to /api/inbound, we fetch the body,
 strip the quoted history and add it to the conversation as if they'd typed it on the site.
 Outreach emails carry o-<contact>-<sig>@... as a second Reply-To, so a reply stops the sequence
 (the first Reply-To is still hello@, so Ben sees it too).
 Off until INBOUND_DOMAIN and RESEND_INBOUND_SECRET are set in Vercel.
*/

export const inboundDomain = () => (process.env.INBOUND_DOMAIN || '').trim().toLowerCase();
export const inboundOn = () => Boolean(inboundDomain() && (process.env.RESEND_INBOUND_SECRET || '').trim());

const tag = (v: string) => sign(`in:${v}`).slice(0, 12);

/** Reply-To for an email to one side of a conversation. side 'o' = the owner replies, 'm' = the manager replies. */
export function threadReplyTo(threadId: string, side: 'o' | 'm'): string | undefined {
  if (!inboundOn()) return undefined;
  return `t-${threadId}-${side}-${tag(`${threadId}:${side}`)}@${inboundDomain()}`;
}

/** Extra Reply-To for outreach: replies still reach hello@ and also mark the contact as replied. */
export function outreachReplyTo(contactId: string): string[] | undefined {
  if (!inboundOn()) return undefined;
  return ['hello@cohostcompare.com', `o-${contactId}-${tag(`o:${contactId}`)}@${inboundDomain()}`];
}

/** Line added to emails when replying by email works. */
export const replyHint = () => (inboundOn() ? 'You can reply to this email, or use the button below.' : 'Reply on CoHostCompare so everything stays in one place.');

export type Parsed = { kind: 'thread'; threadId: string; side: 'o' | 'm' } | { kind: 'outreach'; contactId: string } | null;

export function parseAddress(addr: string): Parsed {
  const local = addr.toLowerCase().replace(/^.*</, '').replace(/>.*$/, '').split('@')[0];
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  let m = local.match(new RegExp(`^t-(${uuid})-([om])-([0-9a-f]{12})$`));
  if (m && safeEq(m[3], tag(`${m[1]}:${m[2]}`))) return { kind: 'thread', threadId: m[1], side: m[2] as 'o' | 'm' };
  m = local.match(new RegExp(`^o-(${uuid})-([0-9a-f]{12})$`));
  if (m && safeEq(m[2], tag(`o:${m[1]}`))) return { kind: 'outreach', contactId: m[1] };
  return null;
}

function safeEq(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Verifies a Resend (Svix) webhook signature: HMAC-SHA256 of `${id}.${timestamp}.${body}` with the base64 secret after whsec_. */
export function verifyWebhook(body: string, h: { id: string | null; timestamp: string | null; signature: string | null }) {
  const secret = (process.env.RESEND_INBOUND_SECRET || '').trim();
  if (!secret || !h.id || !h.timestamp || !h.signature) return false;
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${h.id}.${h.timestamp}.${body}`).digest('base64');
  return h.signature.split(' ').some((part) => { const [v, sig] = part.split(','); return v === 'v1' && sig && safeEq(sig, expected); });
}

/** Keeps only the new part of an email reply: drops quoted history, signatures' "sent from" lines and trailing blank lines. */
export function stripReply(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  const stop = [/wrote:\s*$/i, /^-{2,}\s*Original Message/i, /^_{5,}\s*$/, /^From:\s.+/i, /^Sent from my /i, /^Get Outlook for /i];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('>') || stop.some((re) => re.test(l))) break;
    // "On Tue, 1 Oct 2026 at 9:00 am, X <y>" + "wrote:" split over two lines
    if (/^On\s/i.test(l) && /wrote:\s*$/i.test(lines[i + 1] || '')) break;
    out.push(lines[i]);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 4000);
}

/** Plain text from an HTML-only email. */
export function htmlToText(html: string) {
  return html
    .replace(/<blockquote[\s\S]*$/i, '') // quoted history
    .replace(/<div class="gmail_quote[\s\S]*$/i, '')
    .replace(/<(br|\/p|\/div|\/li)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
}

export async function fetchReceived(emailId: string): Promise<{ from?: string; subject?: string; text?: string | null; html?: string | null } | null> {
  const key = (process.env.RESEND_API_KEY || '').trim();
  const r = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!r.ok) { console.error('Resend receiving', r.status, await r.text()); return null; }
  return r.json();
}

export const bareEmail = (s: string) => (s.match(/<([^>]+)>/)?.[1] || s).trim().toLowerCase();
