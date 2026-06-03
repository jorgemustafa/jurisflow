# Local Development

## Common Commands

Use npm workspace scripts from the repository root.

```bash
npm run dev:api
npm run dev:web
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run seed:demo
```

## Public DataJud Import

The assisted case import uses the CNJ DataJud public API. Set `DATAJUD_API_KEY` in `.env` before using `/cases/import`.

```env
DATAJUD_API_KEY="your-cnj-datajud-key"
```

Without this variable the API returns a service-unavailable response for DataJud import routes, while the rest of the system continues to work.

For Docker-based local development:

```bash
npm run docker:up
npm run docker:migrate
npm run docker:seed
npm run docker:down
```

## Windows Node/npm Notes

On this machine, plain `npm` may not be available in every PowerShell environment. The installed npm can still be invoked through Node directly:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run typecheck
```

The local Node installation may also be older than the version expected by the current Prisma toolchain. If `npm run prisma:generate` fails locally with an ESM or Node version error, use the Docker runtime:

```powershell
docker run --rm -v "${PWD}:/app" -w /app node:22-alpine npm run prisma:generate
```

The application Docker image uses Node 22, so Docker builds remain the reference runtime when local Windows Node tooling is inconsistent.
