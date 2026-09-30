// Recent claims and quote requests (for checking the preview). /api/admin-recent?pass=...
import { authorised, db } from './_lib/admin.js';
export default async function handler(req, res) {
  if (!authorised(req)) return res.status(404).send('Not found');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const [claims, quotes] = await Promise.all([
      db('manager_claims?select=id,status,method,email,created_at,managers(name)&order=created_at.desc&limit=10'),
      db('quote_requests?select=id,created_at,suburb,postcode&order=created_at.desc&limit=5'),
    ]);
    return res.json({ claims, quotes });
  } catch (e) { return res.status(200).json({ ok: false, error: String(e.message || e) }); }
}
