// Admin-only probe: checks what AirROI returns for listings around a point,
// so we can confirm it identifies hosts/managers. Needs AIRROI_API_KEY and
// ADMIN_TOKEN set in Vercel. Remove once the data pipeline is built.
export default async function handler(req, res) {
  const url = new URL(req.url, 'https://x');
  const expected = (process.env.ADMIN_TOKEN || '').replace(/[`'"\s]/g, '');
  if (!expected || String((req.query && req.query.pass) ?? url.searchParams.get('pass') ?? '').trim() !== expected) {
    return res.status(404).send('Not found');
  }
  const lat = Number((req.query && req.query.lat) || url.searchParams.get('lat') || -33.8915);   // Bondi Beach
  const lng = Number((req.query && req.query.lng) || url.searchParams.get('lng') || 151.2767);
  const r = await fetch('https://api.airroi.com/listings/search/radius', {
    method: 'POST',
    headers: { 'x-api-key': process.env.AIRROI_API_KEY || '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng, radius_miles: 0.6, page_size: 50 }),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { return res.status(200).json({ status: r.status, raw: text.slice(0, 2000) }); }
  const list = data.results || data.listings || data.data || [];
  const first = list[0] || {};
  const flatKeys = (o, p = '') => Object.entries(o || {}).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flatKeys(v, p + k + '.') : [p + k]);
  // group by any host-like field we can find
  const hostKey = flatKeys(first).find((k) => /host.*(id|name)/i.test(k));
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const groups = {};
  if (hostKey) for (const l of list) { const h = String(get(l, hostKey)); groups[h] = (groups[h] || 0) + 1; }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: r.status,
    topLevelKeys: Object.keys(data),
    totalCount: data.total_count ?? data.total ?? null,
    returned: list.length,
    listingFields: flatKeys(first),
    hostField: hostKey || null,
    listingsPerHost: Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 15),
    sample: list.slice(0, 2),
  });
}
