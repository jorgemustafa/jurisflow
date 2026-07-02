# Production deployment

Production uses `compose.prod.yml`, which is separate from the development Compose. It builds the API, serves the web build through Nginx, runs pending Prisma migrations before starting the API, and keeps PostgreSQL private inside the Compose network.

## Security rules

- Production deployment is blocked while `.env.prod` contains placeholders, database passwords shorter than 32 URL-safe characters, a JWT secret shorter than 64 characters, or a non-HTTPS application origin.
- The PostgreSQL administrator and application users must be different.
- The application database role is not a superuser and cannot create databases, roles, or replication slots.
- PostgreSQL has no published host port. Administrative access must use `docker compose exec` or an SSH tunnel.
- TLS must terminate at the hosting provider or a reverse proxy in front of `WEB_PORT`. The included Nginx container only handles internal HTTP.
- `.env.prod` is ignored by Git. Restrict it to the deployment user with `chmod 600 .env.prod` on Linux.

## First deployment

Copy the template and generate new secrets on the production server:

```bash
cp .env.prod.example .env.prod
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
chmod 600 .env.prod
```

Use separate generated values for `POSTGRES_ADMIN_PASSWORD`, `POSTGRES_APP_PASSWORD`, and `JWT_SECRET`. Configure the real DataJud key and public HTTPS origin, then validate and start:

```bash
npm run prod:config
npm run prod:up
```

Do not run `docker compose down -v`; `-v` deletes the database volume.

The initialization script creates `POSTGRES_APP_USER` only when PostgreSQL initializes an empty volume. Changing `POSTGRES_*` values later does not modify roles in an existing database.

## Rotate credentials in an existing database

Back up the database first:

```bash
docker compose --env-file .env.prod -f compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > magistrum.backup
```

Generate new values with `openssl rand -hex 32`. Open `psql` as the current administrator:

```bash
docker compose --env-file .env.prod -f compose.prod.yml exec postgres \
  psql -U CURRENT_ADMIN_USER -d magistrum
```

Use interactive password prompts so secrets do not enter shell history:

```text
\password magistrum_admin
\password magistrum_app
```

Update the matching values in `.env.prod`, validate, and recreate the services:

```bash
npm run prod:config
docker compose --env-file .env.prod -f compose.prod.yml up -d --force-recreate api migrate
```

## Change PostgreSQL usernames

For a new, empty deployment, set `POSTGRES_ADMIN_USER` and `POSTGRES_APP_USER` before the first `prod:up`.

For an existing volume, changing `.env.prod` alone does nothing. Renaming the administrator is risky because health checks and ownership may still reference it. Prefer creating a replacement administrator, testing it, and disabling the old login:

```sql
CREATE ROLE new_admin WITH LOGIN SUPERUSER PASSWORD 'temporary-password';
```

Reconnect as `new_admin`, set its final password with `\password new_admin`, update `.env.prod`, recreate the PostgreSQL service, verify health, and only then run:

```sql
ALTER ROLE old_admin NOLOGIN;
```

To rename the application role, stop the API, connect as administrator, and run:

```sql
ALTER ROLE old_app_user RENAME TO new_app_user;
```

Set its password with `\password new_app_user`, update `POSTGRES_APP_USER` and `POSTGRES_APP_PASSWORD`, then start migration and API services again. Existing objects remain owned by the renamed role.

## Operations

```bash
docker compose --env-file .env.prod -f compose.prod.yml ps
docker compose --env-file .env.prod -f compose.prod.yml logs -f api web
docker compose --env-file .env.prod -f compose.prod.yml exec postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```
