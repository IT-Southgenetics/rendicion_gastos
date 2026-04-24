-- Permite a admins actualizar gastos desde /dashboard/admin/reports/[id].
-- Sin policy UPDATE, RLS puede dejar el update en 0 filas sin error.

drop policy if exists "expenses_update_staff_admin" on public.expenses;

create policy "expenses_update_staff_admin"
  on public.expenses
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
-- Allow admins to review expense rows from admin report detail.
-- Without UPDATE policy, RLS can silently skip row changes.

drop policy if exists "expenses_update_staff_admin" on public.expenses;

create policy "expenses_update_staff_admin"
  on public.expenses
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
