-- CoHostCompare 036: pricing change of 8 Nov 2026 (first client free, then A$99 + GST launch price until 30 Apr 2027, then A$400 + GST).
-- Managers who had already claimed were told "4 free a month": they keep that until the launch price ends. Applied via the connector.
alter table public.managers add column if not exists legacy_free boolean not null default false;
comment on column public.managers.legacy_free is 'Claimed before 8 Nov 2026 pricing change: keeps 4 free accepted clients a month until the launch price ends (30 Apr 2027).';
update public.managers set legacy_free = true where claimed;
