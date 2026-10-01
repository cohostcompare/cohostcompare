'use server';

import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';
import { CATEGORIES, cleanUrl, manageOk, manageUrl } from '@/lib/partners';
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
  const row = { name, email, contact_name: t(form, 'contact_name', 120), phone: t(form, 'phone', 30), website: cleanUrl(form.get('website')), ...o };
  const { data, error } = await adminClient().from('partners').insert(row).select('id').single();
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
  const { data: p } = await db.from('partners').select('name, status').eq('id', id).maybeSingle();
  if (!p) return { error: 'We couldn’t find your partner listing.' };
  const { error } = await db.from('partners').update({ ...o, contact_name: t(form, 'contact_name', 120), phone: t(form, 'phone', 30), website: cleanUrl(form.get('website')), updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return { error: 'We couldn’t save that. Try again in a minute.' };
  await sendEmail({ to: 'hello@cohostcompare.com', subject: `Partner offer updated: ${p.name}`, text: `${p.name} (${p.status}) updated their offer:\n\n${o.offer_title}\n${o.offer_body}\n${o.offer_url || ''}${o.promo_code ? `\nCode: ${o.promo_code}` : ''}\n\nCheck it at /admin/partners.` });
  revalidatePath('/setup');
  return { ok: 'Saved.' };
}
