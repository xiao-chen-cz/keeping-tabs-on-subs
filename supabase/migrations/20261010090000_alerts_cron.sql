-- Daily alert email (D21-23 Part C): pg_cron calls the send-alerts Edge Function at 05:00 UTC
-- (07:00 Berlin in summer, 06:00 in winter; "today" is computed per user, D8).
-- The project URL and the shared secret come from Vault, so no secret is in git. Before this runs, create:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'alerts_cron_secret');
-- x-region pins the function to Frankfurt (EU only).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-alerts-daily',
  '0 5 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-alerts',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-region', 'eu-central-1',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'alerts_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
