// Pages through AirROI listings for sweep cells and stores them in Supabase.
// /api/admin-sweep?pass=...&cell=syd-bondi&calls=20   (cell optional: picks the next unfinished one)
import { authorised, db, listingRow } from './_lib/admin.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!authorised(req)) return res.status(404).send('Not found');
  res.setHeader('Cache-Control', 'no-store');
  const maxCalls = Math.min(Number(req.query.calls || 20), 50);
  const started = Date.now();
  try {
    const cellQ = req.query.cell ? `id=eq.${encodeURIComponent(req.query.cell)}` : 'done=eq.false&order=id.asc&limit=1';
    const [cell] = await db(`sweep_cells?${cellQ}`);
    if (!cell) return res.json({ message: 'No unfinished cells.' });
    let offset = cell.next_offset, calls = 0, stored = 0, done = cell.done;
    while (!done && calls < maxCalls && Date.now() - started < 45000) {
      const r = await fetch('https://api.airroi.com/listings/search/radius', {
        method: 'POST',
        headers: { 'x-api-key': (process.env.AIRROI_API_KEY || '').trim(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: cell.lat, longitude: cell.lng, radius_miles: Number(cell.radius_miles), currency: 'native',
          filter: { room_type: { eq: 'entire_home' } }, sort: { ttm_revenue: 'desc' }, pagination: { page_size: 10, offset } }),
      });
      calls++;
      const data = await r.json();
      if (!r.ok) throw new Error(`airroi ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
      const rows = (data.results || []).map(listingRow).filter((x) => x.listing_id);
      if (rows.length) await db('str_listings?on_conflict=listing_id', { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' });
      stored += rows.length; offset += 10;
      if ((data.results || []).length < 10) done = true;
    }
    await db(`sweep_cells?id=eq.${cell.id}`, { method: 'PATCH', prefer: 'return=minimal', body: {
      next_offset: offset, done, listings_seen: cell.listings_seen + stored, calls_used: cell.calls_used + calls, updated_at: new Date().toISOString() } });
    return res.json({ cell: cell.id, label: cell.label, callsThisRun: calls, storedThisRun: stored, nextOffset: offset, done, totalSeen: cell.listings_seen + stored, totalCalls: cell.calls_used + calls });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e.message || e) });
  }
}
