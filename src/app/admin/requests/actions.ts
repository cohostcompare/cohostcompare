'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { adminClient } from '@/lib/supabase/server';

/** Permanently deletes a quote request with its manager threads, messages and quotes (all cascade). For test or junk requests. */
export async function deleteRequest(form: FormData) {
  await requireAdmin('/admin/requests');
  if (form.get('confirm') !== 'yes') return;
  await adminClient().from('quote_requests').delete().eq('id', String(form.get('id') || ''));
  revalidatePath('/admin/requests');
  revalidatePath('/admin');
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
const back = (msg: string, kind: 'done' | 'error' = 'done'): never => redirect(`/admin/requests?f=unreached&d=30&${kind}=${encodeURIComponent(msg)}`);

async function unreachedThread(id: string) {
  const db = adminClient();
  const { data: t } = await db.from('quote_request_managers').select('id, manager_slug, manager_name, status, quote_requests(id, owner_email, owner_name, suburb, state, postcode, lat, lng, address)').eq('id', id).maybeSingle();
  if (!t || !['sent', 'viewed'].includes(t.status)) return null;
  const { data: m } = await db.from('managers').select('id, claimed').eq('slug', t.manager_slug).maybeSingle();
  if (!m || m.claimed) return null;
  const r = (Array.isArray(t.quote_requests) ? t.quote_requests[0] : t.quote_requests) as { id: string; owner_email: string; owner_name: string | null; suburb: string | null; state: string | null; postcode: string; lat: number | null; lng: number | null; address: string | null };
  return { t, m, r };
}

/** Found an email for an unclaimed manager: add it to outreach and send them this request straight away. */
export async function addEmailAndNotify(form: FormData) {
  await requireAdmin('/admin/requests');
  const x = await unreachedThread(String(form.get('thread') || ''));
  if (!x) return back('That request is no longer waiting on an unclaimed manager.', 'error');
  const email = String(form.get('email') || '').trim().toLowerCase();
  const source = String(form.get('source') || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return back('Enter a valid email.', 'error');
  if (!/^https?:\/\//.test(source)) return back('Add the web page where the business publishes this email (needed under the Spam Act).', 'error');
  const { suppressed, notifyUnclaimedOfRequest } = await import('@/lib/outreach');
  if (await suppressed(email)) return back('That address has unsubscribed from our emails, so it can’t be used.', 'error');
  const db = adminClient();
  await db.from('outreach_contacts').upsert({ manager_id: x.m.id, email, source_url: source }, { onConflict: 'manager_id,email', ignoreDuplicates: true });
  const n = await notifyUnclaimedOfRequest(x.t.manager_slug, `${x.r.suburb || ''} ${x.r.state || ''}`.trim() || 'your area', x.t.id).catch(() => 0);
  revalidatePath('/admin/requests'); revalidatePath('/admin');
  return back(n ? `Sent ${x.t.manager_name} the request at ${email}. They're also in outreach now.` : `Added ${email}, but the email didn't send. It will retry tomorrow morning.`, n ? 'done' : 'error');
}

/** Couldn't find a way to reach an unclaimed manager: remove them from the request and tell the owner. */
export async function cantReach(form: FormData) {
  await requireAdmin('/admin/requests');
  const x = await unreachedThread(String(form.get('thread') || ''));
  if (!x) return back('That request is no longer waiting on an unclaimed manager.', 'error');
  const db = adminClient();
  await db.from('quote_request_managers').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', x.t.id);
  await db.from('messages').insert({ thread_id: x.t.id, sender: 'system', read_by_owner: false, read_by_manager: true, body: `We couldn't get in touch with ${x.t.manager_name}, so we've removed them from your request. Sorry about that. You can add another manager from your search results.` });
  const q = new URLSearchParams({ ...(x.r.lat != null && x.r.lng != null ? { lat: String(x.r.lat), lng: String(x.r.lng) } : {}), postcode: x.r.postcode, ...(x.r.suburb ? { suburb: x.r.suburb } : {}), ...(x.r.state ? { state: x.r.state } : {}) });
  const { sendEmail } = await import('@/lib/email');
  await sendEmail({
    to: x.r.owner_email,
    subject: `We couldn't reach ${x.t.manager_name}`,
    text: `Hi ${(x.r.owner_name || '').split(' ')[0] || 'there'},\n\n${x.t.manager_name} hasn't joined CoHostCompare yet, and we couldn't find a way to pass on your quote request for ${x.r.address || x.r.suburb || x.r.postcode}. So we've removed them from your request.\n\nYour other managers still have it. If you'd like another quote in their place, you can add a manager from your search results.\n\nSorry about that.\n\nThe CoHostCompare team`,
    cta: { label: 'Find another manager', url: `${SITE}/search?${q.toString()}` },
  });
  revalidatePath('/admin/requests'); revalidatePath('/admin');
  return back(`Removed ${x.t.manager_name} from the request and emailed the owner.`);
}
