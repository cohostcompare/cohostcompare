-- CoHostCompare 024: fix the Supabase security advisor warning "function search path mutable".
-- Applied by Claude through the Supabase connector on 2 Oct 2026 (no need to run again).
alter function public.bump_manager_events(uuid[], text) set search_path = public, extensions, pg_temp;
alter function public.claims_touch_status() set search_path = public, extensions, pg_temp;
alter function public.log_search(text, text) set search_path = public, extensions, pg_temp;
alter function public.manager_areas(uuid) set search_path = public, extensions, pg_temp;
alter function public.managers_near(double precision, double precision, double precision) set search_path = public, extensions, pg_temp;
