import 'server-only';
import { plansFor, isPro } from '@/lib/pro';
import { adminClient } from '@/lib/supabase/server';

/*
 SMS alerts for Pro and Enterprise managers, sent through ClickSend (Australian provider).
 Vercel env: CLICKSEND_USERNAME, CLICKSEND_API_KEY, and SMS_FROM (a dedicated ClickSend number like +614..., or a
 sender name registered on the ACMA Sender ID Register). Off until the username and key are set.
*/

export const smsOn = () => Boolean((process.env.CLICKSEND_USERNAME || '').trim() && (process.env.CLICKSEND_API_KEY || '').trim());

/** Normalises an Australian mobile to +614XXXXXXXX, or null if it isn't one. */
export function auMobile(raw: string): string | null {
  // Accepts 0412 345 678, 0412-345-678, (04) 1234 5678, 412345678, +61 412 345 678, +61 (0)412 345 678, 61412345678, 0061 412...
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0061')) d = d.slice(4);
  else if (d.startsWith('61') && d.length >= 11) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return /^4\d{8}$/.test(d) ? `+61${d}` : null;
}

export async function sendSms(to: string, body: string, meta: { managerId?: string; kind: string }) {
  return (await sendSmsDetailed(to, body, meta)).ok;
}

export async function sendSmsDetailed(to: string, body: string, meta: { managerId?: string; kind: string }): Promise<{ ok: boolean; detail: string }> {
  if (!smsOn()) return { ok: false, detail: 'SMS not set up' };
  const auth = Buffer.from(`${process.env.CLICKSEND_USERNAME!.trim()}:${process.env.CLICKSEND_API_KEY!.trim()}`).toString('base64');
  let ok = false, detail = '';
  try {
    const r = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ to, body: body.slice(0, 300), source: 'cohostcompare', ...(process.env.SMS_FROM ? { from: process.env.SMS_FROM.trim() } : {}) }] }),
      cache: 'no-store',
    });
    const j = await r.json().catch(() => null) as { data?: { messages?: { status?: string }[] }; response_msg?: string } | null;
    const status = j?.data?.messages?.[0]?.status;
    ok = r.ok && status === 'SUCCESS';
    detail = status || j?.response_msg || String(r.status);
  } catch (e) { detail = String(e).slice(0, 200); }
  await adminClient().from('sms_log').insert({ manager_id: meta.managerId ?? null, to_mobile: to, kind: meta.kind, ok, detail }).then(() => {}, () => {});
  if (!ok) {
    console.error('SMS failed', detail);
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({ to: 'hello@cohostcompare.com', subject: 'SMS failed to send', text: `A text to ${to} (${meta.kind}) failed.\n\nClickSend said: ${detail}\n\nCommon causes: no credit, SMS_FROM isn't a number or approved sender on your ClickSend account, or the account is still in trial mode (trial accounts can only text your own verified number).` }).catch(() => {});
  }
  return { ok, detail };
}

/** Texts a manager's alert mobile if they're on a paid plan and have alerts on. Never throws. */
export async function smsManager(slug: string, kind: 'request' | 'accepted' | 'message' | 'test', body: string) {
  try {
    if (!smsOn()) return false;
    const { data: m } = await adminClient().from('managers').select('id, sms_mobile, sms_enabled').eq('slug', slug).maybeSingle();
    if (!m?.sms_enabled || !m.sms_mobile) return false;
    if (!isPro((await plansFor([m.id])).get(m.id))) return false;
    if (kind === 'message') {
      // One text per 30 minutes for owner messages, so a chatty conversation doesn't flood their phone.
      const { count } = await adminClient().from('sms_log').select('id', { count: 'exact', head: true }).eq('manager_id', m.id).eq('kind', 'message').eq('ok', true).gte('created_at', new Date(Date.now() - 30 * 60e3).toISOString());
      if (count) return false;
    }
    return await sendSms(m.sms_mobile, body, { managerId: m.id, kind });
  } catch (e) { console.error('smsManager', e); return false; }
}
