-- CoHostCompare core schema (run once in Supabase: SQL Editor -> New query -> Run)
-- Everything is private by default (RLS on, no public policies). The website reads
-- through the server with the secret key, and only ever sends public fields to browsers.

-- 1. Raw short-term rental listings from AirROI (private; never shown one by one)
create table if not exists public.str_listings (
  listing_id      text primary key,
  host_id         text,
  host_name       text,
  cohost_ids      text[] not null default '{}',
  cohost_names    text[] not null default '{}',
  professional    boolean,
  superhost       boolean,
  lat             double precision,
  lng             double precision,
  locality        text,
  district        text,
  region          text,
  bedrooms        int,
  num_reviews     int,
  rating_overall  numeric,
  ttm_revenue     numeric,
  ttm_occupancy   numeric,
  ttm_avg_rate    numeric,
  registration    text,
  cleaning_fee    numeric,
  currency        text,
  fetched_at      timestamptz not null default now()
);
create index if not exists str_listings_host_idx on public.str_listings (host_id);
create index if not exists str_listings_cohosts_idx on public.str_listings using gin (cohost_ids);
create index if not exists str_listings_locality_idx on public.str_listings (locality);

-- 2. Sweep progress: one row per circle we page through
create table if not exists public.sweep_cells (
  id            text primary key,          -- e.g. 'syd-bondi'
  label         text not null,
  lat           double precision not null,
  lng           double precision not null,
  radius_miles  numeric not null default 1,
  next_offset   int not null default 0,
  done          boolean not null default false,
  listings_seen int not null default 0,
  calls_used    int not null default 0,
  updated_at    timestamptz not null default now()
);

insert into public.sweep_cells (id, label, lat, lng) values
  ('syd-bondi',       'Bondi / Bronte',        -33.8915, 151.2767),
  ('syd-coogee',      'Coogee / Randwick',     -33.9200, 151.2550),
  ('syd-surry-hills', 'Surry Hills / Paddington', -33.8860, 151.2150),
  ('syd-cbd',         'Sydney CBD',            -33.8688, 151.2093),
  ('syd-manly',       'Manly',                 -33.7969, 151.2860),
  ('syd-newtown',     'Newtown',               -33.8980, 151.1790),
  ('mel-cbd',         'Melbourne CBD / Southbank', -37.8136, 144.9631),
  ('mel-st-kilda',    'St Kilda',              -37.8676, 144.9800),
  ('mel-richmond',    'Richmond / South Yarra', -37.8330, 144.9950),
  ('mel-fitzroy',     'Fitzroy / Collingwood', -37.7990, 144.9800)
on conflict (id) do nothing;

-- 3. Managers shown on the site
create table if not exists public.managers (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  tagline          text,
  about            text,
  airbnb_host_ids  text[] not null default '{}',   -- links to str_listings host/cohost ids
  website          text,                            -- private until an enquiry is accepted
  contact_email    text,                            -- private
  cities           text[] not null default '{}',
  suburbs          text[] not null default '{}',
  postcodes        text[] not null default '{}',
  platforms        text[] not null default '{Airbnb}',
  services         text[] not null default '{}',
  fee_min          numeric,
  fee_max          numeric,
  licensed_agent   boolean,
  gated            jsonb not null default '{}',     -- setup fee, terms: owners with an account only
  claimed          boolean not null default false,
  published        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 4. Stats per manager, computed from their linked listings
create or replace view public.manager_stats as
select m.id as manager_id,
       count(l.*)                                   as property_count,
       round(avg(l.rating_overall) filter (where l.num_reviews > 0), 2) as avg_rating,
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

-- 5. Candidate operators found in the data (for choosing which managers to pre-build)
create or replace view public.operator_candidates as
with ops as (
  select host_id as op_id, host_name as op_name, l.* from public.str_listings l where host_id is not null
  union all
  select c.id, c.name, l.* from public.str_listings l,
    unnest(l.cohost_ids, l.cohost_names) as c(id, name)
)
select op_id, max(op_name) as name,
       count(distinct listing_id)            as listings,
       bool_or(professional)                 as professional,
       round(avg(rating_overall) filter (where num_reviews > 0), 2) as avg_rating,
       sum(num_reviews)                      as reviews,
       array_agg(distinct locality) filter (where locality is not null) as localities
from ops
group by op_id
having count(distinct listing_id) >= 3
order by listings desc;

-- Lock everything down: no public access at all
alter table public.str_listings enable row level security;
alter table public.sweep_cells  enable row level security;
alter table public.managers     enable row level security;
revoke all on public.str_listings, public.sweep_cells, public.managers from anon, authenticated;
revoke all on public.manager_stats, public.operator_candidates from anon, authenticated;
