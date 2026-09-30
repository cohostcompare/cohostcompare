'use server';

import { sendEmail } from '@/lib/email';
import { myManagers } from '@/lib/managers';
import { registerInterest } from '@/lib/pro';
import { currentUser } from '@/lib/supabase/server';

type State = { ok?: boolean; error?: string };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One form handler for Pro interest, Enterprise and partner enquiries (and older suburb report sign-ups). */
export async function interestAction(_: State, form: FormData): Promise<State> {
  const kind = String(form.get('kind') || '') as 'pro' | 'report' | 'partner' | 'enterprise';
  if (!['pro', 'report', 'partner', 'enterprise'].includes(kind)) return { error: 'Something went wrong. Refresh and try again.' };
  if (form.get('website_url')) return { ok: true }; // honeypot
  const user = await currentUser();
  const email = String(form.get('email') || user?.email || '').trim();
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address.' };
  const name = String(form.get('name') || '').trim().slice(0, 120) || null;
  const area = String(form.get('area') || '').trim().slice(0, 120) || null;
  const note = String(form.get('note') || '').trim().slice(0, 1000) || null;
  let managerId: string | null = null;
  if (kind === 'pro') {
    const id = String(form.get('manager') || '');
    if (!user || !(await myManagers(user.id)).some((m) => m.id === id)) return { error: 'Sign in to your manager dashboard first.' };
    managerId = id;
  }
  if (kind === 'partner' && (!name || !note)) return { error: 'Add your business name and what you offer.' };
  if (kind === 'enterprise' && !name) return { error: 'Add your business name.' };
  if (!(await registerInterest({ kind, email, name, manager_id: managerId, area, note }))) return { error: 'We couldn’t save that just now. Try again in a minute.' };
  const what = { pro: 'Pro interest', report: `Suburb report interest${area ? `: ${area}` : ''}`, partner: `Partner enquiry: ${name}`, enterprise: `Enterprise enquiry: ${name}` }[kind];
  await sendEmail({ to: 'hello@cohostcompare.com', subject: what, text: `${what}\n\nEmail: ${email}${name ? `\nName: ${name}` : ''}${area ? `\nArea: ${area}` : ''}${note ? `\n\n${note}` : ''}`, replyTo: email });
  return { ok: true };
}
