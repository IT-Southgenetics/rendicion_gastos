-- Advances module: core schema.
-- 1 anticipo = 1 rendicion (both sides unique).

create table if not exists public.advances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  approver_id uuid null references public.profiles(id) on delete set null,
  title text not null,
  advance_date date not null,
  requested_amount numeric(12, 2) not null check (requested_amount > 0),
  currency text not null check (currency in ('USD', 'UYU', 'ARS', 'MXN', 'CLP', 'GTQ', 'HNL')),
  description text null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected', 'paid')),
  rejection_reason text null,
  submitted_at timestamptz null,
  approved_at timestamptz null,
  approved_by uuid null references public.profiles(id) on delete set null,
  paid_at timestamptz null,
  paid_by uuid null references public.profiles(id) on delete set null,
  payment_date date null,
  payment_receipt_url text null,
  payment_receipt_path text null,
  created_report_id uuid null unique references public.weekly_reports(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists advances_user_id_idx on public.advances(user_id);
create index if not exists advances_approver_id_idx on public.advances(approver_id);
create index if not exists advances_status_idx on public.advances(status);
create index if not exists advances_created_at_idx on public.advances(created_at desc);

alter table public.weekly_reports
  add column if not exists advance_id uuid null unique references public.advances(id) on delete set null,
  add column if not exists advance_amount_usd numeric(12, 2) null,
  add column if not exists settlement_direction text null check (settlement_direction in ('company_pays_employee', 'employee_returns_company', 'settled_zero')),
  add column if not exists settlement_amount_usd numeric(12, 2) null,
  add column if not exists payment_currency text null;

create index if not exists weekly_reports_advance_id_idx on public.weekly_reports(advance_id);
