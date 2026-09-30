// Lists operators found in the swept data, busiest first. /api/admin-candidates?pass=...&min=5
import { authorised, db } from './_lib/admin.js';

export default async function handler(req, res) {
  if (!authorised(req)) return res.status(404).send('Not found');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const min = Number(req.query.min || 5);
    const [ops, cells] = await Promise.all([
      db(`operator_candidates?listings=gte.${min}&order=listings.desc&limit=100`),
      db('sweep_cells?select=id,label,done,listings_seen,calls_used&order=id.asc'),
    ]);
    return res.json({ cells, operators: ops });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e.message || e) });
  }
}
