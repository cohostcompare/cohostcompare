-- CoHostCompare 033: scale for the Nov 2026 full Sydney/Melbourne AirROI pull (str_listings ~6k -> ~21k rows).
-- Applied through the Supabase connector on 6 Nov 2026. Safe to re-run.

-- 1. Location index for the bounding-box filters.
create index if not exists str_listings_latlng_idx on public.str_listings (lat, lng);

-- 2. managers_near: same results, but matches listings to managers by account with hash joins
--    instead of checking every listing in the box against every manager's account array.
create or replace function public.managers_near(p_lat double precision, p_lng double precision, p_km double precision default 4)
returns table (manager_id uuid, nearby int, nearby_rating numeric, nearest_km numeric)
language plpgsql stable
set search_path = public, extensions, pg_temp
set plan_cache_mode = force_custom_plan -- plan with the real location so the lat/lng index is used
as $$
begin
  return query
  with acc as (
    select mg.id, h from public.managers mg, unnest(mg.airbnb_host_ids) h where mg.published
  ),
  box as (
    select s.listing_id, s.host_id, s.cohost_ids, s.rating_overall, s.num_reviews, s.lat, s.lng
    from public.str_listings s
    where s.lat between p_lat - 0.1 and p_lat + 0.1
      and s.lng between p_lng - 0.13 and p_lng + 0.13
  ),
  m as (
    select a.id, b.listing_id, b.rating_overall, b.num_reviews, b.lat, b.lng from box b join acc a on a.h = b.host_id
    union
    select a.id, b.listing_id, b.rating_overall, b.num_reviews, b.lat, b.lng from box b cross join lateral unnest(b.cohost_ids) c join acc a on a.h = c
  ),
  l as (
    select m.id, m.rating_overall, m.num_reviews,
           6371 * 2 * asin(sqrt(
             power(sin(radians(m.lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(m.lat)) * power(sin(radians(m.lng - p_lng) / 2), 2)
           )) as km
    from m
  )
  select l.id,
         (count(*) filter (where l.km <= p_km))::int,
         round(avg(l.rating_overall) filter (where l.km <= p_km and l.num_reviews > 0 and l.rating_overall > 0), 2),
         round(min(l.km)::numeric, 1)
  from l
  group by l.id
  having count(*) filter (where l.km <= p_km) > 0;
end $$;
revoke execute on function public.managers_near(double precision, double precision, double precision) from public, anon, authenticated;

-- 3. Atomic AirROI call counter (used by the preview-only /api/data-test job).
create or replace function public.airroi_take_call(p_key text, p_cap int)
returns int language plpgsql set search_path = public as $$
declare n int;
begin
  insert into market_cache(key, data) values (p_key, jsonb_build_object('calls', 0))
  on conflict (key) do nothing;
  update market_cache set data = jsonb_set(data, '{calls}', to_jsonb(coalesce((data->>'calls')::int, 0) + 1)) || jsonb_build_object('updatedAt', now())
   where key = p_key and coalesce((data->>'calls')::int, 0) < p_cap
  returning (data->>'calls')::int into n;
  return coalesce(n, -1);
end $$;
revoke execute on function public.airroi_take_call(text, int) from public, anon, authenticated;

notify pgrst, 'reload schema';
