import 'server-only';
import { sendEmail } from '@/lib/email';
import { memberEmails } from '@/lib/managers';
import { FREE_ACCEPTS_PER_MONTH, planOf, plansFor, PRO_PRICE, SUCCESS_FEE, SUCCESS_FEE_TEXT, UNLOCK_HOURS } from '@/lib/pro';
import { smsManager } from '@/lib/sms';
import { adminClient } from '@/lib/supabase/server';

/*
 What happens when an owner accepts a quote:
 - Pro, Enterprise or founding trial: we introduce owner and manager straight away, in one email to both.
 - Free plan (claimed): the first FREE_ACCEPTS_PER_MONTH accepted clients each month are introduced straight away.
   After that, the manager is asked to unlock the client (A$99 + GST by card, or start Pro). Once paid,
   the same introduction goes out. If they haven't unlocked within 48 hours, the owner is told they can accept
   another quote (the manager can still unlock later).
 - Unclaimed profile: hello@ passes the details on by hand, as before.
*/

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cohostcompare.com';
const first = (n: unknown) => String(n || 'the owner').split(' ')[0];

async function load(threadId: string) {
  const db = adminClient();
  const { data: t } = await db.from('quote_request_managers').select('id, manager_slug, manager_name, request_id').eq('id', threadId).single();
  if (!t) return null;
  const { data: req } = await db.from('quote_requests').select('owner_name, owner_email, owner_phone, street, suburb, state, postcode').eq('id', t.request_id).single();
  const { data: m } = await db.from('managers').select('id, name, website, contact_phone, claimed').eq('slug', t.manager_slug).single();
  return { t, req, m, emails: await memberEmails(t.manager_slug) };
}

/** One email to both sides with each other's details. Reply-all keeps everyone in the conversation. */
export async function introduce(threadId: string) {
  const x = await load(threadId);
  if (!x?.req || !x.m) return false;
  const { t, req, m, emails } = x;
  const db = adminClient();
  const address = [req.street, req.suburb, `${req.state} ${req.postcode}`].filter(Boolean).join(', ');
  if (!emails.length) {
    await sendEmail({ to: 'hello@cohostcompare.com', subject: `Accepted quote to pass on: ${t.manager_name}`, text: `${req.owner_name} <${req.owner_email}>${req.owner_phone ? `, ${req.owner_phone}` : ''} accepted ${t.manager_name}'s quote for ${address} (thread ${t.id}). The manager has no dashboard users, so introduce them by hand.`, replyTo: req.owner_email });
    await sendEmail({ to: req.owner_email, subject: `You accepted ${t.manager_name}'s quote`, text: `Hi ${first(req.owner_name)},\n\nThanks. ${t.manager_name} isn't set up on CoHostCompare yet, so we're passing your details to them ourselves and will introduce you by email within one business day.\n\nThe CoHostCompare team`, cta: { label: 'Open my inbox', url: `${SITE}/account/messages/${t.id}` } });
    return true;
  }
  await sendEmail({
    to: [req.owner_email, ...emails],
    subject: `Introducing ${first(req.owner_name)} and ${m.name}`,
    text: `Hi ${first(req.owner_name)} and the ${m.name} team,\n\n${first(req.owner_name)} has accepted ${m.name}'s quote for ${address}, so we're introducing you here. Reply all to this email to arrange next steps, such as a property visit and the management agreement.\n\nOwner\n${req.owner_name}\n${req.owner_email}${req.owner_phone ? `\n${req.owner_phone}` : ''}\n${address}\n\nManager\n${m.name}\n${emails.join(', ')}${m.contact_phone ? `\n${m.contact_phone}` : ''}${m.website ? `\n${m.website}` : ''}\n\nThe quote and your messages stay in your CoHostCompare inboxes. Anything you agree from here is between you: please check the management agreement carefully before signing.\n\nThe CoHostCompare team`,
    replyTo: [req.owner_email, ...emails],
  });
  await db.from('messages').insert([
    { thread_id: t.id, sender: 'system', read_by_owner: false, read_by_manager: false, body: `We've introduced you both by email so you can arrange next steps. ${req.owner_name}: ${req.owner_email}${req.owner_phone ? `, ${req.owner_phone}` : ''}. ${m.name}: ${emails[0]}${m.contact_phone ? `, ${m.contact_phone}` : ''}.` },
  ]);
  await smsManager(t.manager_slug, 'accepted', `CoHostCompare: ${first(req.owner_name)} accepted your quote for ${req.suburb || req.postcode}. We've emailed you both an introduction.`);
  return true;
}

