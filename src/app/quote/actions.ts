'use server';

import { redirect } from 'next/navigation';
import { adminClient, currentUser } from '@/lib/supabase/server';
import { parseRequest, sendRequest } from '@/lib/quoteRequest';

export type SubmitState = { error?: string; pending?: { id: string; email: string; count: number } };

/**
 * The quote form's submit. Signed in: the request goes out now. Not signed in: it's held (SQL 031) and the form
 * sends a sign-in link to the owner's email; opening it lands on /quote/send/[id], which sends the request.
 */
export async function submitQuoteRequest(_: unknown, form: FormData): Promise<SubmitState> {
  const parsed = await parseRequest(form);
  if ('error' in parsed) return parsed;
  const { fields } = parsed;
  const user = await currentUser();
  if (!user?.email) {
    const { allow, callerKey } = await import('@/lib/rate');
    if (!(await allow('pending-quote', await callerKey(), 6, 3600e3))) return { error: 'Too many requests from this connection in the last hour. Please try again later.' };
    const { data, error } = await adminClient().from('pending_requests').insert({ email: fields.email, fields }).select('id').single();
    if (error || !data) { console.error(error); return { error: "We couldn't save your request. Please try again in a minute." }; }
    return { pending: { id: data.id, email: fields.email, count: fields.managers.length } };
  }
  const id = await sendRequest({ id: user.id, email: user.email }, fields);
  if (typeof id !== 'string') return id;
  redirect(`/account?sent=${fields.managers.length}&r=${id}`);
}

