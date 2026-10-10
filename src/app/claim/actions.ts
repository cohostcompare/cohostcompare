'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { approveClaim, claimWelcomeExtras, emailMatchesSite } from '@/lib/claims';
import { managerForClaim } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { adminClient, currentUser } from '@/lib/supabase/server';

export async function submitClaim(_: unknown, form: FormData): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user?.email) return { error: 'Your sign-in has expired. Refresh and sign in again.' };
  const slug = String(form.get('slug') || '');
  const m = await managerForClaim(slug);
  if (!m) return { error: "We couldn't find that profile." };
  if (m.claimed) return { error: 'This profile has already been claimed.' };
  const name = String(form.get('name') || '').trim().slice(0, 120);
  const role = String(form.get('role') || '').trim().slice(0, 80);
  const phone = String(form.get('phone') || '').trim().slice(0, 30);
  if (!name) return { error: 'Enter your name.' };
  if (!form.get('authorised')) return { error: `Confirm you're authorised to manage this profile for ${m.name}.` };

  const db = adminClient();
  const auto = emailMatchesSite(user.email, m.website);
  const { data: claim, error } = await db.from('manager_claims').insert({
    manager_id: m.id, user_id: user.id, email: user.email, name, role_title: role || null, phone: phone || null,
    status: 'pending', method: auto ? 'email_domain' : 'manual',
  }).select('id').single();
  if (error || !claim) { console.error(error); return { error: "We couldn't save your claim. Try again in a minute." }; }

  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;

  if (auto) {
    await approveClaim(claim.id);
    const extras = await claimWelcomeExtras(m.id, origin);
    const { data: planRow } = await adminClient().from('managers').select('pro_until, pro_note, plan').eq('id', m.id).maybeSingle();
    const founding = planRow?.pro_note === 'founding' && planRow.pro_until && new Date(planRow.pro_until).getTime() > Date.now();
    const planLine = founding
      ? `Plan: founding Pro, free until ${new Date(planRow!.pro_until!).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })} (no card, nothing charged; they decide then). Paid Pro sign-ups get their own "New Pro subscriber" email.`
      : `Plan: ${planRow?.plan || 'free'}.`;
    await sendEmail({
      to: 'hello@cohostcompare.com',
      subject: `Claimed (auto-approved): ${m.name}${founding ? ' · founding Pro' : ''}`,
      text: `${name}${role ? ` (${role})` : ''} <${user.email}>${phone ? `, ${phone}` : ''} claimed ${m.name}. Their email matched the business website (${m.website}), so it was approved automatically. No action needed.\n\n${planLine}`,
      cta: { label: 'View claims', url: `${origin}/admin/claims?show=all` },
    });
    await sendEmail({
      to: user.email,
      subject: `You now manage ${m.name} on CoHostCompare`,
      text: `Hi ${name},\n\nYour work email matched ${m.name}'s website, so your claim was approved straight away.\n\nIn your dashboard you can add your fees, services, logo and photos, and reply to owners' quote requests.${extras}\n\nThe CoHostCompare team`,
      cta: { label: 'Open my dashboard', url: `${origin}/dashboard` },
    });
    redirect('/dashboard?claimed=1');
  }

  await sendEmail({
    to: 'hello@cohostcompare.com',
    subject: `Claim to review: ${m.name}`,
    text: `${name}${role ? ` (${role})` : ''} <${user.email}>${phone ? `, ${phone}` : ''} wants to claim ${m.name}.\n\nTheir email doesn't match the business website (${m.website || 'no website on file'}), so it needs a manual check.`,
    cta: { label: 'Review claims', url: `${origin}/admin/claims` },
    replyTo: user.email,
  });
  await sendEmail({
    to: user.email,
    subject: `We're checking your claim for ${m.name}`,
    text: `Hi ${name},\n\nThanks for claiming ${m.name} on CoHostCompare. Because your email address doesn't match the business's website, a person will check your claim, usually within one business day. We'll email you as soon as it's approved.\n\nTip: claims made with an email address on your business's own domain are approved instantly.\n\nThe CoHostCompare team`,
  });
  redirect(`/claim/${slug}`);
}
