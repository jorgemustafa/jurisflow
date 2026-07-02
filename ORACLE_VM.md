# Deploy on an Oracle Cloud VM

This guide deploys Magistrum with the production Compose. A public domain and HTTPS reverse proxy are required before storing real client data.

## 1. VM and network

Create an Ubuntu VM, attach a persistent boot volume, and configure SSH key access. Allow only these public inbound ports:

- `22/tcp` from trusted administrative IPs.
- `80/tcp` and `443/tcp` for the HTTPS reverse proxy.

Do not expose PostgreSQL `5432`, API `3333`, Vite `5173`, or the internal web port `8080` publicly.

## 2. Install and configure

Install Docker Engine with the Compose plugin, clone the repository, and create the production environment:

```bash
git clone git@github.com:jorgemustafa/magistrum.git
cd magistrum
cp .env.prod.example .env.prod
chmod 600 .env.prod
```

Generate independent values for the administrator password, application password, and JWT secret:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Fill `.env.prod`, including the real `DATAJUD_API_KEY` and the public HTTPS `APP_ORIGIN`. Validate and deploy:

```bash
npm run prod:config
npm run prod:up
```

The production Compose:

- initializes separate PostgreSQL administrator and application roles;
- runs pending Prisma migrations before the API starts;
- runs the compiled API as a non-root user;
- serves the compiled frontend through Nginx;
- keeps PostgreSQL and the API inside the Docker network;
- binds the web service only to `127.0.0.1:8080` by default.

## 3. HTTPS proxy

Configure Caddy, Nginx, Traefik, or the cloud load balancer to terminate TLS for the domain in `APP_ORIGIN` and proxy to:

```text
http://127.0.0.1:8080
```

Redirect HTTP to HTTPS and enable automatic certificate renewal. Do not change the web binding to `0.0.0.0` as a substitute for configuring TLS.

## 4. First user

Create the initial administrator through the one-shot migration image, which contains the administrative scripts:

```bash
docker compose --env-file .env.prod -f compose.prod.yml run --rm migrate \
  npm run user:create -- --name "Admin" --email "admin@example.com" --password "REPLACE_ME" --role admin
```

Replace every example value and use a unique password. Never seed demo data in production.

## 5. Operations

```bash
docker compose --env-file .env.prod -f compose.prod.yml ps
docker compose --env-file .env.prod -f compose.prod.yml logs -f api web
docker compose --env-file .env.prod -f compose.prod.yml pull
npm run prod:up
```

Back up the database to protected storage before every upgrade:

```bash
docker compose --env-file .env.prod -f compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > magistrum-$(date +%F).backup
```

The exact credential rotation procedure is in `docs/production.md`. Never run `docker compose down -v` against production.
