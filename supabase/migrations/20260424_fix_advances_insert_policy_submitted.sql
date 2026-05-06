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
drop policy if exists "advances_insert_owner_draft" on public.advances;

create policy "advances_insert_owner_draft_or_submitted"
  on public.advances
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status in ('draft', 'submitted')
  );
