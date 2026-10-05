import 'server-only';
import { adminClient } from './supabase/server';
import type { GatedDetails, NearbyManager, PublicManager } from './types';

// All reads go through the server with full access, and only public fields leave this file.
// Owner-only fields come from gatedDetails(), which callers use only for signed-in owners.

export const COVER_KM = 4;
const GENERIC_PLACES = new Set(['Sydney', 'Melbourne', 'Brisbane']);

type Row = {
  id: string; slug: string; name: string; tagline: string | null; about: string | null; cities: string[]; postcodes: string[];
  platforms: string[]; services: string[]; fee_min: number | null; fee_max: number | null; fee_note: string | null;
  licensed_agent: boolean | null; claimed: boolean; gated: Record<string, unknown>; logo_url: string | null; photos: string[] | null; photo_captions?: Record<string, string> | null;
};
type Stats = { manager_id: string; property_count: number; avg_rating: number | null; review_count: number; avg_occupancy: number | null; avg_nightly_rate: number | null; localities: string[] | null; data_as_of: string | null };

const COLS = 'id, slug, name, tagline, about, cities, postcodes, platforms, services, fee_min, fee_max, fee_note, licensed_agent, claimed, gated, logo_url, photos, photo_captions';

function initials(name: string) {
  return name.replace(/['’]/g, '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || name.slice(0, 2).toUpperCase();
}

type Extras = { responseHours: number | null; replies: number; verified: boolean };

function toPublic(r: Row, s?: Stats, x?: Extras): PublicManager {
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: r.id, slug: r.slug, name: r.name, tagline: r.tagline || '', about: r.about || '', initials: initials(r.name),
    cities: r.cities || [], postcodes: r.postcodes || [],
    suburbs: (s?.localities || []).filter((x) => !GENERIC_PLACES.has(x)).sort(),
    propertyCount: s ? Number(s.property_count) : null,
    avgRating: n(s?.avg_rating), reviewCount: s ? Number(s.review_count) : null,
    avgOccupancy: n(s?.avg_occupancy), avgNightlyRate: n(s?.avg_nightly_rate),
    platforms: r.platforms || [], services: r.services || [],
    feeMin: n(r.fee_min), feeMax: n(r.fee_max), licensedAgent: r.licensed_agent,
    responseHours: x?.responseHours ?? null, replies: x?.replies ?? 0, verified: x?.verified ?? false, claimed: r.claimed, dataAsOf: s?.data_as_of || null,
    tile: tileColour(r.name), logoUrl: r.logo_url, photos: r.photos || [], photoCaptions: r.photo_captions || {},
  };
}

/** How quickly claimed managers reply to quote requests (median hours), and whether their ABN is verified. */
async function withExtras(rows: Row[]): Promise<Map<string, Extras>> {
  const out = new Map<string, Extras>();
  if (!rows.length) return out;
  const db = adminClient();
  const { data: ts } = await db.from('quote_request_managers').select('manager_slug, status, created_at, quoted_at, updated_at')
    .in('manager_slug', rows.filter((r) => r.claimed).map((r) => r.slug)).in('status', ['quoted', 'accepted', 'declined']);
  const { data: abn } = await db.from('managers').select('id, abn_verified_at').in('id', rows.map((r) => r.id)); // needs 009; ignored if missing
  const verified = new Set((abn || []).filter((a) => a.abn_verified_at).map((a) => a.id));
  for (const r of rows) {
    const hrs = (ts || []).filter((t) => t.manager_slug === r.slug)
      .map((t) => (new Date(t.quoted_at || t.updated_at).getTime() - new Date(t.created_at).getTime()) / 3600e3)
      .filter((h) => h >= 0).sort((a, b) => a - b);
    out.set(r.id, { responseHours: hrs.length >= 3 ? Math.round(hrs[Math.floor(hrs.length / 2)]) : null, replies: hrs.length, verified: verified.has(r.id) });
  }
  return out;
}

async function withStats(rows: Row[]): Promise<Map<string, Stats>> {
  if (!rows.length) return new Map();
  const { data } = await adminClient().from('manager_stats').select('*').in('manager_id', rows.map((r) => r.id));
  return new Map((data as Stats[] | null || []).map((s) => [s.manager_id, s]));
}

/** Internal test profile: unpublished, so the public never sees it; admins see it in every search and can request quotes. */
export const TEST_SLUG = 'test-profile';
async function viewerIsAdmin() {
  try {
    const { currentUser } = await import('@/lib/supabase/server');
    const { isAdminEmail } = await import('@/lib/admin');
    return isAdminEmail((await currentUser())?.email);
  } catch { return false; }
}
async function testManager(): Promise<NearbyManager | null> {
  const { data: r } = await adminClient().from('managers').select(COLS).eq('slug', TEST_SLUG).maybeSingle();
  if (!r) return null;
  const extras = await withExtras([r as Row]);
  return { ...toPublic(r as Row, undefined, extras.get((r as Row).id)), nearby: 0, nearbyRating: null, nearestKm: null };
}
/** Adds the test profile to results when an admin is looking. */
export async function withTestForAdmin(list: NearbyManager[]): Promise<NearbyManager[]> {
  if (!(await viewerIsAdmin())) return list;
  const t = await testManager();
  return t && !list.some((m) => m.slug === t.slug) ? [...list, t] : list;
}

/** Managers with homes within COVER_KM of a point, busiest nearby first. */
export async function managersNear(lat: number, lng: number): Promise<NearbyManager[]> {
  const db = adminClient();
  const { data: near, error } = await db.rpc('managers_near', { p_lat: lat, p_lng: lng, p_km: COVER_KM });
  if (error) { console.error(error); return []; }
  const hits = (near || []) as { manager_id: string; nearby: number; nearby_rating: number | null; nearest_km: number | null }[];
  if (!hits.length) return [];
  const { data: rows } = await db.from('managers').select(COLS).in('id', hits.map((h) => h.manager_id)).eq('published', true);
  const [stats, extras] = await Promise.all([withStats((rows || []) as Row[]), withExtras((rows || []) as Row[])]);
  return ((rows || []) as Row[]).map((r) => {
    const h = hits.find((x) => x.manager_id === r.id)!;
    return { ...toPublic(r, stats.get(r.id), extras.get(r.id)), nearby: h.nearby, nearbyRating: h.nearby_rating == null ? null : Number(h.nearby_rating), nearestKm: h.nearest_km == null ? null : Number(h.nearest_km) };
  }).sort((a, b) => b.nearby - a.nearby || (b.avgRating ?? 0) - (a.avgRating ?? 0));
}

/** Fallback when we only have a postcode: managers who've declared that postcode. */
export async function managersForPostcode(postcode: string): Promise<NearbyManager[]> {
  const { data: rows } = await adminClient().from('managers').select(COLS).contains('postcodes', [postcode]).eq('published', true);
  const [stats, extras] = await Promise.all([withStats((rows || []) as Row[]), withExtras((rows || []) as Row[])]);
  return ((rows || []) as Row[]).map((r) => ({ ...toPublic(r, stats.get(r.id), extras.get(r.id)), nearby: 0, nearbyRating: null, nearestKm: null }));
}

export async function publicManager(slug: string): Promise<PublicManager | null> {
  const q = adminClient().from('managers').select(COLS).eq('slug', slug);
  const { data: r } = slug === TEST_SLUG && (await viewerIsAdmin()) ? await q.maybeSingle() : await q.eq('published', true).maybeSingle();
  if (!r) return null;
  const [stats, extras] = await Promise.all([withStats([r as Row]), withExtras([r as Row])]);
  return toPublic(r as Row, stats.get((r as Row).id), extras.get((r as Row).id));
}

/** Which of these managers cover a point (homes within COVER_KM). */
export async function coveringSlugs(lat: number, lng: number, slugs: string[], postcode?: string): Promise<Set<string>> {
  const near = await managersForArea(lat, lng, postcode);
  const out = new Set(near.filter((m) => slugs.includes(m.slug)).map((m) => m.slug));
  if (slugs.includes(TEST_SLUG) && (await viewerIsAdmin())) out.add(TEST_SLUG);
  return out;
}

/**
 * Managers covering a point: those running homes nearby (from listing data), plus managers who declare the
 * postcode as a service area (e.g. businesses found by web research, or a claimed manager's own areas).
 */
export async function managersForArea(lat: number, lng: number, postcode?: string): Promise<NearbyManager[]> {
  const near = await managersNear(lat, lng);
  if (!postcode || !/^\d{4}$/.test(postcode)) return near;
  const declared = (await managersForPostcode(postcode)).filter((m) => !near.some((n) => n.slug === m.slug));
  return [...near, ...declared];
}

/** Owner-only details. Call only after confirming the visitor is signed in. */
export async function gatedDetails(slug: string): Promise<GatedDetails | null> {
  const gq = adminClient().from('managers').select('fee_note, gated').eq('slug', slug);
  const { data: r } = slug === TEST_SLUG && (await viewerIsAdmin()) ? await gq.maybeSingle() : await gq.eq('published', true).maybeSingle();
  if (!r) return null;
  const g = (r.gated || {}) as Record<string, unknown>;
  return {
    feeNote: (r.fee_note as string) || null,
    setupFee: g.setupFee == null ? null : Number(g.setupFee),
    setupNote: (g.setupNote as string) || null,
    cleaningPassedOn: (g.cleaningPassedOn as boolean) ?? null,
    linenIncluded: (g.linenIncluded as boolean) ?? null,
    minTermMonths: g.minTermMonths == null ? null : Number(g.minTermMonths),
    noticeDays: g.noticeDays == null ? null : Number(g.noticeDays),
    ownerStaysAllowed: (g.ownerStaysAllowed as string) || null,
    inclusions: (g.inclusions as string[]) || [],
  };
}

export function feeLabel(m: Pick<PublicManager, 'feeMin' | 'feeMax'>): string | null {
  if (m.feeMin == null) return null;
  return m.feeMin === m.feeMax || m.feeMax == null ? `${m.feeMin}%` : `${m.feeMin}–${m.feeMax}%`;
}

/** Suburb-level totals for the profile map. Needs at least 2 homes per area (never individual listings). */
export async function managerAreas(slug: string): Promise<{ area: string; homes: number; lat: number; lng: number }[]> {
  const db = adminClient();
  const { data: m } = await db.from('managers').select('id').eq('slug', slug).eq('published', true).maybeSingle();
  if (!m) return [];
  const { data, error } = await db.rpc('manager_areas', { p_manager: m.id });
  if (error) { console.error(error); return []; }
  return ((data || []) as { area: string; homes: number; lat: number; lng: number }[]).filter((a) => a.area && !GENERIC_PLACES.has(a.area));
}

/** Private details used only by the claim flow. */
export async function managerForClaim(slug: string) {
  const { data } = await adminClient().from('managers').select('id, slug, name, website, claimed').eq('slug', slug).eq('published', true).maybeSingle();
  return data as { id: string; slug: string; name: string; website: string | null; claimed: boolean } | null;
}

/** A stable, brand-safe colour for a manager's initials tile. */
export function tileColour(name: string): { bg: string; fg: string } {
  const palette = [
    { bg: '#DDEEE9', fg: '#0F5E57' }, { bg: '#E3ECF7', fg: '#1F4E7A' }, { bg: '#F4E9D8', fg: '#7A4E12' },
    { bg: '#EDE6F3', fg: '#5B3B7A' }, { bg: '#F6E3E1', fg: '#8A3A2F' }, { bg: '#E6F0DC', fg: '#3F6420' },
  ];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}
