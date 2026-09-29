import 'server-only';

// Sends email through Resend from hello@cohostcompare.com. Replies land in Gmail.
export async function sendEmail({ to, subject, text, replyTo }: { to: string | string[]; subject: string; text: string; replyTo?: string }) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) { console.warn('RESEND_API_KEY missing; email not sent:', subject); return false; }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'CoHostCompare <hello@cohostcompare.com>', to, subject, text, reply_to: replyTo || 'hello@cohostcompare.com' }),
  });
  if (!r.ok) console.error('Resend error', r.status, await r.text());
  return r.ok;
}
