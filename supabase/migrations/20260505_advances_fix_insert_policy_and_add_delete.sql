-- Restringe INSERT a status='draft' para cerrar el bypass de validaciones del server action.
-- La transicion a 'submitted' se hace via UPDATE (policy advances_update_owner_draft).
-- Agrega policy DELETE para admin y el grant correspondiente.

drop policy if exists "advances_insert_owner_draft" on public.advances;
drop policy if exists "advances_insert_owner_draft_or_submitted" on public.advances;

create policy "advances_insert_owner_draft"
  on public.advances
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'draft'
  );

drop policy if exists "advances_delete_admin" on public.advances;

create policy "advances_delete_admin"
  on public.advances
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

grant delete on table public.advances to authenticated;
