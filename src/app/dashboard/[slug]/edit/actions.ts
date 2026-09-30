'use server';

import { photoLimit } from '@/lib/pro';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PLATFORMS, SERVICES, requireManager } from '@/lib/managers';
import { adminClient } from '@/lib/supabase/server';

const num = (v: FormDataEntryValue | null, min: number, max: number) => {
  const s = String(v ?? '').trim(); if (!s) return null;
  const n = Number(s); return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
};
const bool = (v: FormDataEntryValue | null) => (v === 'yes' ? true : v === 'no' ? false : null);

export async function saveProfile(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  const slug = String(form.get('slug') || '');
  const { user, manager: m } = await requireManager(slug, `/dashboard/${slug}/edit`);

  const feeMin = num(form.get('fee_min'), 0, 50), feeMax = num(form.get('fee_max'), 0, 50);
  const setup = num(form.get('setup_fee'), 0, 20000), term = num(form.get('min_term'), 0, 60), notice = num(form.get('notice_days'), 0, 365);
  if ([feeMin, feeMax, setup, term, notice].some((x) => Number.isNaN(x))) return { error: 'Check the numbers: fees are 0–50%, setup fee in A$, minimum term in months, notice in days.' };
  if (feeMin != null && feeMax != null && feeMax < feeMin) return { error: 'The highest fee must be the same as or more than the lowest.' };
  const postcodes = String(form.get('postcodes') || '').split(/[\s,]+/).filter(Boolean);
  if (postcodes.some((p) => !/^\d{4}$/.test(p))) return { error: 'Service postcodes must be 4 digits each, separated by commas.' };
  const website = String(form.get('website') || '').trim();
  if (website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(website)) return { error: 'Enter your website as a full address, starting with https://' };

  const updates = {
    tagline: String(form.get('tagline') || '').trim().slice(0, 120) || null,
    about: String(form.get('about') || '').trim().slice(0, 1500) || null,
    website: website || null,
    contact_phone: String(form.get('contact_phone') || '').trim().slice(0, 30) || null,
    platforms: form.getAll('platforms').map(String).filter((p) => PLATFORMS.includes(p) || p === 'Airbnb'),
    services: form.getAll('services').map(String).filter((s) => SERVICES.includes(s)),
    postcodes: [...new Set(postcodes)].slice(0, 200),
    fee_min: feeMin, fee_max: feeMax ?? feeMin,
    fee_note: feeMin == null ? null : `${feeMin === (feeMax ?? feeMin) ? `${feeMin}%` : `${feeMin}–${feeMax}%`} of booking revenue${form.get('fee_gst') === 'yes' ? ' + GST' : ''} (set by ${m.name})`,
    licensed_agent: bool(form.get('licensed_agent')),
    gated: {
      ...(m.gated || {}),
      setupFee: setup, setupNote: null,
      minTermMonths: term, noticeDays: notice,
      cleaningPassedOn: bool(form.get('cleaning')), linenIncluded: bool(form.get('linen')),
      ownerStaysAllowed: String(form.get('owner_stays') || '').trim().slice(0, 120) || null,
      inclusions: String(form.get('inclusions') || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 12),
    },
    updated_at: new Date().toISOString(),
  };

  const db = adminClient();
  const { error } = await db.from('managers').update(updates).eq('id', m.id);
  if (error) { console.error(error); return { error: "We couldn't save your changes. Try again in a minute." }; }
  const changed = Object.fromEntries(Object.entries(updates).filter(([k, v]) => k !== 'updated_at' && JSON.stringify(v) !== JSON.stringify((m as Record<string, unknown>)[k])));
  if (Object.keys(changed).length) await db.from('manager_edits').insert({ manager_id: m.id, user_id: user.id, changes: changed });
  revalidatePath(`/managers/${slug}`);
  revalidatePath(`/dashboard/${slug}/edit`);
  return { ok: true };
}

