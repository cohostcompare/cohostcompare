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
  const d = raw.replace(/[^\d+]/g, '');
  const m = d.match(/^(?:\+?61|0)?(4\d{8})$/);
  return m ? `+61${m[1]}` : null;
}

export async function sendSms(to: string, body: string, meta: { managerId?: string; kind: string }) {
  if (!smsOn()) return false;
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
  if (!ok) console.error('SMS failed', detail);
  return ok;
}

/** Texts a manager's alert mobile if they're on a paid plan and have alerts on. Never throws. */
export async function smsManager(slug: string, kind: 'request' | 'accepted' | 'test', body: string) {
  try {
    if (!smsOn()) return false;
    const { data: m } = await adminClient().from('managers').select('id, sms_mobile, sms_enabled').eq('slug', slug).maybeSingle();
    if (!m?.sms_enabled || !m.sms_mobile) return false;
    if (!isPro((await plansFor([m.id])).get(m.id))) return false;
    return await sendSms(m.sms_mobile, body, { managerId: m.id, kind });
  } catch (e) { console.error('smsManager', e); return false; }
}
