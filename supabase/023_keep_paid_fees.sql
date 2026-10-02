-- CoHostCompare 023: keep paid client confirmations on record if the owner later deletes their account.
-- Run once in Supabase after 022: SQL Editor -> New query -> paste -> Run.
-- Before: deleting an owner removed their requests, threads and (by cascade) the A$99 fee records.
-- After: the fee row stays, with thread_id set to null.

alter table public.success_fees alter column thread_id drop not null;
alter table public.success_fees drop constraint if exists success_fees_thread_id_fkey;
alter table public.success_fees
  add constraint success_fees_thread_id_fkey foreign key (thread_id)
  references public.quote_request_managers (id) on delete set null;

notify pgrst, 'reload schema';
