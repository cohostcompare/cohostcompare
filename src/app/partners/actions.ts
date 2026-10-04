'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendEmail } from '@/lib/email';
import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { CATEGORIES, cleanUrl, manageOk, manageUrl, OFFER_KEYS, PARTNER_TERMS_VERSION, type PendingOffer } from '@/lib/partners';
import { adminClient } from '@/lib/supabase/server';

type State = { ok?: string; error?: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const t = (f: FormData, k: string, n: number) => String(f.get(k) || '').trim().slice(0, n) || null;

function offerFields(form: FormData) {
  const category = String(form.get('category') || '');
  return {
    category: (CATEGORIES as readonly string[]).includes(category) ? category : 'Other',
    areas: t(form, 'areas', 200),
    offer_title: t(form, 'offer_title', 80),
    offer_body: t(form, 'offer_body', 600),
    offer_url: cleanUrl(form.get('offer_url')),
    promo_code: t(form, 'promo_code', 40),
    logo_url: cleanUrl(form.get('logo_url')),
  };
}

export async function applyPartner(_: State, form: FormData): Promise<State> {
  if (form.get('website_url')) return { ok: 'Thanks.' }; // honeypot
  const name = t(form, 'name', 120), email = String(form.get('email') || '').trim().toLowerCase();
  if (!name) return { error: 'Add your business name.' };
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.' };
  const o = offerFields(form);
  if (!o.offer_title || !o.offer_body) return { error: 'Add a short offer title and the details of your offer.' };
  if (!o.offer_url) return { error: 'Add the link owners should go to for the offer (starting with https://).' };
  const row = { name, email, contact_name: t(form, 'contact_name', 120), phone: t(form, 'phone', 30), website: cleanUrl(form.get('website')), ...o };
  const db = adminClient();
  // Applied before with this email? Don't make a second listing: send them their existing link instead (same message either way).
  const { data: existing } = await db.from('partners').select('id, name, contact_name').ilike('email', email).neq('status', 'rejected').order('created_at').limit(1).maybeSingle();
  if (existing) {
    await sendEmail({ to: email, subject: 'Your CoHostCompare partner page', text: `Hi ${existing.contact_name?.split(' ')[0] || 'there'},\n\nYou've already applied as ${existing.name}, so we haven't made a second listing. Here's the link to your private partner page, where you can update your offer:\n${manageUrl(existing.id)}\n\nKeep this link to yourself: anyone with it can edit your offer. If you'd like a separate listing for another business, email hello@cohostcompare.com.\n\nBen Deeley\nFounder, CoHostCompare` });
    return { ok: 'Thanks. We’ve emailed you a link to manage your offer, and we’ll be in touch once we’ve reviewed it.' };
  }
  const { data, error } = await db.from('partners').insert(row).select('id').single();
  if (error || !data) { console.error('partner apply', error); return { error: 'We couldn’t save that just now. Try again in a minute, or email hello@cohostcompare.com.' }; }
  await sendEmail({ to: 'hello@cohostcompare.com', subject: `Partner application: ${name} (${o.category})`, text: `${name}\n${row.contact_name || ''} <${email}>${row.phone ? `, ${row.phone}` : ''}\n${row.website || ''}\nAreas: ${o.areas || '-'}\n\nOffer: ${o.offer_title}\n${o.offer_body}\n${o.offer_url || ''}${o.promo_code ? `\nCode: ${o.promo_code}` : ''}`, replyTo: email, cta: { label: 'Review partners', url: 'https://www.cohostcompare.com/admin/partners' } });
  await sendEmail({ to: email, subject: 'Thanks for applying to partner with CoHostCompare', text: `Hi ${row.contact_name?.split(' ')[0] || 'there'},\n\nThanks for applying to offer ${name}'s services to owners on CoHostCompare. We check every partner by hand and will be in touch by email, usually within a few business days.\n\nYou can update your offer, and later see how many owners clicked it, from your private partner page:\n${manageUrl(data.id)}\n\nKeep this link to yourself: anyone with it can edit your offer.\n\nBen Deeley\nFounder, CoHostCompare` });
  return { ok: 'Thanks. We’ve emailed you a link to manage your offer, and we’ll be in touch once we’ve reviewed it.' };
}

export async function updatePartner(_: State, form: FormData): Promise<State> {
  const id = String(form.get('id') || ''), s = String(form.get('s') || '');
  if (!manageOk(id, s)) return { error: 'This link isn’t valid any more. Email hello@cohostcompare.com.' };
  const o = offerFields(form);
  if (!o.offer_title || !o.offer_body) return { error: 'Add a short offer title and the details of your offer.' };
  const db = adminClient();
  const { data: p } = await db.from('partners').select('name, status, offer_title, offer_body, offer_url, promo_code').eq('id', id).maybeSingle();
  if (!p) return { error: 'We couldn’t find your partner listing.' };
  const contact = { contact_name: t(form, 'contact_name', 120), phone: t(form, 'phone', 30), website: cleanUrl(form.get('website')), category: o.category, areas: o.areas, logo_url: o.logo_url };
  const offer: PendingOffer = { offer_title: o.offer_title, offer_body: o.offer_body, offer_url: o.offer_url, promo_code: o.promo_code };
  const offerChanged = OFFER_KEYS.some((k) => (offer[k] || null) !== (p[k] || null));
  // An approved partner's offer is in front of owners, so wording changes wait for admin review (SQL 027). Everything else saves straight away.
  const held = p.status === 'approved' && offerChanged;
  const { error } = await db.from('partners').update({ ...contact, ...(held ? { pending_offer: offer, pending_review: true } : offer), updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: 'We couldn’t save that. Try again in a minute.' };
  await sendEmail({ to: 'hello@cohostcompare.com', subject: held ? `Partner offer edit to review: ${p.name}` : `Partner offer updated: ${p.name}`, text: `${p.name} (${p.status}) ${held ? 'changed their offer. The old wording stays live until you approve the change' : 'updated their offer'}:\n\n${o.offer_title}\n${o.offer_body}\n${o.offer_url || ''}${o.promo_code ? `\nCode: ${o.promo_code}` : ''}\n\n${held ? 'Approve or reject it' : 'Check it'} at /admin/partners.`, cta: { label: 'Open partners', url: 'https://www.cohostcompare.com/admin/partners' } });
  revalidatePath('/setup');
  revalidatePath(`/partners/manage/${id}`);
  return { ok: held ? 'Saved. Your offer changes will show to owners once we’ve checked them, usually within a few business days. Your current offer stays live until then.' : 'Saved.' };
}

export async function resendPartnerLink(_: State, form: FormData): Promise<State> {
  const email = String(form.get('email') || '').trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.' };
  const { data } = await adminClient().from('partners').select('id, name').ilike('email', email).neq('status', 'rejected').limit(5);
  if (data?.length) {
    await sendEmail({ to: email, subject: 'Your CoHostCompare partner page', text: `Hi,

Here ${data.length === 1 ? 'is the link' : 'are the links'} to your private partner page${data.length === 1 ? '' : 's'}, where you can update your offer and see how many owners clicked it:

${data.map((p) => `${p.name}: ${manageUrl(p.id)}`).join('\n')}

Keep ${data.length === 1 ? 'it' : 'them'} to yourself: anyone with the link can edit your offer.

The CoHostCompare team` });
  }
  return { ok: 'If that email belongs to a partner, we’ve sent the link. Check your inbox (and spam folder).' };
}

/** The partner accepts the partner agreement from their partner page (after Ben approves them). */
export async function acceptAgreement(_: State, form: FormData): Promise<State> {
  const id = String(form.get('id') || ''), s = String(form.get('s') || '');
  if (!manageOk(id, s)) return { error: 'This link isn’t valid any more. Email hello@cohostcompare.com.' };
  if (form.get('agree') !== 'on') return { error: 'Tick the box to confirm you accept the partner agreement.' };
  const name = t(form, 'agreed_name', 120);
  if (!name || name.length < 3) return { error: 'Type your full name to accept.' };
  const db = adminClient();
  const { data: p } = await db.from('partners').select('name, email, contact_name, status, fee_terms').eq('id', id).maybeSingle();
  if (!p) return { error: 'We couldn’t find your partner listing.' };
  if (p.status !== 'approved') return { error: 'Your application hasn’t been approved yet. We’ll email you when it is.' };
  const ip = ((await headers()).get('x-forwarded-for') || '').split(',')[0].trim();
  // agreed_fee_terms (SQL 027) records exactly which commercial terms were on screen when they accepted.
  const { error } = await db.from('partners').update({ agreed_at: new Date().toISOString(), agreed_version: PARTNER_TERMS_VERSION, agreed_name: name, agreed_fee_terms: p.fee_terms || null, agreed_ip_hash: ip ? createHash('sha256').update(ip).digest('hex').slice(0, 24) : null }).eq('id', id);
  if (error) { console.error('partner agree', error); return { error: 'We couldn’t save that just now. Please try again in a minute.' }; }
  await sendEmail({ to: p.email, subject: `Welcome to CoHostCompare, ${p.name}`, text: `Hi ${p.contact_name?.split(' ')[0] || 'there'},\n\nThanks for accepting the partner agreement (version ${PARTNER_TERMS_VERSION}), accepted by ${name}. You're all set.\n\nYour partner page is where you update your offer and see how many owners click it:\n${manageUrl(id)}\n\nCommercial terms: ${p.fee_terms || 'free listing, no fees'}.\nThe partner agreement: https://www.cohostcompare.com/partners/agreement\n\nBen Deeley\nFounder, CoHostCompare` });
  await sendEmail({ to: 'hello@cohostcompare.com', subject: `Partner agreement accepted: ${p.name}`, text: `${name} accepted the partner agreement (version ${PARTNER_TERMS_VERSION}) for ${p.name}.\nCommercial terms: ${p.fee_terms || 'free listing, no fees'}.` });
  revalidatePath(`/partners/manage/${id}`);
  revalidatePath('/setup');
  redirect(`/partners/manage/${id}?s=${encodeURIComponent(s)}&agreed=1`);
}
