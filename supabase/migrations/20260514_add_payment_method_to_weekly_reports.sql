-- Medio de pago: empleado (flujo Odoo actual) vs tarjeta corporativa (sin asiento Odoo).
alter table public.weekly_reports
  add column if not exists payment_method text not null default 'employee_paid';

alter table public.weekly_reports
  drop constraint if exists weekly_reports_payment_method_check;

alter table public.weekly_reports
  add constraint weekly_reports_payment_method_check
  check (payment_method in ('employee_paid', 'corporate_card'));
