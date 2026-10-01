'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { sendEmail } from '@/lib/email';
import { manageUrl, setSetting } from '@/lib/partners';
import { adminClient } from '@/lib/supabase/server';

const done = () => { revalidatePath('/admin/partners'); revalidatePath('/setup'); };

export async function setPartner(form: FormData) {
  await requireAdmin('/admin/partners');
  const id = String(form.get('id') || '');
  const status = String(form.get('status') || '');
  const db = adminClient();
  const { data: before } = await db.from('partners').select('name, email, contact_name, status').eq('id', id).maybeSingle();
  if (!before) return;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), referral_fee: form.get('referral_fee') === 'on', admin_note: String(form.get('admin_note') || '').slice(0, 1000) || null, sort: Number(form.get('sort')) || 100 };
  if (['pending', 'approved', 'hidden', 'rejected'].includes(status)) patch.status = status;
  await db.from('partners').update(patch).eq('id', id);
  if (status === 'approved' && before.status !== 'approved') {
    await sendEmail({ to: before.email, subject: `${before.name} is approved as a CoHostCompare partner`, text: `Hi ${before.contact_name?.split(' ')[0] || 'there'},\n\nGood news: your offer is approved. It will show to owners in the partner offers on our owner setup guide${(await liveNow()) ? ', starting now' : ' as soon as partner offers launch, and we’ll let you know when that happens'}.\n\nUpdate your offer and see how many owners click it here:\n${manageUrl(id)}\n\nBen Deeley\nFounder, CoHostCompare` });
  }
  done();
}

async function liveNow() {
  const { data } = await adminClient().from('site_settings').select('value').eq('key', 'offers_live').maybeSingle();
  return data?.value === true;
}

export async function setOffersLive(form: FormData) {
  await requireAdmin('/admin/partners');
  await setSetting('offers_live', form.get('live') === '1');
  done();
}
