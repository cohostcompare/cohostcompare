-- CoHostCompare: ignore "no rating yet" in averages (run once in Supabase: SQL Editor -> New query -> Run)
-- Airbnb only shows a rating after a few reviews; the data reports those listings as 0, which dragged averages down.

create or replace view public.manager_stats as
select m.id as manager_id,
       count(l.*)                                   as property_count,
       round(avg(l.rating_overall) filter (where l.num_reviews > 0 and l.rating_overall > 0), 2) as avg_rating,
       coalesce(sum(l.num_reviews), 0)              as review_count,
       round(avg(l.ttm_occupancy), 3)               as avg_occupancy,
       round(avg(l.ttm_avg_rate), 0)                as avg_nightly_rate,
       round(avg(l.ttm_revenue), 0)                 as avg_revenue,
       array_agg(distinct l.locality) filter (where l.locality is not null) as localities,
       max(l.fetched_at)                            as data_as_of
from public.managers m
left join public.str_listings l
  on l.host_id = any(m.airbnb_host_ids) or l.cohost_ids && m.airbnb_host_ids
group by m.id;
revoke all on public.manager_stats from anon, authenticated;

create or replace function public.managers_near(p_lat double precision, p_lng double precision, p_km double precision default 4)
returns table (manager_id uuid, nearby int, nearby_rating numeric, nearest_km numeric)
language sql stable as $$
  with l as (
    select m.id, lst.rating_overall, lst.num_reviews,
           6371 * 2 * asin(sqrt(
             power(sin(radians(lst.lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(lst.lat)) * power(sin(radians(lst.lng - p_lng) / 2), 2)
           )) as km
    from public.managers m
    join public.str_listings lst
      on lst.host_id = any (m.airbnb_host_ids) or lst.cohost_ids && m.airbnb_host_ids
    where m.published
      and lst.lat between p_lat - 0.1 and p_lat + 0.1
      and lst.lng between p_lng - 0.13 and p_lng + 0.13
  )
  select id,
         (count(*) filter (where km <= p_km))::int,
         round(avg(rating_overall) filter (where km <= p_km and num_reviews > 0 and rating_overall > 0), 2),
         round(min(km)::numeric, 1)
  from l
  group by id
  having count(*) filter (where km <= p_km) > 0;
$$;
revoke execute on function public.managers_near(double precision, double precision, double precision) from public, anon, authenticated;

notify pgrst, 'reload schema';
