'use server';

import { headers } from 'next/headers';
import { CONSENT_TEXT, FIRST_FOLLOW_UP_DAYS, STATES, guideLink, sendGuideEmail } from '@/lib/guide';
import { adminClient } from '@/lib/supabase/server';

export type GuideState = { ok?: boolean; link?: string; error?: string };

/** Email in, guide out: shows the download straight away and emails the link. */
export async function requestGuide(_: GuideState, form: FormData): Promise<GuideState> {
  if (String(form.get('website_url') || '')) return { ok: true }; // honeypot
  const email = String(form.get('email') || '').trim().toLowerCase();
  const first = String(form.get('first') || '').trim().slice(0, 60) || null;
  const state = String(form.get('state') || '');
  const consent = form.get('consent') === 'yes';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (!STATES.some((s) => s.code === state)) return { error: 'Pick the state your property is in.' };
  const db = adminClient();
  // Same person asking again within a day: reuse their sign-up rather than sending more emails.
  const { data: recent } = await db.from('guide_signups').select('id').ilike('email', email).eq('state', state).gte('created_at', new Date(Date.now() - 86400e3).toISOString()).limit(1);
  if (recent?.length) return { ok: true, link: guideLink(recent[0].id) };
  const { currentSource } = await import('@/lib/traffic');
  const src = await currentSource().catch(() => ({ source: 'direct', campaign: null }));
  const ref = (await headers()).get('referer') || '';
  const { data, error } = await db.from('guide_signups').insert({
    email, first_name: first, state, consent, consent_text: consent ? CONSENT_TEXT : null,
    source: `${src.source}${ref ? ` · ${new URL(ref).pathname}` : ''}`.slice(0, 120),
    next_at: consent ? new Date(Date.now() + FIRST_FOLLOW_UP_DAYS * 86400e3).toISOString() : null,
  }).select('id').single();
  if (error || !data) return { error: 'Something went wrong. Please try again.' };
  await sendGuideEmail({ id: data.id, email, first_name: first, state, consent, step: 0 }).catch(() => false);
  return { ok: true, link: guideLink(data.id) };
}
