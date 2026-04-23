-- Expenses RLS: allow staff roles to SELECT rows that are not their own.
-- Symptom: admin (and similar) queries like weekly_reports with nested expenses(count)
-- returned count 0 because nested selects still apply RLS on expenses.
-- App routes: admin/reports, admin/reports/[id], viewer, aprobador, etc.

-- Idempotent policy names (safe to re-run after manual drops).
drop policy if exists "expenses_select_staff_admin" on public.expenses;
drop policy if exists "expenses_select_staff_chusmas_pagador" on public.expenses;
drop policy if exists "expenses_select_staff_aprobador_supervised" on public.expenses;
drop policy if exists "expenses_select_staff_viewer_assignment" on public.expenses;

-- Admin: full read (admin panel, stats, report detail).
create policy "expenses_select_staff_admin"
  on public.expenses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Chusmas / pagador: read all expenses (matches viewer home listing all employees).
create policy "expenses_select_staff_chusmas_pagador"
  on public.expenses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('chusmas', 'pagador')
    )
  );

-- Aprobador: expenses on reports owned by a supervised employee.
create policy "expenses_select_staff_aprobador_supervised"
  on public.expenses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'aprobador'
    )
    and exists (
      select 1
      from public.weekly_reports wr
      inner join public.supervision_assignments sa
        on sa.employee_id = wr.user_id
       and sa.supervisor_id = auth.uid()
      where wr.id = expenses.report_id
    )
  );

-- Viewer (assigned employees only): matches viewer_assignments in the app.
create policy "expenses_select_staff_viewer_assignment"
  on public.expenses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.viewer_assignments va
      where va.viewer_id = auth.uid()
        and va.employee_id = expenses.user_id
    )
  );
