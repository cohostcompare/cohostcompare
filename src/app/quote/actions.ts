'use server';

import { redirect } from 'next/navigation';
import { coveringSlugs, publicManager } from '@/lib/data';
import { memberEmails } from '@/lib/managers';
import { headers } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { inboundOn, threadReplyTo } from '@/lib/inbound';
import { smsManager } from '@/lib/sms';
import { adminClient, currentUser } from '@/lib/supabase/server';

const SITUATIONS = ['I own the property', 'I’m buying it now (under contract or about to settle)', "I'm buying it now (under contract or about to settle)", 'I’m planning to buy a property', "I'm planning to buy a property"];
const SERVICES = ['Full management', 'Listing setup and photos', 'Pricing and guest messaging only', 'Cleaning and linen', 'Help registering the property'];

export async function submitQuoteRequest(_: unknown, form: FormData): Promise<{ error?: string }> {
  const user = await currentUser();
  if (!user?.email) return { error: 'Your sign-in has expired. Refresh the page and sign in again.' };

  const slugs = String(form.get('managers') || '').split(',').filter(Boolean).slice(0, 5);
  const managers = (await Promise.all(slugs.map(publicManager))).filter((m): m is NonNullable<typeof m> => Boolean(m));
  if (!managers.length) return { error: 'Pick at least one manager first.' };

  const postcode = String(form.get('postcode') || '').trim();
  const bedrooms = Number(form.get('bedrooms'));
  const services = form.getAll('services').map(String).filter((s) => SERVICES.includes(s));
  const name = String(form.get('name') || '').trim().slice(0, 120);
  const street = String(form.get('street') || '').trim().slice(0, 160);
  const suburb = String(form.get('suburb') || '').trim().slice(0, 80);
  const stateCode = String(form.get('state') || '').trim().slice(0, 3);
  if (!name) return { error: 'Enter your name.' };
  const email = String(form.get('email') || user.email).trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
  const situation = SITUATIONS.find((s) => s === String(form.get('situation') || '')) || null;
  if (!suburb) return { error: "Enter your property's suburb." };
  if (!/^\d{4}$/.test(postcode)) return { error: "Enter your property's 4-digit postcode." };
  const lat = Number(form.get('lat')), lng = Number(form.get('lng'));
  if (!form.get('lat') || !form.get('lng') || !Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'Pick the property address from the suggestions so we can check which managers cover it.' };
  const covering = await coveringSlugs(lat, lng, managers.map((m) => m.slug), postcode);
  const notCovering = managers.filter((m) => !covering.has(m.slug));
  if (notCovering.length) return { error: `${notCovering.map((m) => m.name).join(' and ')} ${notCovering.length === 1 ? "doesn't" : "don't"} run homes near this address. Remove them or search again for this address.` };
  if (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 20) return { error: 'Choose the number of bedrooms.' };
  if (!services.length) return { error: 'Choose at least one service you want.' };

  const row = {
    owner_id: user.id,
    owner_email: email,
    owner_name: name,
    owner_phone: String(form.get('phone') || '').trim().slice(0, 30) || null,
    street: street || null,
    suburb,
    state: stateCode,
    address: [street, suburb, `${stateCode} ${postcode}`].filter(Boolean).join(', '),
    postcode,
    property_type: String(form.get('property_type') || '').slice(0, 40),
    bedrooms,
    currently_listed: String(form.get('currently_listed') || '').slice(0, 60),
    services,
    start_timing: String(form.get('start_timing') || '').slice(0, 40),
    notes: String(form.get('notes') || '').trim().slice(0, 2000) || null,
  };

  const db = adminClient();
  // lat/lng need 008_owner_reminders.sql; fall back gracefully if it hasn't been run yet.
  let { data: req, error } = await db.from('quote_requests').insert({ ...row, lat, lng, situation }).select('id').single(); // situation needs 016
  if (error && /situation/i.test(error.message)) ({ data: req, error } = await db.from('quote_requests').insert({ ...row, lat, lng }).select('id').single());
  if (error && /lat|lng|column/i.test(error.message)) ({ data: req, error } = await db.from('quote_requests').insert(row).select('id').single());
  if (error || !req) { console.error(error); return { error: "We couldn't save your request. Please try again in a minute." }; }
  const { data: threads, error: e2 } = await db.from('quote_request_managers').insert(
    managers.map((m) => ({ request_id: req.id, manager_slug: m.slug, manager_name: m.name })),
  ).select('id');
  if (e2) console.error(e2);
  if (threads?.length) {
    await db.from('messages').insert(threads.map((t) => ({
      thread_id: t.id, sender: 'system', read_by_owner: true,
      body: 'Quote request sent.',
    })));
  }

  const summary = [
    `Property: ${row.address}`,
    `Type: ${row.property_type}, ${bedrooms} bedroom${bedrooms === 1 ? '' : 's'}`,
    `Listed now: ${row.currently_listed}`,
    `Wants: ${services.join(', ')}`,
    situation ? `Owner: ${situation.replace(/^I’m|^I'm/, 'They’re').replace(/^I own/, 'They own')}` : '',
    `Start: ${row.start_timing}`,
    row.notes ? `Notes: ${row.notes}` : '',
  ].filter(Boolean).join('\n');

  await sendEmail({
    to: email,
    subject: `Your quote request has gone to ${managers.length} manager${managers.length === 1 ? '' : 's'}`,
    text: `Hi ${name},\n\nYour request has gone to: ${managers.map((m) => m.name).join(', ')}.\n\n${summary}\n\nEach manager replies with a quote in the same format, so you can compare them side by side, and message them, in your inbox.\n\nThe CoHostCompare team`,
    cta: { label: 'Open my inbox', url: 'https://www.cohostcompare.com/account' },
  });

  // Managers who've claimed their profile get the request by email; the rest come to us to follow up.
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
  const { data: tRows } = await db.from('quote_request_managers').select('id, manager_slug').eq('request_id', req.id);
  const { notifyUnclaimedOfRequest } = await import('@/lib/outreach');
  const noContact: string[] = [];
  for (const t of tRows || []) {
    const to = await memberEmails(t.manager_slug);
    if (!to.length) {
      const n = await notifyUnclaimedOfRequest(t.manager_slug, `${suburb} ${stateCode}`.trim()).catch(() => 0);
      if (!n) noContact.push(managers.find((m) => m.slug === t.manager_slug)?.name || t.manager_slug);
      continue;
    }
    await sendEmail({
      to,
      subject: `New quote request: ${suburb} ${stateCode} ${postcode}`,
      text: `An owner in ${suburb} ${stateCode} ${postcode} has asked you for a quote.\n\n${row.property_type}, ${bedrooms === 0 ? 'studio' : `${bedrooms} bedrooms`}${situation ? `\n${situation.replace(/^I own/, 'Owner owns').replace(/^I’m buying it now|^I'm buying it now/, 'Owner is buying it now').replace(/^I’m planning to buy|^I'm planning to buy/, 'Owner is planning to buy')}` : ''}\nListed now: ${row.currently_listed}\nWants: ${services.join(', ')}\nStart: ${row.start_timing}${row.notes ? `\nNotes: ${row.notes}` : ''}\n\nSend your quote in the standard format from your dashboard.${inboundOn() ? ' Questions for the owner first? Just reply to this email.' : ''}`,
      cta: { label: 'Send your quote', url: `${origin}/dashboard/requests/${t.id}` },
      replyTo: threadReplyTo(t.id, 'm'),
    });
    await smsManager(t.manager_slug, 'request', `CoHostCompare: new quote request for a ${bedrooms === 0 ? 'studio' : `${bedrooms}-bed ${String(row.property_type).toLowerCase()}`} in ${suburb} ${stateCode}. Send your quote: ${origin}/dashboard/requests/${t.id}`);
  }

  await sendEmail({
    to: 'hello@cohostcompare.com',
    subject: `New quote request: ${postcode}, ${managers.map((m) => m.name).join(', ')}`,
    text: `${noContact.length ? `ACTION: no contact email on file for ${noContact.join(', ')}, so they haven't been told. Add one at /admin/outreach and they'll be invited automatically.\n\n` : ''}Owner: ${name} <${user.email}>${row.owner_phone ? `, ${row.owner_phone}` : ''}\nManagers: ${managers.map((m) => `${m.name}${m.demo ? ' (DEMO)' : ''}`).join(', ')}\n\n${summary}\n\nRequest id: ${req.id}`,
    replyTo: user.email,
  });

  redirect(`/account?sent=${managers.length}`);
}
