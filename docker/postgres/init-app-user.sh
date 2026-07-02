#!/bin/sh
set -eu

psql --set=ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=app_user="$APP_DATABASE_USER" \
  --set=app_password="$APP_DATABASE_PASSWORD" \
  --set=database_name="$POSTGRES_DB" <<'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'app_user',
  :'app_password'
) \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'database_name', :'app_user') \gexec
SELECT format('ALTER SCHEMA public OWNER TO %I', :'app_user') \gexec
SQL
