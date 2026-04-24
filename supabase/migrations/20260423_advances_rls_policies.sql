-- Advances RLS by role and assignments.

alter table public.advances enable row level security;

drop policy if exists "advances_select_owner" on public.advances;
drop policy if exists "advances_select_admin" on public.advances;
drop policy if exists "advances_select_chusmas" on public.advances;
drop policy if exists "advances_select_pagador" on public.advances;
drop policy if exists "advances_select_aprobador_assignment" on public.advances;
drop policy if exists "advances_insert_owner_draft" on public.advances;
drop policy if exists "advances_update_owner_draft" on public.advances;
drop policy if exists "advances_update_aprobador" on public.advances;
drop policy if exists "advances_update_pagador" on public.advances;
drop policy if exists "advances_update_admin" on public.advances;

create policy "advances_select_owner"
  on public.advances
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "advances_select_admin"
  on public.advances
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

create policy "advances_select_chusmas"
  on public.advances
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'chusmas'
    )
  );

create policy "advances_select_pagador"
  on public.advances
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'pagador'
    )
  );

create policy "advances_select_aprobador_assignment"
  on public.advances
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
      from public.supervision_assignments sa
      where sa.supervisor_id = auth.uid()
        and sa.employee_id = advances.user_id
    )
  );

create policy "advances_insert_owner_draft"
  on public.advances
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'draft'
  );

create policy "advances_update_owner_draft"
  on public.advances
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and status in ('draft', 'rejected')
  )
  with check (
    user_id = auth.uid()
    and status in ('draft', 'submitted')
  );

create policy "advances_update_aprobador"
  on public.advances
  for update
  to authenticated
  using (
    status = 'submitted'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'aprobador'
    )
    and exists (
      select 1
      from public.supervision_assignments sa
      where sa.supervisor_id = auth.uid()
        and sa.employee_id = advances.user_id
    )
  )
  with check (
    status in ('approved', 'rejected')
  );

create policy "advances_update_pagador"
  on public.advances
  for update
  to authenticated
  using (
    status = 'approved'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'pagador'
    )
  )
  with check (
    status = 'paid'
  );

create policy "advances_update_admin"
  on public.advances
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
  with check (true);
