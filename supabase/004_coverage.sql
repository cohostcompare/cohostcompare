-- CoHostCompare: coverage search (run once in Supabase: SQL Editor -> New query -> Run)
-- A manager covers a location when they run at least one home within p_km of it.

alter table public.managers add column if not exists sources text[] not null default '{}';
alter table public.managers add column if not exists fee_note text;

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
         round(avg(rating_overall) filter (where km <= p_km and num_reviews > 0), 2),
         round(min(km)::numeric, 1)
  from l
  group by id
  having count(*) filter (where km <= p_km) > 0;
$$;

revoke execute on function public.managers_near(double precision, double precision, double precision) from public, anon, authenticated;
