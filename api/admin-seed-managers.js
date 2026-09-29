// Creates/updates manager profiles from the researched seed list, linking each to the
// Airbnb accounts found for it in the swept data. /api/admin-seed-managers?pass=...
import { authorised, db } from './_lib/admin.js';
import { cluster, loadListings, norm } from './_lib/cluster.js';
import { SEED } from './_lib/seed.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!authorised(req)) return res.status(404).send('Not found');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const groups = cluster(await loadListings());
    const report = [];
    const rows = [];
    for (const s of SEED) {
      const g = groups.find((grp) => grp.accounts.some((a) => s.match.includes(norm(a.name))));
      if (!g) { report.push({ slug: s.slug, matched: false }); continue; }
      rows.push({
        slug: s.slug, name: s.name, tagline: s.tagline || null, about: s.about || null,
        airbnb_host_ids: g.accounts.map((a) => a.id), website: s.website || null,
        cities: s.cities || [], platforms: ['Airbnb'], services: s.services || [],
        fee_min: s.fee_min ?? null, fee_max: s.fee_max ?? null, fee_note: s.fee_note || null,
        licensed_agent: s.licensed_agent ?? null, gated: s.gated || {}, sources: s.sources || [],
        published: Boolean(s.published), updated_at: new Date().toISOString(),
      });
      report.push({ slug: s.slug, matched: true, accounts: g.accounts.length, listings: g.listings.size });
    }
    if (rows.length) await db('managers?on_conflict=slug', { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' });
    return res.json({ saved: rows.length, report });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e.message || e) });
  }
}
