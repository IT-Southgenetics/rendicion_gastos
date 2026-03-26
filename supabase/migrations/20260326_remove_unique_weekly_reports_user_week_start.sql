-- Allow multiple reports for same user and week_start.
-- This drops the unique constraint/index that prevents duplicates.

alter table public.weekly_reports
  drop constraint if exists weekly_reports_user_id_week_start_key;

drop index if exists public.weekly_reports_user_id_week_start_key;

