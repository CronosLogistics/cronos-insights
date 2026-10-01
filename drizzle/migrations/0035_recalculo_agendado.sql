-- lovable-cron-fallback-reviewed: one-off job that unschedules itself on first run to recalculate analyses without request timeout
ALTER ROLE service_role RESET statement_timeout;
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('recalculo_unico', '* * * * *', $$SELECT cron.unschedule('recalculo_unico'); SET statement_timeout = 0; SELECT public.atualizar_analises(); SELECT public.atualizar_analises_periodo(); SELECT public.atualizar_analises_frete();$$);