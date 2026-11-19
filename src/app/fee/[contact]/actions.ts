'use server';

import { sendEmail } from '@/lib/email';
import { feeContact } from '@/lib/followups';
import { GST_OPTIONS, type GstMode } from '@/lib/gst';
import { allow, callerKey } from '@/lib/rate';
import { adminClient } from '@/lib/supabase/server';

export type FeeState = { ok?: boolean; fee?: string; slug?: string; error?: string };

/** A manager confirms their fee from the signed link in a follow-up email: no account, shown on the profile straight away. */
export async function confirmFee(_: FeeState, form: FormData): Promise<FeeState> {
  const found = await feeContact(String(form.get('contact') || ''), String(form.get('s') || ''));
  if (!found) return { error: 'This link has expired. Reply to our email with your fee and we’ll add it.' };
  if (found.manager.claimed) return { error: 'This profile has been claimed, so the fee is set from its dashboard.' };
  if (!(await allow('fee', await callerKey(), 10, 3600e3))) return { error: 'That’s a few in a row. Try again in an hour.' };
  const min = Number(form.get('min')), maxRaw = String(form.get('max') || '').trim();
  const max = maxRaw ? Number(maxRaw) : min;
  if (!Number.isFinite(min) || min < 5 || min > 50) return { error: 'Enter your fee as a percentage between 5 and 50.' };
  if (!Number.isFinite(max) || max < min || max > 50) return { error: 'The top of the range should be the same as or higher than the first figure, up to 50.' };
  const gst = (GST_OPTIONS.find((o) => o.value === form.get('gst'))?.value || 'plus') as GstMode;
  const fee = max !== min ? `${min}–${max}%` : `${min}%`;
  const gstText = gst === 'plus' ? 'plus GST' : gst === 'includes' ? 'including GST' : 'no GST (not registered)';
  const { error } = await adminClient().from('managers').update({ fee_min: min, fee_max: max, fee_note: `${fee} of booking income, ${gstText}.`, fee_confirmed_at: new Date().toISOString() }).eq('id', found.manager.id);
  if (error) { console.error('confirmFee', error); return { error: 'That didn’t save. Try again in a minute.' }; }
  await sendEmail({ to: 'hello@cohostcompare.com', subject: `Fee confirmed: ${found.manager.name} ${fee}`, text: `${found.manager.name} confirmed a fee of ${fee} (${gstText}) from the email link sent to ${found.email}.\n\nIt was ${found.manager.fee_min == null ? 'On request' : `${found.manager.fee_min}${found.manager.fee_max && found.manager.fee_max !== found.manager.fee_min ? `–${found.manager.fee_max}` : ''}%`} before.\n\nhttps://www.cohostcompare.com/managers/${found.manager.slug}` });
  return { ok: true, fee, slug: found.manager.slug };
}
