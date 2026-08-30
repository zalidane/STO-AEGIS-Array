# STO AEGIS Array

Monorepo for Star Trek Online data tooling: wiki extraction, shared database, GraphQL API, and Vue UI.

## Structure

```text
STO-AEGIS-Array/
├── packages/
│   └── database/          # Shared Prisma schema, migrations, client (@sto-aegis/database)
├── Extractor/             # STOWiki Cargo extract + PostgreSQL import
├── GraphQL/               # GraphQL Yoga API (@sto-aegis/graphql)
├── VueUI/                 # Vue 3 + Vuetify catalog, collection, and loadout builder
├── package.json           # npm workspaces root
└── .env                   # DATABASE_URL + STOWiki contact (shared)
```

Requires **Node.js 20+**. VueUI’s Vite toolchain prefers Node 22.18+ or 24.12+.

## Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
```

Copy `.env.example` to `.env` and set `STOWIKI_CONTACT` so extract identifies itself. Bot passwords are optional on STOWiki (Special:BotPasswords is restricted). See [Extractor/README.md](Extractor/README.md).

Commit updated `Extractor/output/*.json` after extracting so production can import without hitting the wiki.

## Local development

Run GraphQL and the Vue app together. GraphQL reads PostgreSQL; the UI talks to GraphQL.

```bash
# terminal 1 — API + GraphiQL
npm run dev:graphql          # http://localhost:4000/graphql

# terminal 2 — Vite with HMR
npm run dev:vue              # http://localhost:5173
```

`npm run start:vue` is `vite preview` (default port **4173**). That serves a **built** `dist/`; run `npm run build:vue` first. Use `dev:vue` while iterating.

Set `VITE_GRAPHQL_URL` only when the API is not at `http://localhost:4000/graphql`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run extract` / `extract:force` | Manual STOWiki extract → `Extractor/output/*.json` + images |
| `npm run extract:images` | Download wiki images only (uses existing Cargo JSON) |
| `npm run import` / `import:force` | Import committed JSON into local DB |
| `npm run import:prod` | Import committed JSON into production DB |
| `npm run db:generate` | Generate Prisma client in `packages/database` |
| `npm run db:migrate` | Apply migrations (deploy) |
| `npm run db:migrate:dev` | Create/apply migrations (Prisma migrate dev) |
| `npm run db:migrate:prod` | Apply migrations (production) |
| `npm run db:studio` / `db:studio:prod` | Open Prisma Studio (local / production) |
| `npm run codegen` | Generate Vue GraphQL client types from schema + operations |
| `npm run build` | Prisma generate + build all workspaces |
| `npm run build:database` / `build:extractor` / `build:graphql` / `build:vue` | Build one package |
| `npm run dev:graphql` / `dev:vue` / `dev:extractor` | Start a package in watch mode |
| `npm run start` | Run GraphQL (`tsx src/server.ts`) |
| `npm run start:vue` | Preview the built Vue app |
| `npm run type-check` | Type-check all workspaces |
| `npm run test` | GraphQL + Extractor + Vue unit tests |
| `npm run test:graphql` / `test:extractor` / `test:unit` | Tests for one package |

Extract/import flags (pass after `--`):

```bash
npm run extract -- --force-refresh
npm run extract -- --skip-images
npm run extract -- --images-only
npm run import -- --force-import
npm run import:prod
```

After changing `GraphQL/src/schema/**/*.graphql` or `VueUI/src/graphql/queries/*.graphql`, run `npm run codegen` so the Vue client types stay in sync.

## Shared database

`@sto-aegis/database` owns:

- `prisma/schema.prisma`
- `prisma/migrations/`
- Generated Prisma Client
- `createPrismaClient()` helper (pg adapter + serialized pool clients)

**Extractor** and **GraphQL** both depend on this package. Do not embed a second Prisma schema in those apps.

## Apps

- **Extractor** — [Extractor/README.md](Extractor/README.md)
- **GraphQL** — [GraphQL/README.md](GraphQL/README.md)
- **VueUI** — [VueUI/README.md](VueUI/README.md)
- **Database** — [packages/database/README.md](packages/database/README.md)

## Railway (shared monorepo)

**Deploy from GitHub creates one service** (named after the repo). Railway will not auto-add GraphQL / VueUI / Extractor as separate services for this workspace layout. You configure services by hand.

`railway.toml` at the repo root defaults that first service to **GraphQL**. Sub-app configs live at `/GraphQL/railway.toml`, `/VueUI/railway.toml`, `/Extractor/railway.toml`.

### Fix the service you already created (GraphQL)

1. Open the `STO-AEGIS-Array` service → **Settings**
2. **Root Directory**: leave empty / `/` (required so workspaces work)
3. **Config as Code**: `/railway.toml` (or `/GraphQL/railway.toml` — same GraphQL deploy)
4. **Variables** → add (after Postgres is in the project):
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
5. **Networking** → Generate domain
6. Redeploy

GraphQL **start** runs `prisma migrate deploy` before the API. **Release** runs migrate again, then `import:force`. Railway does not migrate on its own — if Config as Code is unset, those commands never run.

Rename the service to `GraphQL` if you want.

### Add VueUI

1. Project canvas → **+ Create** → **Empty service** → name it `VueUI`
2. Settings → connect the **same** GitHub repo / branch
3. Root Directory: `/`
4. Config as Code: `/VueUI/railway.toml`
5. Variables (available at **build** time):
   - `VITE_GRAPHQL_URL` = `https://${{GraphQL.RAILWAY_PUBLIC_DOMAIN}}/graphql`
6. Generate domain → Deploy

### Add Extractor import (optional Cron / one-shot)

1. **+ Create** → Empty service (or Cron Job) → name it `Import`
2. Same repo, Root Directory `/`, Config as Code: `/Extractor/railway.toml`
3. Variables: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
4. Deploy (exits after import; restart policy is `NEVER`)

GraphQL’s `releaseCommand` already runs `import:force`, so a separate Import service is optional.

### Postgres

Add Railway Postgres to the project if it is not already there, then reference its `DATABASE_URL` as above. Use the **private** URL between services when possible.

## License

Original project source code is MIT — see [`LICENSE`](LICENSE).

Wiki-derived text and Cargo data are used under STOWiki’s
[CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) terms where
the wiki may lawfully license them. Game images under `VueUI/public/images/` are
Cryptic / DECA / Paramount assets obtained via STOWiki and are **not** MIT.
Full details: [`ATTRIBUTION.md`](ATTRIBUTION.md).
