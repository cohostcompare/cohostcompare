// Groups host/co-host accounts into manager businesses (shared listings or same business name).
const CITY_WORDS = /\b(sydney|melbourne|anz|australia|au|nsw|vic|pty|ltd)\b/g;
export const norm = (s) => String(s || '').toLowerCase().replace(/accommodaton/g, 'accommodation').replace(CITY_WORDS, '').replace(/[^a-z]/g, '');
export const businessLike = (s) => /\s/.test(String(s).trim()) && !/^[A-Z][a-z]+ (and|&) [A-Z][a-z]+$/.test(String(s).trim())
  || /(stay|host|home|holiday|apartment|management|property|bnb|comfy|luxe|abode|time|butler|rental|hotel|living)/i.test(String(s));

export async function loadListings() {
  const key = (process.env.SUPABASE_SECRET_KEY || '').trim();
  let rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch('https://hkntldmrckaosytpjakw.supabase.co/rest/v1/str_listings?select=listing_id,host_id,host_name,cohost_ids,cohost_names,professional,rating_overall,num_reviews,locality,ttm_occupancy,ttm_avg_rate', {
      headers: { apikey: key, Range: `${from}-${from + 999}` } });
    const batch = await r.json();
    if (!Array.isArray(batch)) throw new Error(JSON.stringify(batch).slice(0, 200));
    rows = rows.concat(batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

export function cluster(rows) {
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
  const groups = new Map();
  for (const o of big) {
    const g = find(o.id);
    if (!groups.has(g)) groups.set(g, { accounts: [], listings: new Set() });
    groups.get(g).accounts.push(o);
    o.listings.forEach((x) => groups.get(g).listings.add(x));
  }
  return [...groups.values()];
}
