'use server';

import { allow, callerKey } from '@/lib/rate';
import { adminClient } from '@/lib/supabase/server';

type State = { ok?: boolean; error?: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Tell me when managers cover this address": an owner sign-up on the waitlist (shown on /admin/owners#waitlist). */
export async function notifyWhenCovered(_: State, form: FormData): Promise<State> {
  if (form.get('website_url')) return { ok: true }; // honeypot
  const email = String(form.get('email') || '').trim().slice(0, 254);
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.' };
  if (!(await allow('notify', await callerKey(), 5, 3600e3))) return { error: 'That’s a few in a row. Try again in an hour.' };
  const postcode = /^\d{4}$/.test(String(form.get('postcode') || '')) ? String(form.get('postcode')) : null;
  const place = String(form.get('place') || '').trim().slice(0, 90);
  const { error } = await adminClient().from('waitlist').insert({ type: 'owner', email, postcode, source: `No managers: ${place || postcode || 'unknown'}`.slice(0, 120) });
  if (error) { console.error('waitlist', error); return { error: 'That didn’t go through. Try again in a minute.' }; }
  return { ok: true };
}
