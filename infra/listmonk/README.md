# Railway service definitions

Single Railway project hosts everything. Phase 1 documents the topology only;
actual deploys happen at the start of Phase 2 once the API is fleshed out.

## Services

### 1. Postgres
- Railway-managed Postgres plugin.
- One database, two logical owners: Listmonk and the author API.
- Connection string available as `DATABASE_URL` to the API service.

### 2. Listmonk
- Source: official Docker image, `listmonk/listmonk:latest`.
- Bind to internal port, expose internally only (the API talks to it).
- Volume for uploads (subscriber list imports, attachments).
- Required env: `LISTMONK_db_host`, `LISTMONK_db_port`, `LISTMONK_db_user`,
  `LISTMONK_db_password`, `LISTMONK_db_database`, `LISTMONK_app_admin_username`,
  `LISTMONK_app_admin_password`.
- Lists to create after first boot:
  - `alexi-hart-readers`
  - `alexandra-knight-readers`

### 3. API service
- Source: this repo, `apps/api`.
- Build: `pnpm install --filter @author/api... && pnpm --filter @author/api build`.
- Start: `pnpm --filter @author/api start`.
- Env: see `apps/api/.env.example`.
- Talks to Listmonk over Railway internal networking.

### 4. Cron worker
- Phase 2+. Likely a second Railway service running the same API codebase
  with a different start command (`node dist/cron.js`) plus `RAILWAY_CRON_SCHEDULE`.
- Responsible for monthly newsletter sends and scheduled social posts.

## Networking

- API and cron run private. Only the API exposes a public endpoint, called by
  the desktop app and by the two Astro sites for member auth checks.
- Listmonk admin UI exposed only on demand for Alex.

## Secrets

All secrets configured in Railway dashboard. Nothing in repo. Local dev uses
`.env` files keyed off `.env.example`.

## House rule

No em dashes anywhere in service config, scripts, or docs.
