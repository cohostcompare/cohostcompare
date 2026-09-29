// Groups host/co-host accounts into manager businesses:
//  - accounts that co-manage mostly the same listings (team members of one company)
//  - accounts with the same business name (e.g. separate city accounts)
// /api/admin-clusters?pass=...&min=6
import { authorised, db } from './_lib/admin.js';

export const config = { maxDuration: 60 };

const CITY_WORDS = /\b(sydney|melbourne|anz|australia|au|nsw|vic|pty|ltd)\b/g;
const norm = (s) => String(s || '').toLowerCase().replace(/accommodaton/g, 'accommodation').replace(CITY_WORDS, '').replace(/[^a-z]/g, '');
// A "business-like" name: more than one word, or contains a business keyword
const businessLike = (s) => /\s/.test(String(s).trim()) && !/^[A-Z][a-z]+ (and|&) [A-Z][a-z]+$/.test(String(s).trim())
  || /(stay|host|home|holiday|apartment|management|property|bnb|comfy|luxe|abode|time|butler|rental|hotel|living)/i.test(String(s));

export default async function handler(req, res) {
  if (!authorised(req)) return res.status(404).send('Not found');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const min = Number(req.query.min || 6);
    let rows = [];
    for (let from = 0; ; from += 1000) {
      const key = (process.env.SUPABASE_SECRET_KEY || '').trim();
      const r = await fetch(`https://hkntldmrckaosytpjakw.supabase.co/rest/v1/str_listings?select=listing_id,host_id,host_name,cohost_ids,cohost_names,professional,rating_overall,num_reviews,locality,ttm_occupancy,ttm_avg_rate`, {
        headers: { apikey: key, Range: `${from}-${from + 999}` } });
      const batch = await r.json();
      if (!Array.isArray(batch)) throw new Error(JSON.stringify(batch).slice(0, 200));
      rows = rows.concat(batch);
      if (batch.length < 1000) break;
    }
    // operator -> listings
    const ops = new Map();
    const add = (id, name, l) => {
      if (!id) return;
      if (!ops.has(id)) ops.set(id, { id, name, listings: new Set() });
      ops.get(id).listings.add(l.listing_id);
    };
    for (const l of rows) {
      add(l.host_id, l.host_name, l);
      (l.cohost_ids || []).forEach((c, i) => add(c, (l.cohost_names || [])[i], l));
    }
    const big = [...ops.values()].filter((o) => o.listings.size >= 3);
    // union-find
    const parent = new Map(big.map((o) => [o.id, o.id]));
    const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
    const union = (a, b) => parent.set(find(a), find(b));
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
      const a = big[i], b = big[j];
      const [s, t] = a.listings.size <= b.listings.size ? [a, b] : [b, a];
      let shared = 0; for (const x of s.listings) if (t.listings.has(x)) shared++;
      if (shared / s.listings.size >= 0.6) union(a.id, b.id);
      else if (norm(a.name).length >= 5 && norm(a.name) === norm(b.name) && businessLike(a.name)) union(a.id, b.id);
    }
    const byListing = new Map(rows.map((l) => [l.listing_id, l]));
    const groups = new Map();
    for (const o of big) {
      const g = find(o.id);
      if (!groups.has(g)) groups.set(g, { accounts: [], listings: new Set() });
      groups.get(g).accounts.push(o);
      o.listings.forEach((x) => groups.get(g).listings.add(x));
    }
    const out = [...groups.values()].map((g) => {
      const ls = [...g.listings].map((id) => byListing.get(id)).filter(Boolean);
      const rated = ls.filter((l) => l.num_reviews > 0 && l.rating_overall != null);
      const names = g.accounts.sort((a, b) => b.listings.size - a.listings.size).map((a) => a.name);
      const label = names.find(businessLike) || names[0];
      return {
        name: label,
        business: Boolean(names.find(businessLike)),
        accounts: g.accounts.map((a) => ({ id: a.id, name: a.name, listings: a.listings.size })),
        listings: ls.length,
        professional: ls.some((l) => l.professional),
        avgRating: rated.length ? +(rated.reduce((s, l) => s + Number(l.rating_overall), 0) / rated.length).toFixed(2) : null,
        reviews: ls.reduce((s, l) => s + (l.num_reviews || 0), 0),
        avgOccupancy: ls.length ? +(ls.reduce((s, l) => s + Number(l.ttm_occupancy || 0), 0) / ls.length).toFixed(2) : null,
        localities: [...new Set(ls.map((l) => l.locality).filter(Boolean))],
      };
    }).filter((g) => g.listings >= min).sort((a, b) => b.listings - a.listings);
    return res.json({ totalListings: rows.length, businesses: out.filter((g) => g.business), individuals: out.filter((g) => !g.business).map(({ accounts, ...g }) => ({ ...g, accounts: accounts.length })) });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e.message || e) });
  }
}
