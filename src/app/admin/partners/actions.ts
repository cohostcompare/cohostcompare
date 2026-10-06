'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { sendEmail } from '@/lib/email';
import { CATEGORIES, cleanUrl, manageUrl, OFFER_KEYS, setSetting, type PendingOffer } from '@/lib/partners';
import { adminClient } from '@/lib/supabase/server';

const done = () => { revalidatePath('/admin/partners'); revalidatePath('/setup'); };

export async function setPartner(form: FormData) {
  await requireAdmin('/admin/partners');
  const id = String(form.get('id') || '');
  const status = String(form.get('status') || '');
  const db = adminClient();
  const { data: before } = await db.from('partners').select('name, email, contact_name, status, fee_terms, agreed_at').eq('id', id).maybeSingle();
  if (!before) return;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), admin_note: String(form.get('admin_note') || '').slice(0, 1000) || null, sort: Number(form.get('sort')) || 100 };
  const reason = String(form.get('reason') || '').trim().slice(0, 600);
  let termsChanged = false;
  if (form.has('fee_terms')) {
    const fee_terms = String(form.get('fee_terms') || '').trim().slice(0, 500) || null;
    patch.fee_terms = fee_terms;
    patch.referral_fee = Boolean(fee_terms); // "we earn a referral fee" is simply whether there are commercial terms
    termsChanged = (fee_terms || null) !== (before.fee_terms || null);
    // Changed terms for a partner who already accepted: they must accept again, so the offer comes off until they do.
    if (termsChanged && before.agreed_at) { patch.agreed_at = null; patch.agreed_version = null; patch.agreed_name = null; }
  }
  if (['pending', 'approved', 'hidden', 'rejected'].includes(status)) patch.status = status;
  await db.from('partners').update(patch).eq('id', id);
  const first = before.contact_name?.split(' ')[0] || 'there';
  if (termsChanged && before.agreed_at) {
    await sendEmail({ to: before.email, subject: `Your CoHostCompare partner terms have changed: please accept again`, text: `Hi ${first},\n\nWe've updated the commercial terms for ${before.name}'s partner listing on CoHostCompare.\n\nNew terms: ${patch.fee_terms || 'free listing, no fees'}\nPrevious terms: ${before.fee_terms || 'free listing, no fees'}\n\nYour offer is paused until you've reviewed and accepted the new terms in your partner page (it takes a minute):\n${manageUrl(id)}\n\nAny questions, just reply to this email.\n\nThe CoHostCompare team` });
  }
  if ((status === 'rejected' || status === 'hidden') && before.status !== status) {
    const hidden = status === 'hidden';
    await sendEmail({ to: before.email, subject: hidden ? `${before.name}'s offer on CoHostCompare is paused` : `Your CoHostCompare partner application`, text: `Hi ${first},\n\n${hidden ? `We've paused ${before.name}'s offer, so it isn't showing to owners for now.` : `Thanks for applying to partner with CoHostCompare. We aren't able to list ${before.name}'s offer at the moment.`}${reason ? `\n\nWhy: ${reason}` : ''}\n\nIf you'd like to talk about it, reply to this email.\n\nThe CoHostCompare team` });
  }
  if (status === 'approved' && before.status !== 'approved') {
    await sendEmail({ to: before.email, subject: `${before.name} is approved as a CoHostCompare partner`, text: `Hi ${before.contact_name?.split(' ')[0] || 'there'},\n\nGood news: we've approved ${before.name} as a CoHostCompare partner.\n\nOne last step: please review and accept our partner agreement in your partner page. Your offer goes live to owners once you do${(await liveNow()) ? '' : ' (partner offers are launching soon, and we’ll let you know when they do)'}:\n${manageUrl(id)}\n\nThat page is also where you'll update your offer and see how many owners click it, so keep the link handy.\n\nThe CoHostCompare team` });
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
      await sendEmail({ to: p.email, subject: `${p.name}'s offer is now live on CoHostCompare`, text: `Hi ${p.contact_name?.split(' ')[0] || 'there'},\n\nPartner offers are now live, and ${p.name}'s offer is showing to owners in our setup guide:\nhttps://www.cohostcompare.com/setup#partners\n\nSee your clicks and update your offer any time here:\n${manageUrl(p.id)}\n\nThe CoHostCompare team` });
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
  if (p) await sendEmail({ to: p.email, subject: 'Your CoHostCompare partner page', text: `Hi ${p.contact_name?.split(' ')[0] || 'there'},\n\nHere's the link to ${p.name}'s private partner page, where you can update your offer and see how many owners clicked it:\n${manageUrl(id)}\n\nKeep it to yourself: anyone with the link can edit your offer.\n\nThe CoHostCompare team` });
  done();
}

/** Approve or reject an approved partner's held offer edits (SQL 027). Approving replaces the live wording; rejecting discards it and tells them. */
export async function reviewOfferEdit(form: FormData) {
  await requireAdmin('/admin/partners');
  const id = String(form.get('id') || '');
  const decision = String(form.get('decision') || '');
  const db = adminClient();
  const { data: p } = await db.from('partners').select('name, email, contact_name, pending_offer, pending_review').eq('id', id).maybeSingle();
  if (!p || !p.pending_review || !p.pending_offer) return;
  const offer = p.pending_offer as PendingOffer;
  const first = p.contact_name?.split(' ')[0] || 'there';
  if (decision === 'approve') {
    const next = Object.fromEntries(OFFER_KEYS.map((k) => [k, offer[k] ?? null]));
    await db.from('partners').update({ ...next, pending_offer: null, pending_review: false, updated_at: new Date().toISOString() }).eq('id', id);
    await sendEmail({ to: p.email, subject: `${p.name}'s updated offer is live on CoHostCompare`, text: `Hi ${first},\n\nWe've checked your offer changes and they're now showing to owners:\n\n${offer.offer_title}\n${offer.offer_body}${offer.promo_code ? `\nCode: ${offer.promo_code}` : ''}\n\nYour partner page: ${manageUrl(id)}\n\nThe CoHostCompare team` });
  } else if (decision === 'reject') {
    const reason = String(form.get('reason') || '').trim().slice(0, 600);
    await db.from('partners').update({ pending_offer: null, pending_review: false, updated_at: new Date().toISOString() }).eq('id', id);
    await sendEmail({ to: p.email, subject: `About your offer changes on CoHostCompare`, text: `Hi ${first},\n\nWe weren't able to approve the recent changes to ${p.name}'s offer, so your previous offer stays as it was.${reason ? `\n\nWhy: ${reason}` : ''}\n\nYou can edit the offer again from your partner page, or reply to this email if you'd like to talk it through:\n${manageUrl(id)}\n\nThe CoHostCompare team` });
  } else return;
  done();
}

export async function deletePartner(form: FormData) {
  await requireAdmin('/admin/partners');
  if (form.get('confirm') !== 'yes') return;
  await adminClient().from('partners').delete().eq('id', String(form.get('id') || ''));
  done();
}
