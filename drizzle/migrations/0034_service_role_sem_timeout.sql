ALTER ROLE service_role SET statement_timeout = '0';
NOTIFY pgrst, 'reload config';