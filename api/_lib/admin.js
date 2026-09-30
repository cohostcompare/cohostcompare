// Shared helpers for admin-only functions. Requires ADMIN_TOKEN, SUPABASE_SECRET_KEY, AIRROI_API_KEY.
export const SUPABASE_URL = 'https://hkntldmrckaosytpjakw.supabase.co';

export function authorised(req) {
  const expected = (process.env.ADMIN_TOKEN || '').replace(/[`'"\s]/g, '');
  const given = String((req.query && req.query.pass) || '').trim();
  return Boolean(expected) && given === expected;
}

export async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = (process.env.SUPABASE_SECRET_KEY || '').trim();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`db ${method} ${path} -> ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export function listingRow(l) {
  const h = l.host_info || {}, loc = l.location_info || {}, p = l.property_details || {},
        rt = l.ratings || {}, pm = l.performance_metrics || {}, pr = l.pricing_info || {};
  return {
    listing_id: String(l.listing_info?.listing_id ?? ''),
    host_id: h.host_id != null ? String(h.host_id) : null,
    host_name: h.host_name ?? null,
    cohost_ids: (h.cohost_ids || []).map(String),
    cohost_names: (h.cohost_names || []).map(String),
    professional: h.professional_management ?? null,
    superhost: h.superhost ?? null,
    lat: loc.latitude ?? null, lng: loc.longitude ?? null,
    locality: loc.locality ?? null, district: loc.district ?? null, region: loc.region ?? null,
    bedrooms: p.bedrooms ?? null,
    num_reviews: rt.num_reviews ?? null, rating_overall: rt.rating_overall ?? null,
    ttm_revenue: pm.ttm_revenue ?? null, ttm_occupancy: pm.ttm_occupancy ?? null, ttm_avg_rate: pm.ttm_avg_rate ?? null,
    registration: p.registration ?? null, cleaning_fee: pr.cleaning_fee ?? null, currency: pr.currency ?? null,
    fetched_at: new Date().toISOString(),
  };
}
