// Returns a manager profile to unclaimed and removes its claims and members. /api/admin-reset-claim?pass=...&slug=...
import { authorised, db } from './_lib/admin.js';
export default async function handler(req, res) {
  if (!authorised(req)) return res.status(404).send('Not found');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const slug = String(req.query.slug || '');
    const [m] = await db(`managers?slug=eq.${encodeURIComponent(slug)}&select=id,name`);
    if (!m) return res.json({ ok: false, error: 'No such manager' });
    await db(`manager_members?manager_id=eq.${m.id}`, { method: 'DELETE', prefer: 'return=minimal' });
    await db(`manager_claims?manager_id=eq.${m.id}`, { method: 'DELETE', prefer: 'return=minimal' });
    await db(`managers?id=eq.${m.id}`, { method: 'PATCH', body: { claimed: false }, prefer: 'return=minimal' });
    return res.json({ ok: true, reset: m.name });
  } catch (e) { return res.status(200).json({ ok: false, error: String(e.message || e) }); }
}
