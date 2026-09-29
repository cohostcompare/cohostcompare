import 'server-only';

// Sends email through Resend from hello@cohostcompare.com. Replies land in Gmail.
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Wraps plain text in the branded CoHostCompare email layout. */
export function brandedHtml(text: string, cta?: { label: string; url: string }) {
  const body = esc(text).replace(/(https:\/\/[^\s]+)/g, '<a href="$1" style="color:#0F5E57;">$1</a>').replace(/\n/g, '<br>');
  const button = cta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0;"><tr><td align="center" bgcolor="#0F5E57" style="border-radius:10px;"><a href="${cta.url}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:10px;">${esc(cta.label)}</a></td></tr></table>` : '';
  return `<!doctype html><html lang="en"><body style="margin:0;padding:0;background:#F3F6F5;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F6F5;"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;"><tr><td align="center" style="padding:0 0 24px;"><a href="https://www.cohostcompare.com" style="text-decoration:none;"><img src="https://www.cohostcompare.com/email/logo-mark.png" width="44" height="44" alt="" style="display:block;border:0;width:44px;height:44px;margin:0 auto 8px;"><span style="font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:bold;color:#10302F;">CoHostCompare</span></a></td></tr><tr><td style="background:#FFFFFF;border:1px solid #DCE5E2;border-radius:14px;padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:23px;color:#10302F;">${body}${button}</td></tr><tr><td align="center" style="padding:24px 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#4A605D;">CoHostCompare · Sydney, Australia · <a href="mailto:hello@cohostcompare.com" style="color:#0F5E57;text-decoration:none;">hello@cohostcompare.com</a></td></tr></table></td></tr></table></body></html>`;
}

export async function sendEmail({ to, subject, text, replyTo, cta }: { to: string | string[]; subject: string; text: string; replyTo?: string; cta?: { label: string; url: string } }) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) { console.warn('RESEND_API_KEY missing; email not sent:', subject); return false; }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'CoHostCompare <hello@cohostcompare.com>', to, subject, text, html: brandedHtml(text, cta), reply_to: replyTo || 'hello@cohostcompare.com' }),
  });
  if (!r.ok) console.error('Resend error', r.status, await r.text());
  return r.ok;
}
