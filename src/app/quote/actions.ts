'use server';

import { redirect } from 'next/navigation';
import { publicManager } from '@/lib/data';
import { sendEmail } from '@/lib/email';
import { adminClient, currentUser } from '@/lib/supabase/server';

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
  if (!suburb) return { error: "Enter your property's suburb." };
  if (!/^\d{4}$/.test(postcode)) return { error: "Enter your property's 4-digit postcode." };
  const notCovering = managers.filter((m) => !m.postcodes.includes(postcode));
  if (notCovering.length) return { error: `${notCovering.map((m) => m.name).join(' and ')} ${notCovering.length === 1 ? "doesn't" : "don't"} cover postcode ${postcode}. Remove ${notCovering.length === 1 ? 'them' : 'them'} or search again for this address.` };
  if (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 20) return { error: 'Choose the number of bedrooms.' };
  if (!services.length) return { error: 'Choose at least one service you want.' };

  const row = {
    owner_id: user.id,
    owner_email: user.email,
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
  const { data: req, error } = await db.from('quote_requests').insert(row).select('id').single();
  if (error || !req) { console.error(error); return { error: "We couldn't save your request. Please try again in a minute." }; }
  const { data: threads, error: e2 } = await db.from('quote_request_managers').insert(
    managers.map((m) => ({ request_id: req.id, manager_slug: m.slug, manager_name: m.name })),
  ).select('id');
  if (e2) console.error(e2);
  if (threads?.length) {
    await db.from('messages').insert(threads.map((t) => ({
      thread_id: t.id, sender: 'system', read_by_owner: true,
      body: 'Quote request sent. The manager will reply here with a quote in our standard format.',
    })));
  }

  const summary = [
    `Property: ${row.address}`,
    `Type: ${row.property_type}, ${bedrooms} bedroom${bedrooms === 1 ? '' : 's'}`,
    `Listed now: ${row.currently_listed}`,
    `Wants: ${services.join(', ')}`,
    `Start: ${row.start_timing}`,
    row.notes ? `Notes: ${row.notes}` : '',
  ].filter(Boolean).join('\n');

  await sendEmail({
    to: user.email,
    subject: `Your quote request has gone to ${managers.length} manager${managers.length === 1 ? '' : 's'}`,
    text: `Hi ${name},\n\nYour request has gone to: ${managers.map((m) => m.name).join(', ')}.\n\n${summary}\n\nEach manager replies with a quote in the same format, so you can compare them side by side, and message them, in your inbox.\n\nThe CoHostCompare team`,
    cta: { label: 'Open my inbox', url: 'https://www.cohostcompare.com/account' },
  });

  // Until managers are onboarded, requests come to us to forward by hand.
  await sendEmail({
    to: 'hello@cohostcompare.com',
    subject: `New quote request: ${postcode}, ${managers.map((m) => m.name).join(', ')}`,
    text: `Owner: ${name} <${user.email}>${row.owner_phone ? `, ${row.owner_phone}` : ''}\nManagers: ${managers.map((m) => `${m.name}${m.demo ? ' (DEMO)' : ''}`).join(', ')}\n\n${summary}\n\nRequest id: ${req.id}`,
    replyTo: user.email,
  });

  redirect(`/account?sent=${managers.length}`);
}
