# STO AEGIS Array

Monorepo for Star Trek Online data tooling: wiki extraction, shared database, GraphQL API, and Vue UI.

## Structure

```text
STO-AEGIS-Array/
├── packages/
│   └── database/          # Shared Prisma schema, migrations, client (@sto-aegis/database)
├── Extractor/             # STOWiki Cargo extract + PostgreSQL import
├── GraphQL/               # GraphQL backend (planned)
├── VueUI/                 # Vue frontend (planned)
├── package.json           # npm workspaces root
└── .env                   # DATABASE_URL (shared)
```

## Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
```

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
| `npm run db:studio` | Open Prisma Studio |
| `npm run codegen` | Generate Vue GraphQL client types |
| `npm run build` | Prisma generate + build all workspaces |
| `npm run build:database` / `build:extractor` / `build:graphql` / `build:vue` | Build one package |
| `npm run dev:graphql` / `dev:vue` / `dev:extractor` | Start a package in watch mode |
| `npm run type-check` | Type-check all workspaces |
| `npm run test:unit` | Run Vue UI unit tests |

Extract/import flags (pass after `--`):

```bash
npm run extract -- --force-refresh
npm run extract -- --skip-images
npm run extract -- --images-only
npm run import -- --force-import
npm run import:prod
```

Copy `.env.example` to `.env` and set `STOWIKI_CONTACT` so extract identifies itself. Bot passwords are optional on STOWiki (Special:BotPasswords is restricted). See [Extractor/README.md](Extractor/README.md).

Commit updated `Extractor/output/*.json` after extracting so production can import without hitting the wiki.

## Shared database

`@sto-aegis/database` owns:

- `prisma/schema.prisma`
- `prisma/migrations/`
- Generated Prisma Client
- `createPrismaClient()` helper (pg adapter + serialized pool clients)

Both **Extractor** and future **GraphQL** should depend on this package instead of embedding their own Prisma schema.

## Apps

- **Extractor** — see [Extractor/README.md](Extractor/README.md)
- **GraphQL** — placeholder; see [GraphQL/README.md](GraphQL/README.md)
- **VueUI** — placeholder; see [VueUI/README.md](VueUI/README.md)

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

### Postgres

Add Railway Postgres to the project if it is not already there, then reference its `DATABASE_URL` as above. Use the **private** URL between services when possible.

## License

Original project source code is MIT — see [`LICENSE`](LICENSE).

Wiki-derived text and Cargo data are used under STOWiki’s
[CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) terms where
the wiki may lawfully license them. Game images under `VueUI/public/images/` are
Cryptic / DECA / Paramount assets obtained via STOWiki and are **not** MIT.
Full details: [`ATTRIBUTION.md`](ATTRIBUTION.md).
