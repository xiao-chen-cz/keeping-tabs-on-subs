-- First-sign-in tour: null until the user finishes or skips it, then the time they did.
-- Covered by the existing profiles grants (select, update) and RLS on user_id.
alter table public.profiles add column tour_done_at timestamptz;
