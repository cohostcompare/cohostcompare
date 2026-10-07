import 'server-only';

// Sends email through Resend from hello@cohostcompare.com. Replies land in Gmail, or in the conversation when reply tracking is on (src/lib/inbound.ts).
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Wraps plain text in the branded CoHostCompare email layout. */
/**
 * Every link to our own site in an email carries utm_medium=email (unless it already has utm tags), so a visit from any email,
 * including a link checker that follows every link the moment it lands, is counted as "Email" on /admin/ads rather than Google search.
 */
export function tagLink(url: string) {
  try {
    const u = new URL(url);
    if (!/(^|\.)cohostcompare\.com$/i.test(u.hostname) || u.searchParams.has('utm_medium')) return url;
    u.searchParams.set('utm_medium', 'email');
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'email');
    return u.toString();
  } catch { return url; }
}
const tagText = (t: string) => t.replace(/https:\/\/(www\.)?cohostcompare\.com[^\s)]*/g, (m) => tagLink(m));

export function brandedHtml(text: string, cta?: { label: string; url: string }) {
  const body = esc(tagText(text)).replace(/(https:\/\/[^\s]+)/g, '<a href="$1" style="color:#0F5E57;">$1</a>').replace(/\n/g, '<br>');
  const button = cta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0;"><tr><td align="center" bgcolor="#0F5E57" style="border-radius:10px;"><a href="${tagLink(cta.url)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:10px;">${esc(cta.label)}</a></td></tr></table>` : '';
  return `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#F3F6F5;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F6F5;"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;"><tr><td align="center" style="padding:0 0 24px;"><a href="https://www.cohostcompare.com" style="text-decoration:none;"><img src="https://www.cohostcompare.com/email/logo-mark.png" width="44" height="44" alt="" style="display:block;border:0;width:44px;height:44px;margin:0 auto 8px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:bold;color:#10302F;">CoHostCompare</span></a></td></tr><tr><td style="background:#FFFFFF;border:1px solid #DCE5E2;border-radius:14px;padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#10302F;">${body}${button}</td></tr><tr><td align="center" style="padding:24px 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#4A605D;">CoHostCompare · Sydney, Australia · <a href="mailto:hello@cohostcompare.com" style="color:#0F5E57;text-decoration:none;">hello@cohostcompare.com</a></td></tr></table></td></tr></table></body></html>`;
}

/** Domain of the first recipient, for failure logs (never the address itself). */
const firstDomain = (to: string | string[]) => (Array.isArray(to) ? to[0] : to || '').replace(/^.*</, '').replace(/>.*$/, '').split('@')[1]?.toLowerCase().slice(0, 120) || null;

/**
 * Records an email Resend refused (or we couldn't reach): a row in email_failures (SQL 027) for /admin,
 * and an alert to hello@ through alertError (deduped for 6 hours). Alerts about alerts are skipped so a Resend outage can't loop.
 */
async function recordFailure(to: string | string[], subject: string, status: string, detail: string) {
  const to_domain = firstDomain(to);
  try {
    const { adminClient } = await import('@/lib/supabase/server');
    await adminClient().from('email_failures').insert({ to_domain, subject: subject.slice(0, 300), status, detail: detail.slice(0, 1000) });
  } catch (e) { console.error('email_failures insert', e); }
  if (subject.startsWith('Site error:')) return;
  try {
    const { alertError } = await import('@/lib/alerts');
    await alertError(new Error(`Email failed (${status}) to ${to_domain || 'unknown'}: ${subject}`), { path: 'email', method: 'SEND', route: 'sendEmail', kind: 'email' });
  } catch (e) { console.error('email alert', e); }
}

export async function sendEmail({ to, subject, text, replyTo, cta, from, headers }: { to: string | string[]; subject: string; text: string; replyTo?: string | string[]; cta?: { label: string; url: string }; from?: string; headers?: Record<string, string> }) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) { console.warn('RESEND_API_KEY missing; email not sent:', subject); return false; }
  let r: Response;
  try {
    r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from || 'CoHostCompare <hello@cohostcompare.com>', to, subject, text: tagText(text), html: brandedHtml(text, cta), reply_to: replyTo || 'hello@cohostcompare.com', ...(headers ? { headers } : {}) }),
    });
  } catch (e) {
    console.error('Resend unreachable', e);
    await recordFailure(to, subject, 'fetch', String((e as Error)?.message || e));
    return false;
  }
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    console.error('Resend error', r.status, detail);
    await recordFailure(to, subject, String(r.status), detail);
  }
  return r.ok;
}
