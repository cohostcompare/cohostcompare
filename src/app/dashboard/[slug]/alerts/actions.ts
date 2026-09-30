'use server';

import { revalidatePath } from 'next/cache';
import { requireManager } from '@/lib/managers';
import { isPro, plansFor } from '@/lib/pro';
import { auMobile, sendSms, smsOn } from '@/lib/sms';
import { adminClient } from '@/lib/supabase/server';

type State = { ok?: string; error?: string };

export async function saveAlerts(_: State, form: FormData): Promise<State> {
  const slug = String(form.get('slug') || '');
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/alerts`);
  const raw = String(form.get('mobile') || '').trim();
  const mobile = raw ? auMobile(raw) : null;
  if (raw && !mobile) return { error: 'Enter an Australian mobile number, like 0412 345 678.' };
  const pro = isPro((await plansFor([m.id])).get(m.id));
  const smsEnabled = pro && Boolean(mobile) && form.get('sms') === 'on';
  const { error } = await adminClient().from('managers').update({ sms_mobile: mobile, sms_enabled: smsEnabled, report_emails: form.get('reports') === 'on' }).eq('id', m.id);
  if (error) return { error: 'We couldn’t save that. Try again in a minute.' };
  revalidatePath(`/dashboard/${slug}/alerts`);
  return { ok: 'Saved.' };
}

export async function testSms(_: State, form: FormData): Promise<State> {
  const slug = String(form.get('slug') || '');
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/alerts`);
  if (!smsOn()) return { error: 'Text messages aren’t switched on yet. We’re finishing the set-up.' };
  if (!isPro((await plansFor([m.id])).get(m.id))) return { error: 'SMS alerts are part of Pro.' };
  const { data } = await adminClient().from('managers').select('sms_mobile').eq('id', m.id).maybeSingle();
  if (!data?.sms_mobile) return { error: 'Save a mobile number first.' };
  const ok = await sendSms(data.sms_mobile, `CoHostCompare: test alert for ${m.name}. You'll get a text like this when an owner asks you for a quote.`, { managerId: m.id, kind: 'test' });
  return ok ? { ok: 'Test sent. It should arrive within a minute.' } : { error: 'The text didn’t send. Check the number and try again.' };
}
