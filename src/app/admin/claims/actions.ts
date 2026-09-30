'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { approveClaim } from '@/lib/claims';
import { sendEmail } from '@/lib/email';
import { adminClient } from '@/lib/supabase/server';

async function origin() {
  const h = await headers();
  return `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
}

async function load(id: string) {
  const { data } = await adminClient().from('manager_claims').select('id, email, name, status, managers(name, slug)').eq('id', id).single();
  if (!data) throw new Error('Claim not found');
  const m = (Array.isArray(data.managers) ? data.managers[0] : data.managers) as { name: string; slug: string };
  return { ...data, manager: m };
}

export async function approve(form: FormData) {
  let failed = '';
  try {
  await requireAdmin('/admin/claims');
  const c = await load(String(form.get('id')));
  await approveClaim(c.id);
  await adminClient().from('manager_claims').update({ admin_note: String(form.get('note') || '') || null }).eq('id', c.id);
  await sendEmail({
    to: c.email,
    subject: `You now manage ${c.manager.name} on CoHostCompare`,
    text: `Hi ${c.name},\n\nYour claim for ${c.manager.name} has been approved. In your dashboard you can add your fees, services, logo and photos, and reply to owners' quote requests.\n\nThe CoHostCompare team`,
    cta: { label: 'Open my dashboard', url: `${await origin()}/dashboard` },
  });
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    console.error('admin claim action failed', e);
    failed = e instanceof Error ? e.message : String(e);
  }
  revalidatePath('/admin/claims');
  redirect(failed ? `/admin/claims?error=${encodeURIComponent(failed.slice(0, 200))}` : '/admin/claims?done=1');
}

export async function reject(form: FormData) {
  let failed = '';
  try {
  await requireAdmin('/admin/claims');
  const c = await load(String(form.get('id')));
  const reason = String(form.get('message') || '').trim();
  const { error: upErr } = await adminClient().from('manager_claims').update({ status: 'rejected', decided_at: new Date().toISOString(), admin_note: reason || null }).eq('id', c.id);
  if (upErr) throw new Error(`Couldn't update the claim: ${upErr.message}`);
  if (form.get('notify')) {
    await sendEmail({
      to: c.email,
      subject: `About your claim for ${c.manager.name}`,
      text: `Hi ${c.name},\n\nWe weren't able to confirm that you manage ${c.manager.name}, so we haven't approved this claim.${reason ? `\n\n${reason}` : ''}\n\nIf you think this is a mistake, reply to this email and we'll take another look.\n\nThe CoHostCompare team`,
    });
  }
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    console.error('admin claim action failed', e);
    failed = e instanceof Error ? e.message : String(e);
  }
  revalidatePath('/admin/claims');
  redirect(failed ? `/admin/claims?error=${encodeURIComponent(failed.slice(0, 200))}` : '/admin/claims?done=1');
}

export async function requestInfo(form: FormData) {
  let failed = '';
  try {
  await requireAdmin('/admin/claims');
  const c = await load(String(form.get('id')));
  const ask = String(form.get('message') || '').trim() ||
    `To confirm you manage ${c.manager.name}, please reply with one of: an email from an address on the business's website domain, a link to your LinkedIn profile showing your role, or a screenshot of your Airbnb co-host dashboard for one of the business's listings.`;
  const { error: upErr } = await adminClient().from('manager_claims').update({ status: 'info_requested', info_request: ask }).eq('id', c.id);
  if (upErr) throw new Error(`Couldn't update the claim: ${upErr.message}`);
  await sendEmail({
    to: c.email,
    subject: `One more step to claim ${c.manager.name}`,
    text: `Hi ${c.name},\n\nThanks for claiming ${c.manager.name} on CoHostCompare. Before we approve it, we need a little more to confirm you manage the business.\n\n${ask}\n\nJust reply to this email.\n\nThe CoHostCompare team`,
  });
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    console.error('admin claim action failed', e);
    failed = e instanceof Error ? e.message : String(e);
  }
  revalidatePath('/admin/claims');
  redirect(failed ? `/admin/claims?error=${encodeURIComponent(failed.slice(0, 200))}` : '/admin/claims?done=1');
}
