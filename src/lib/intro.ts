import 'server-only';
import { sendEmail } from '@/lib/email';
import { memberEmails } from '@/lib/managers';
import { feeText, freePlanText, launchPricing, LEGACY_FREE_PER_MONTH, planOf, plansFor, PRO_PRICE, successFee, UNLOCK_HOURS } from '@/lib/pro';
import { smsManager } from '@/lib/sms';
import { adminClient } from '@/lib/supabase/server';

/*
 What happens when an owner accepts a quote:
 - Pro, Enterprise or founding trial: we introduce owner and manager straight away, in one email to both.
 - Free plan (claimed): the manager's first accepted client ever is introduced straight away (managers who claimed before
   8 Nov 2026 keep 4 free a month until the launch price ends). After that, the manager is asked to unlock the client
   (successFee() + GST by card: A$99 launch price until 30 Apr 2027, then A$400; or start Pro). The fee is fixed when the owner accepts. Once paid,
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
  const { data: m } = await db.from('managers').select('id, name, website, contact_phone, claimed, legacy_free').eq('slug', t.manager_slug).single();
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
  // Legacy (claimed before the 8 Nov 2026 change): 4 free a month until the launch price ends. Everyone else: the first client ever is free.
  const legacy = Boolean(m.legacy_free) && launchPricing();
  let used = 0, allowance = 1;
  if (free) {
    let q = db.from('quote_request_managers').select('id', { count: 'exact', head: true }).eq('manager_slug', t.manager_slug).eq('status', 'accepted');
    if (legacy) {
      const monthStart = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      q = q.gte('accepted_at', new Date(monthStart.getTime() - 11 * 3600e3).toISOString());
      allowance = LEGACY_FREE_PER_MONTH;
    }
    used = (await q).count ?? 0; // includes this one
  }
  const fee = successFee();
  if (!free || used <= allowance) {
    await db.from('messages').insert({ thread_id: t.id, sender: 'system', read_by_owner: true, body: `You accepted ${t.manager_name}'s quote.` });
    await introduce(t.id);
    if (free && emails.length) {
      await sendEmail({
        to: emails, subject: legacy ? `Free clients this month: ${Math.min(used, allowance)} of ${allowance} used` : 'Your first client on CoHostCompare is free',
        text: legacy
          ? `${first(req.owner_name)} accepted your quote, and we've sent you both an introduction.\n\nThat's ${Math.min(used, allowance)} of the ${allowance} free clients a month you keep until ${'30 April 2027'}, because you joined before our pricing changed. After that, each new client costs ${feeText(fee)} to confirm. Pro (${PRO_PRICE}) includes unlimited clients, plus SMS alerts, regional reports and insights.`
          : `${first(req.owner_name)} accepted your quote, and we've sent you both an introduction. This one is on us.\n\nOn the Free plan: ${freePlanText()}. Pro (${PRO_PRICE}) includes unlimited clients, plus SMS alerts, regional reports and insights.`,
        cta: { label: 'See Pro', url: `${SITE}/dashboard` },
      });
    }
    return;
  }
  const { error } = await db.from('success_fees').insert({ manager_id: m.id, thread_id: t.id, amount: fee, status: 'awaiting_unlock', expires_at: new Date(Date.now() + UNLOCK_HOURS * 3600e3).toISOString() });
  if (error) { console.error('unlock fee', error); await introduce(t.id); return; } // never leave an owner stuck
  await db.from('messages').insert({ thread_id: t.id, sender: 'system', read_by_owner: true, body: `You accepted ${t.manager_name}'s quote. We've asked them to confirm, and we'll introduce you by email as soon as they do.` });
  await sendEmail({
    to: emails, subject: `${first(req.owner_name)} accepted your quote: confirm to get their details`,
    text: `Good news: ${first(req.owner_name)} accepted your quote for ${req.suburb || ''} ${req.state || ''} ${req.postcode}.\n\n${legacy ? `You've used the ${allowance} free clients you have this month` : 'Your first client was free'}, so confirm this one for ${feeText(fee)} to get the owner's full name, email, phone and address, and an introduction by email. Or start Pro and every client you win is unlocked at no extra cost.\n\nPlease confirm within ${UNLOCK_HOURS} hours. After that we'll let the owner know they can choose another manager.`,
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

/**
 Daily: 30 days' notice for managers who claimed before the 8 Nov 2026 pricing change (managers.legacy_free).
 They keep 4 free clients a month until the launch price ends on 30 Apr 2027. On or after 31 Mar 2027 each gets one email
 saying what changes on 1 May. Sent once (site_settings 'legacy_notice_sent' lists who has had it).
*/
export async function legacyPriceNotice(): Promise<number> {
  if (Date.now() < new Date('2027-03-31T00:00:00+11:00').getTime() || !launchPricing()) return 0;
  const db = adminClient();
  const { data: s } = await db.from('site_settings').select('value').eq('key', 'legacy_notice_sent').maybeSingle();
  const done = new Set<string>(Array.isArray(s?.value) ? (s!.value as string[]) : []);
  const { data: ms } = await db.from('managers').select('id, slug, name').eq('legacy_free', true).eq('claimed', true);
  let n = 0;
  for (const m of ms || []) {
    if (done.has(m.id)) continue;
    const emails = await memberEmails(m.slug);
    if (emails.length) {
      await sendEmail({
        to: emails, subject: 'Your CoHostCompare free clients from 1 May',
        text: `Hi ${m.name} team,\n\nWhen you joined CoHostCompare, the Free plan included 4 accepted clients a month at no cost. We kept that for you through our launch period, which ends on 30 April 2027.\n\nFrom 1 May 2027, on the Free plan each new client you win costs ${feeText(400)} to confirm. Your profile, quote requests and replies stay free, and Pro (${PRO_PRICE}) still includes unlimited clients.\n\nNothing changes before 1 May. Any client who accepts your quote before then is covered as now.\n\nThe CoHostCompare team`,
        cta: { label: 'See plans', url: `${SITE}/managers#pricing` },
      });
      n++;
    }
    done.add(m.id);
  }
  await db.from('site_settings').upsert({ key: 'legacy_notice_sent', value: [...done], updated_at: new Date().toISOString() });
  return n;
}
