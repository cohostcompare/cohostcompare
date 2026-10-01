'use server';

import { redirect } from 'next/navigation';
import { sendEmail } from '@/lib/email';
import { memberEmails } from '@/lib/managers';
import { MIN_REVIEW, reviewable } from '@/lib/reviews';
import { adminClient, currentUser } from '@/lib/supabase/server';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
type State = { error?: string };

export async function saveReview(_: State, form: FormData): Promise<State> {
  const thread = String(form.get('thread') || '');
  const user = await currentUser();
  if (!user) redirect(`/signin?next=/account/review/${thread}`);
  const r = await reviewable(thread, user.id);
  if (!r) return { error: 'We couldn’t find that quote.' };
  if (!r.ok) return { error: r.reason };
  const rating = Number(form.get('rating'));
  const body = String(form.get('body') || '').trim().slice(0, 3000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Choose a star rating.' };
  if (body.length < MIN_REVIEW) return { error: `Write at least a couple of sentences (${MIN_REVIEW} characters or more).` };
  if (/https?:\/\/|www\.|@\w+\.\w/i.test(body)) return { error: 'Please leave out links and email addresses.' };
  const db = adminClient();
  const row = { rating, body, owner_first: String(r.req.owner_name || '').split(' ')[0].slice(0, 40) || null, suburb: r.req.suburb, updated_at: new Date().toISOString() };
  const isNew = !r.existing;
  const { error } = isNew
    ? await db.from('manager_reviews').insert({ ...row, thread_id: thread, manager_slug: r.t.manager_slug, owner_id: user.id })
    : await db.from('manager_reviews').update(row).eq('id', r.existing!.id);
  if (error) { console.error('review', error); return { error: 'We couldn’t save your review. Please try again in a minute.' }; }
  const to = await memberEmails(r.t.manager_slug);
  if (to.length) {
    await sendEmail({
      to, subject: isNew ? `${row.owner_first || 'An owner'} reviewed ${r.t.manager_name}` : `${row.owner_first || 'An owner'} updated their review`,
      text: `${row.owner_first || 'An owner'}${row.suburb ? ` in ${row.suburb}` : ''} ${isNew ? 'left' : 'updated'} a ${rating}-star review of ${r.t.manager_name}:\n\n"${body}"\n\nIt now shows on your public profile. You can post one public reply from your dashboard.`,
      cta: { label: 'See and reply', url: `${SITE}/dashboard/${r.t.manager_slug}/reviews` },
    });
  }
  await sendEmail({ to: 'hello@cohostcompare.com', subject: `${isNew ? 'New' : 'Updated'} owner review: ${r.t.manager_name} (${rating}★)`, text: `${row.owner_first} (${user.email})${row.suburb ? `, ${row.suburb}` : ''}:\n\n${body}\n\nHide it at /admin/reviews if it breaks the guidelines.`, cta: { label: 'Open reviews', url: `${SITE}/admin/reviews` } });
  redirect(`/account/messages/${thread}?reviewed=1`);
}