/** Called when an owner accepts. Decides between introducing now and asking a Free-plan manager to unlock. */
export async function onAccepted(threadId: string) {
  const x = await load(threadId);
  if (!x?.req || !x.m) return;
  const { t, req, m, emails } = x;
  const db = adminClient();
  const free = m.claimed && emails.length > 0 && planOf((await plansFor([m.id])).get(m.id)) === 'free';
  let used = 0;
  if (free) {
    const monthStart = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const { count } = await db.from('quote_request_managers').select('id', { count: 'exact', head: true }).eq('manager_slug', t.manager_slug).eq('status', 'accepted').gte('accepted_at', new Date(monthStart.getTime() - 11 * 3600e3).toISOString());
    used = count ?? 0; // includes this one
  }
  if (!free || used <= FREE_ACCEPTS_PER_MONTH) {
    await db.from('messages').insert({ thread_id: t.id, sender: 'system', read_by_owner: true, body: `You accepted ${t.manager_name}'s quote.` });
    await introduce(t.id);
    if (free && emails.length) {
      await sendEmail({
        to: emails, subject: `Free clients this month: ${Math.min(used, FREE_ACCEPTS_PER_MONTH)} of ${FREE_ACCEPTS_PER_MONTH} used`,
        text: `${first(req.owner_name)} accepted your quote, and we've sent you both an introduction.\n\nThat's ${Math.min(used, FREE_ACCEPTS_PER_MONTH)} of the ${FREE_ACCEPTS_PER_MONTH} clients the Free plan includes this month. After that, each new client costs ${SUCCESS_FEE_TEXT} to confirm. Pro (${PRO_PRICE}) includes unlimited clients, plus SMS alerts, regional reports and insights.`,
        cta: { label: 'See Pro', url: `${SITE}/dashboard` },
      });
    }
    return;
  }
  const { error } = await db.from('success_fees').insert({ manager_id: m.id, thread_id: t.id, amount: SUCCESS_FEE, status: 'awaiting_unlock', expires_at: new Date(Date.now() + UNLOCK_HOURS * 3600e3).toISOString() });
  if (error) { console.error('unlock fee', error); await introduce(t.id); return; } // never leave an owner stuck
  await db.from('messages').insert({ thread_id: t.id, sender: 'system', read_by_owner: true, body: `You accepted ${t.manager_name}'s quote. We've asked them to confirm, and we'll introduce you by email as soon as they do.` });
  await sendEmail({
    to: emails, subject: `${first(req.owner_name)} accepted your quote: confirm to get their details`,
    text: `Good news: ${first(req.owner_name)} accepted your quote for ${req.suburb || ''} ${req.state || ''} ${req.postcode}.\n\nYou've used the ${FREE_ACCEPTS_PER_MONTH} free clients the Free plan includes this month, so confirm this one for ${SUCCESS_FEE_TEXT} to get the owner's full name, email, phone and address, and an introduction by email. Or start Pro and every client you win is unlocked at no extra cost.\n\nPlease confirm within ${UNLOCK_HOURS} hours. After that we'll let the owner know they can choose another manager.`,
    cta: { label: 'Confirm this client', url: `${SITE}/dashboard/requests/${t.id}` },
  });
  await smsManager(t.manager_slug, 'accepted', `CoHostCompare: ${first(req.owner_name)} accepted your quote for ${req.suburb || req.postcode}. Confirm within ${UNLOCK_HOURS}h to get their details: ${SITE}/dashboard/requests/${t.id}`);
  await sendEmail({
    to: req.owner_email, subject: `You accepted ${t.manager_name}'s quote`,
    text: `Hi ${first(req.owner_name)},\n\nThanks. We've let ${t.manager_name} know, and we'll introduce you both by email as soon as they confirm, usually within a day.\n\nThe CoHostCompare team`,
    cta: { label: 'Open my inbox', url: `${SITE}/account/messages/${t.id}` },
  });
}

/** Marks an unlock paid (or covered by Pro) and sends the introduction. Safe to call twice. */
export async function completeUnlock(threadId: string, status: 'paid' | 'waived', sessionId?: string) {
  const db = adminClient();
  const { data: fee } = await db.from('success_fees').select('id, status').eq('thread_id', threadId).maybeSingle();
  if (!fee || fee.status === 'paid' || fee.status === 'waived') return false;
  await db.from('success_fees').update({ status, updated_at: new Date().toISOString(), ...(sessionId ? { stripe_session_id: sessionId } : {}) }).eq('id', fee.id);
  return introduce(threadId);
}

/** Daily: tells owners when a Free-plan manager hasn't confirmed within 48 hours. */
export async function expireUnlocks() {
  const db = adminClient();
  const { data } = await db.from('success_fees').select('id, thread_id').eq('status', 'awaiting_unlock').lt('expires_at', new Date().toISOString()).is('owner_notified_at', null).limit(50);
  let n = 0;
  for (const f of data || []) {
    const x = await load(f.thread_id);
    if (x?.req) {
      await sendEmail({
        to: x.req.owner_email, subject: `${x.t.manager_name} hasn't confirmed yet`,
        text: `Hi ${first(x.req.owner_name)},\n\n${x.t.manager_name} hasn't confirmed your accepted quote yet. If you'd rather not wait, you can accept another manager's quote from your inbox, or request quotes from more managers.\n\nIf ${x.t.manager_name} confirms later, we'll still introduce you.\n\nThe CoHostCompare team`,
        cta: { label: 'Open my inbox', url: `${SITE}/account` },
      });
      await db.from('messages').insert({ thread_id: f.thread_id, sender: 'system', read_by_owner: false, read_by_manager: false, body: `${x.t.manager_name} hasn't confirmed within ${UNLOCK_HOURS} hours. The owner can now choose another manager.` });
    }
    await db.from('success_fees').update({ status: 'expired', owner_notified_at: new Date().toISOString() }).eq('id', f.id);
    n++;
  }
  return n;
}
