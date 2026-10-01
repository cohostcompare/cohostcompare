'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { sendEmail } from '@/lib/email';
import { CATEGORIES, cleanUrl, manageUrl, setSetting } from '@/lib/partners';
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
  if (form.has('fee_terms')) patch.fee_terms = String(form.get('fee_terms') || '').trim().slice(0, 500) || null;
  if (['pending', 'approved', 'hidden', 'rejected'].includes(status)) patch.status = status;
  await db.from('partners').update(patch).eq('id', id);
  if (status === 'approved' && before.status !== 'approved') {
    await sendEmail({ to: before.email, subject: `${before.name} is approved as a CoHostCompare partner`, text: `Hi ${before.contact_name?.split(' ')[0] || 'there'},\n\nGood news: we've approved ${before.name} as a CoHostCompare partner.\n\nOne last step: please review and accept our partner agreement in your partner page. Your offer goes live to owners once you do${(await liveNow()) ? '' : ' (partner offers are launching soon, and we’ll let you know when they do)'}:\n${manageUrl(id)}\n\nThat page is also where you'll update your offer and see how many owners click it, so keep the link handy.\n\nBen Deeley\nFounder, CoHostCompare` });
  }
  done();
}

async function liveNow() {
  const { data } = await adminClient().from('site_settings').select('value').eq('key', 'offers_live').maybeSingle();
  return data?.value === true;
}

export async function setOffersLive(form: FormData) {
  await requireAdmin('/admin/partners');
  const on = form.get('live') === '1';
  const was = await liveNow();
  await setSetting('offers_live', on);
  if (on && !was) {
    // Tell approved partners their offer is now in front of owners.
    const { data } = await adminClient().from('partners').select('id, name, email, contact_name').eq('status', 'approved').not('agreed_at', 'is', null);
    for (const p of data || []) {
      await sendEmail({ to: p.email, subject: `${p.name}'s offer is now live on CoHostCompare`, text: `Hi ${p.contact_name?.split(' ')[0] || 'there'},\n\nPartner offers are now live, and ${p.name}'s offer is showing to owners in our setup guide:\nhttps://www.cohostcompare.com/setup#partners\n\nSee your clicks and update your offer any time here:\n${manageUrl(p.id)}\n\nBen Deeley\nFounder, CoHostCompare` });
    }
  }
  done();
}

const t = (f: FormData, k: string, n: number) => String(f.get(k) || '').trim().slice(0, n) || null;

/** Edit any partner's details from admin. */
export async function editPartner(form: FormData) {
  await requireAdmin('/admin/partners');
  const category = String(form.get('category') || '');
  const name = t(form, 'name', 120), email = t(form, 'email', 200);
  if (!name || !email) return;
  await adminClient().from('partners').update({
    name, email: email.toLowerCase(), contact_name: t(form, 'contact_name', 120), phone: t(form, 'phone', 30), website: cleanUrl(form.get('website')),
    category: (CATEGORIES as readonly string[]).includes(category) ? category : 'Other', areas: t(form, 'areas', 200),
    offer_title: t(form, 'offer_title', 80), offer_body: t(form, 'offer_body', 600), offer_url: cleanUrl(form.get('offer_url')), promo_code: t(form, 'promo_code', 40), logo_url: cleanUrl(form.get('logo_url')),
    updated_at: new Date().toISOString(),
  }).eq('id', String(form.get('id') || ''));
  done();
}

/** Emails a partner the link to their private partner page. */
export async function emailPartnerLink(form: FormData) {
  await requireAdmin('/admin/partners');
  const id = String(form.get('id') || '');
  const { data: p } = await adminClient().from('partners').select('name, email, contact_name').eq('id', id).maybeSingle();
  if (p) await sendEmail({ to: p.email, subject: 'Your CoHostCompare partner page', text: `Hi ${p.contact_name?.split(' ')[0] || 'there'},\n\nHere's the link to ${p.name}'s private partner page, where you can update your offer and see how many owners clicked it:\n${manageUrl(id)}\n\nKeep it to yourself: anyone with the link can edit your offer.\n\nBen Deeley\nFounder, CoHostCompare` });
  done();
}

export async function deletePartner(form: FormData) {
  await requireAdmin('/admin/partners');
  if (form.get('confirm') !== 'yes') return;
  await adminClient().from('partners').delete().eq('id', String(form.get('id') || ''));
  done();
}
