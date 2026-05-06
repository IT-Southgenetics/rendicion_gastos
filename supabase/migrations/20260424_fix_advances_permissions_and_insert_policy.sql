grant usage on schema public to authenticated;
grant select, insert, update on table public.advances to authenticated;

drop policy if exists "advances_insert_owner_draft" on public.advances;
drop policy if exists "advances_insert_owner_draft_or_submitted" on public.advances;

create policy "advances_insert_owner_draft_or_submitted"
  on public.advances
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status in ('draft', 'submitted')
  );
-- Ensure authenticated users can insert into advances
-- and that submitted status is allowed at insert.

grant usage on schema public to authenticated;
grant select, insert, update on table public.advances to authenticated;

drop policy if exists "advances_insert_owner_draft" on public.advances;
drop policy if exists "advances_insert_owner_draft_or_submitted" on public.advances;

create policy "advances_insert_owner_draft_or_submitted"
  on public.advances
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status in ('draft', 'submitted')
  );