const OK_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Step 1: signed upload slots, so the browser uploads straight to storage (no size limit on our server). */
export async function prepareUploads(slug: string, files: { kind: 'logo' | 'photo'; type: string; size: number }[], rights: boolean) {
  const { manager: m } = await requireManager(slug, `/dashboard/${slug}/edit`);
  if (!rights) return { error: 'Tick the box to confirm you own or have permission to use these images.' };
  if (!files.length) return { error: 'Choose an image first.' };
  if (files.some((f) => !OK_TYPES[f.type])) return { error: 'Use JPG, PNG or WebP images.' };
  if (files.some((f) => f.size > 5 * 1024 * 1024)) return { error: 'Each image must be 5 MB or smaller.' };
  const newPhotos = files.filter((f) => f.kind === 'photo').length;
  const limit = await photoLimit(m.id);
  if (m.photos.length + newPhotos > limit) return { error: `You can have up to ${limit} photos (you have ${m.photos.length}). Remove some first.` };
  const st = adminClient().storage.from('manager-media');
  const slots = [];
  for (const f of files) {
    const path = `${m.id}/${f.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${OK_TYPES[f.type]}`;
    const { data, error } = await st.createSignedUploadUrl(path);
    if (error || !data) return { error: `Couldn't start the upload: ${error?.message}` };
    slots.push({ kind: f.kind, path, token: data.token });
  }
  return { slots };
}

/** Step 2: attach uploaded files to the profile. */
export async function attachMedia(slug: string, uploaded: { kind: 'logo' | 'photo'; path: string }[]) {
  const { user, manager: m } = await requireManager(slug, `/dashboard/${slug}/edit`);
  const st = adminClient().storage.from('manager-media');
  const mine = uploaded.filter((u) => u.path.startsWith(`${m.id}/`));
  const logo = mine.find((u) => u.kind === 'logo');
  const photos = mine.filter((u) => u.kind === 'photo').map((u) => st.getPublicUrl(u.path).data.publicUrl);
  const update: Record<string, unknown> = {};
  if (logo) update.logo_url = st.getPublicUrl(logo.path).data.publicUrl;
  if (photos.length) update.photos = [...m.photos, ...photos].slice(0, await photoLimit(m.id));
  if (!Object.keys(update).length) return { error: 'Nothing was uploaded.' };
  const db = adminClient();
  await db.from('managers').update(update).eq('id', m.id);
  await db.from('manager_edits').insert({ manager_id: m.id, user_id: user.id, changes: update });
  revalidatePath(`/managers/${slug}`);
  revalidatePath(`/dashboard/${slug}/edit`);
  return { ok: true };
}

export async function removeMedia(form: FormData) {
  const slug = String(form.get('slug') || '');
  const { user, manager: m } = await requireManager(slug, `/dashboard/${slug}/edit`);
  const url = String(form.get('url') || '');
  const db = adminClient();
  if (form.get('kind') === 'logo') await db.from('managers').update({ logo_url: null }).eq('id', m.id);
  else await db.from('managers').update({ photos: m.photos.filter((p) => p !== url) }).eq('id', m.id);
  await db.from('manager_edits').insert({ manager_id: m.id, user_id: user.id, changes: { removed: url } });
  revalidatePath(`/managers/${slug}`);
  redirect(`/dashboard/${slug}/edit?media=removed#media`);
}

/** Manager enters their ABN; verified automatically when the registered name matches. */
export async function saveAbn(_: unknown, form: FormData): Promise<{ error?: string; ok?: string }> {
  const slug = String(form.get('slug') || '');
  const { user, manager: m } = await requireManager(slug, `/dashboard/${slug}/edit`);
  const { cleanAbn, lookupAbn, namesMatch, validAbn } = await import('@/lib/abn');
  const abn = cleanAbn(String(form.get('abn') || ''));
  if (!validAbn(abn)) return { error: 'That isn’t a valid ABN. Check the 11 digits.' };
  const db = adminClient();
  const r = await lookupAbn(abn).catch(() => ({ ok: false as const, error: 'The business register didn’t respond. Try again soon.' }));
  const matched = r.ok && r.active && namesMatch(m.name, r.names);
  const { error } = await db.from('managers').update({ abn, abn_name: r.ok ? r.names.join(' / ').slice(0, 300) : null, abn_verified_at: matched ? new Date().toISOString() : null }).eq('id', m.id);
  if (error) return { error: 'We couldn’t save your ABN. Your account may need an update first: please try again later.' };
  await db.from('manager_edits').insert({ manager_id: m.id, user_id: user.id, changes: { abn, abn_verified: matched } });
  revalidatePath(`/managers/${slug}`); revalidatePath(`/dashboard/${slug}/edit`);
  if (matched) return { ok: 'Verified. Your profile now shows the Verified business badge.' };
  if (r.ok && !r.active) return { ok: 'Saved, but that ABN isn’t active on the register, so we can’t verify it.' };
  if (r.ok) return { ok: `Saved. It's registered to ${r.names[0]}, which doesn't match ${m.name} closely enough to verify automatically. We'll check it by hand within 2 business days.` };
  return { ok: `Saved. ${r.error}` };
}
