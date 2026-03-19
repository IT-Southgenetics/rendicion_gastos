-- Adds optional Odoo move id to weekly_reports.
-- Run in Supabase SQL editor or via your migration workflow.

alter table public.weekly_reports
add column if not exists odoo_move_id bigint;

