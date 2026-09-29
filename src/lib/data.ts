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
  licensed_agent: boolean | null; claimed: boolean; gated: Record<string, unknown>;
};
type Stats = { manager_id: string; property_count: number; avg_rating: number | null; review_count: number; avg_occupancy: number | null; avg_nightly_rate: number | null; localities: string[] | null; data_as_of: string | null };

const COLS = 'id, slug, name, tagline, about, cities, postcodes, platforms, services, fee_min, fee_max, fee_note, licensed_agent, claimed, gated';

function initials(name: string) {
  return name.replace(/['’]/g, '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || name.slice(0, 2).toUpperCase();
}

function toPublic(r: Row, s?: Stats): PublicManager {
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    slug: r.slug, name: r.name, tagline: r.tagline || '', about: r.about || '', initials: initials(r.name),
    cities: r.cities || [],
    suburbs: (s?.localities || []).filter((x) => !GENERIC_PLACES.has(x)).sort(),
    propertyCount: s ? Number(s.property_count) : null,
    avgRating: n(s?.avg_rating), reviewCount: s ? Number(s.review_count) : null,
    avgOccupancy: n(s?.avg_occupancy), avgNightlyRate: n(s?.avg_nightly_rate),
    platforms: r.platforms || [], services: r.services || [],
    feeMin: n(r.fee_min), feeMax: n(r.fee_max), licensedAgent: r.licensed_agent,
    responseHours: null, claimed: r.claimed, dataAsOf: s?.data_as_of || null,
    tile: tileColour(r.name),
  };
}

async function withStats(rows: Row[]): Promise<Map<string, Stats>> {
  if (!rows.length) return new Map();
  const { data } = await adminClient().from('manager_stats').select('*').in('manager_id', rows.map((r) => r.id));
  return new Map((data as Stats[] | null || []).map((s) => [s.manager_id, s]));
}

/** Managers with homes within COVER_KM of a point, busiest nearby first. */
export async function managersNear(lat: number, lng: number): Promise<NearbyManager[]> {
  const db = adminClient();
  const { data: near, error } = await db.rpc('managers_near', { p_lat: lat, p_lng: lng, p_km: COVER_KM });
  if (error) { console.error(error); return []; }
  const hits = (near || []) as { manager_id: string; nearby: number; nearby_rating: number | null; nearest_km: number | null }[];
  if (!hits.length) return [];
  const { data: rows } = await db.from('managers').select(COLS).in('id', hits.map((h) => h.manager_id)).eq('published', true);
  const stats = await withStats((rows || []) as Row[]);
  return ((rows || []) as Row[]).map((r) => {
    const h = hits.find((x) => x.manager_id === r.id)!;
    return { ...toPublic(r, stats.get(r.id)), nearby: h.nearby, nearbyRating: h.nearby_rating == null ? null : Number(h.nearby_rating), nearestKm: h.nearest_km == null ? null : Number(h.nearest_km) };
  }).sort((a, b) => b.nearby - a.nearby || (b.avgRating ?? 0) - (a.avgRating ?? 0));
}

/** Fallback when we only have a postcode: managers who've declared that postcode. */
export async function managersForPostcode(postcode: string): Promise<NearbyManager[]> {
  const { data: rows } = await adminClient().from('managers').select(COLS).contains('postcodes', [postcode]).eq('published', true);
  const stats = await withStats((rows || []) as Row[]);
  return ((rows || []) as Row[]).map((r) => ({ ...toPublic(r, stats.get(r.id)), nearby: 0, nearbyRating: null, nearestKm: null }));
}

export async function publicManager(slug: string): Promise<PublicManager | null> {
  const { data: r } = await adminClient().from('managers').select(COLS).eq('slug', slug).eq('published', true).maybeSingle();
  if (!r) return null;
  const stats = await withStats([r as Row]);
  return toPublic(r as Row, stats.get((r as Row).id));
}

/** Which of these managers cover a point (homes within COVER_KM). */
export async function coveringSlugs(lat: number, lng: number, slugs: string[]): Promise<Set<string>> {
  const near = await managersNear(lat, lng);
  return new Set(near.filter((m) => slugs.includes(m.slug)).map((m) => m.slug));
}

/** Owner-only details. Call only after confirming the visitor is signed in. */
export async function gatedDetails(slug: string): Promise<GatedDetails | null> {
  const { data: r } = await adminClient().from('managers').select('fee_note, gated').eq('slug', slug).eq('published', true).maybeSingle();
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
