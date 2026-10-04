'use server';

import { sendEmail } from '@/lib/email';
import { adminClient } from '@/lib/supabase/server';

export type Found = { name: string; slug: string; cities: string[] };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Published managers whose name contains the search text (for "Find your profile" on /managers). */
export async function findManagers(q: string): Promise<Found[]> {
  const text = q.trim().replace(/[%_,()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
  if (text.length < 2) return [];
  const { data } = await adminClient().from('managers').select('name, slug, cities').eq('published', true).ilike('name', `%${text}%`).order('name').limit(8);
  return (data || []).map((m) => ({ name: m.name, slug: m.slug, cities: (m.cities as string[] | null) || [] }));
}

type State = { ok?: boolean; error?: string };

/** "Can't find your business?": saves the details and emails hello@ so Ben can build the profile and send a claim link. */
export async function requestProfile(_: State, form: FormData): Promise<State> {
  if (form.get('website_url')) return { ok: true }; // honeypot
  const business = String(form.get('business') || '').trim().slice(0, 160);
  const website = String(form.get('website') || '').trim().slice(0, 120);
  const email = String(form.get('email') || '').trim().toLowerCase();
  const areas = String(form.get('areas') || '').trim().slice(0, 300);
  if (!business) return { error: 'Enter your business name.' };
  if (!EMAIL.test(email)) return { error: 'Enter a valid work email address.' };
  if (!areas) return { error: 'Tell us the areas you serve.' };
  const { error } = await adminClient().from('waitlist').insert({ type: 'manager', business, email, postcodes: areas, source: website || 'cohostcompare.com/managers' });
  if (error) { console.error('waitlist', error); return { error: "That didn't go through. Try again in a minute." }; }
  await sendEmail({
    to: 'hello@cohostcompare.com',
    subject: `Profile requested: ${business}`,
    text: `A manager couldn't find their profile on /managers and asked for one.\n\nBusiness: ${business}\nWebsite: ${website || 'not given'}\nWork email: ${email}\nAreas served: ${areas}\n\nBuild the profile, then send them a claim link within two business days.`,
    replyTo: email,
  });
  return { ok: true };
}
