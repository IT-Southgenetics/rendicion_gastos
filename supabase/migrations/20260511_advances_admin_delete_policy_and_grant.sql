-- Permite a admins eliminar anticipos desde /dashboard/admin/advances/[id].
-- Sintoma previo: el cliente mostraba "permission denied for table advances".
-- Causa: al rol authenticated le faltaba el privilegio DELETE en public.advances,
-- y ademas no existia una policy DELETE para admin. La migracion
-- 20260505_advances_fix_insert_policy_and_add_delete.sql intentaba arreglar esto
-- pero nunca se aplico en la BD remota.

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
