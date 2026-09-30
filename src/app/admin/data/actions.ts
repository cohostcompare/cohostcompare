'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { runSweep, seedManagers } from '@/lib/jobs/data';
import { HOTSPOTS } from '@/lib/jobs/areas';
import { adminClient } from '@/lib/supabase/server';

const back = (msg: string, kind: 'done' | 'error' = 'done') => redirect(`/admin/data?${kind}=${encodeURIComponent(msg)}`);

// Main short-stay areas across Greater Sydney and Melbourne (about 2.4 km radius each).
const PRESET: [string, string, number, number][] = [
  ['syd-potts-point', 'Potts Point / Darlinghurst', -33.8745, 151.2240], ['syd-double-bay', 'Double Bay / Rose Bay', -33.8770, 151.2480],
  ['syd-maroubra', 'Maroubra', -33.9500, 151.2430], ['syd-cronulla', 'Cronulla', -34.0550, 151.1520], ['syd-parramatta', 'Parramatta', -33.8150, 151.0010],
  ['syd-north-sydney', 'North Sydney / Neutral Bay', -33.8390, 151.2140], ['syd-mosman', 'Mosman', -33.8290, 151.2440], ['syd-chatswood', 'Chatswood', -33.7960, 151.1830],
  ['syd-dee-why', 'Dee Why / Collaroy', -33.7520, 151.2890], ['syd-avalon', 'Newport / Avalon', -33.6360, 151.3170], ['syd-palm-beach', 'Palm Beach / Whale Beach', -33.5980, 151.3240],
  ['syd-balmain', 'Balmain / Rozelle', -33.8590, 151.1790], ['syd-glebe', 'Glebe / Pyrmont', -33.8750, 151.1900], ['syd-marrickville', 'Marrickville / Dulwich Hill', -33.9110, 151.1550],
  ['syd-mascot', 'Mascot / Rosebery', -33.9280, 151.1950], ['syd-olympic-park', 'Olympic Park / Homebush', -33.8470, 151.0690], ['syd-hurstville', 'Hurstville', -33.9670, 151.1020],
  ['syd-macquarie', 'Ryde / Macquarie Park', -33.7760, 151.1250], ['syd-penrith', 'Penrith', -33.7510, 150.6940], ['syd-liverpool', 'Liverpool', -33.9200, 150.9230],
  ['mel-docklands', 'Docklands', -37.8150, 144.9460], ['mel-south-melbourne', 'South Melbourne / Port Melbourne', -37.8350, 144.9480], ['mel-carlton', 'Carlton / Brunswick', -37.7800, 144.9660],
  ['mel-prahran', 'Prahran / Windsor', -37.8500, 144.9930], ['mel-elwood', 'Elwood / Brighton', -37.8950, 144.9900], ['mel-footscray', 'Footscray / Yarraville', -37.8000, 144.8990],
  ['mel-hawthorn', 'Hawthorn / Kew', -37.8220, 145.0350], ['mel-williamstown', 'Williamstown', -37.8600, 144.8970], ['mel-northcote', 'Northcote / Brunswick East', -37.7700, 144.9990],
  ['mel-box-hill', 'Box Hill', -37.8190, 145.1220], ['mel-frankston', 'Frankston', -38.1440, 145.1260], ['mel-mornington', 'Mornington', -38.2180, 145.0380],
  ['mel-sorrento', 'Sorrento / Portsea', -38.3400, 144.7400], ['mel-rye', 'Rye / Rosebud', -38.3750, 144.8300], ['mel-cowes', 'Phillip Island (Cowes)', -38.4530, 145.2380],
];

export async function addPresetAreas() {
  await requireAdmin('/admin/data');
  const { error } = await adminClient().from('sweep_cells').upsert(PRESET.map(([id, label, lat, lng]) => ({ id, label, lat, lng, radius_miles: 1.5 })), { onConflict: 'id', ignoreDuplicates: true });
  if (error) back(error.message, 'error');
  revalidatePath('/admin/data');
  back(`Added up to ${PRESET.length} Sydney and Melbourne areas.`);
}

export async function addHotspots() {
  await requireAdmin('/admin/data');
  const { error } = await adminClient().from('sweep_cells').upsert(HOTSPOTS.map(([id, label, lat, lng, r]) => ({ id, label, lat, lng, radius_miles: r ?? 2 })), { onConflict: 'id', ignoreDuplicates: true });
  if (error) back(error.message, 'error');
  revalidatePath('/admin/data');
  back(`Added up to ${HOTSPOTS.length} NSW and Victorian holiday areas.`);
}

/** Works through unfinished areas until about 50 seconds pass or the budget runs out. */
export async function sweepMany() {
  await requireAdmin('/admin/data');
  const started = Date.now();
  let calls = 0, stored = 0, areas = 0; let note = '';
  try {
    while (Date.now() - started < 45000) {
      const r = await runSweep(undefined, 10, 50000 - (Date.now() - started));
      if ('message' in r) { note = String(r.message); break; }
      calls += r.calls; stored += r.stored; areas++;
    }
  } catch (e) { note = String((e as Error).message); }
  revalidatePath('/admin/data');
  back(`Fetched ${stored} listings across ${areas} area${areas === 1 ? '' : 's'} with ${calls} calls (US$${(calls * 0.5).toFixed(2)}). ${note || 'Click again to continue.'}`);
}

export async function addArea(form: FormData) {
  await requireAdmin('/admin/data');
  const label = String(form.get('label') || '').trim();
  const lat = Number(form.get('lat')), lng = Number(form.get('lng'));
  const radius = Math.min(Math.max(Number(form.get('radius') || 1.5), 0.5), 5);
  if (!label || !Number.isFinite(lat) || !Number.isFinite(lng) || lat > -9 || lat < -44 || lng < 112 || lng > 154) back('Enter a name and Australian latitude/longitude.', 'error');
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const { error } = await adminClient().from('sweep_cells').insert({ id, label, lat, lng, radius_miles: radius });
  if (error) back(error.message, 'error');
  revalidatePath('/admin/data');
  back(`Added ${label}.`);
}

export async function sweepNext(form: FormData) {
  await requireAdmin('/admin/data');
  const cell = String(form.get('cell') || '') || undefined;
  let msg = '';
  try {
    const r = await runSweep(cell, 4, 50000);
    msg = 'message' in r ? String(r.message) : `${r.label}: ${r.stored} listings from ${r.calls} calls (US$${(r.calls * 0.5).toFixed(2)}). ${r.done ? 'Area finished.' : 'More to fetch: run it again.'}`;
  } catch (e) { back(String((e as Error).message), 'error'); }
  revalidatePath('/admin/data');
  back(msg);
}

export async function runSeed() {
  await requireAdmin('/admin/data');
  let msg = '';
  try {
    const r = await seedManagers();
    msg = `Saved ${r.saved} profiles (${r.skippedClaimed} claimed profiles left untouched). ${r.report.filter((x: { matched: boolean }) => x.matched).length} linked to listing data, ${r.report.filter((x: { matched: boolean; webOnly?: boolean }) => !x.matched && x.webOnly).length} from web research (cover their stated postcodes), ${r.report.filter((x: { matched: boolean; webOnly?: boolean }) => !x.matched && !x.webOnly).length} not found in the data.`;
  } catch (e) { back(String((e as Error).message), 'error'); }
  revalidatePath('/admin/data');
  back(msg);
}
