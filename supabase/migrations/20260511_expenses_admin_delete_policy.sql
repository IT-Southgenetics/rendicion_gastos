-- Permite a admins eliminar gastos desde /dashboard/admin/reports/[id].
-- Sintoma previo: el cliente mostraba "Gasto eliminado." pero el row no se borraba.
-- Causa: no existia policy DELETE para admin en expenses. La unica policy con
-- DELETE era expenses_owner (FOR ALL) que exige user_id = auth.uid(), por lo que
-- al borrar un gasto ajeno RLS filtraba la fila silenciosamente (0 rows, sin error).

drop policy if exists "expenses_delete_staff_admin" on public.expenses;

create policy "expenses_delete_staff_admin"
  on public.expenses
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
