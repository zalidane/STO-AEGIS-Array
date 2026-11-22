# STO AEGIS Array

Unofficial Star Trek Online catalog, collection tracker, and space loadout builder.

**Live site:** [https://aegisarray.com](https://aegisarray.com)

Monorepo for wiki extraction, a shared database, GraphQL API, and Vue UI.


## Structure

```text
STO-AEGIS-Array/
├── packages/
│   └── database/          # Shared Prisma schema, migrations, client (@sto-aegis/database)
├── Extractor/             # STOWiki Cargo extract + PostgreSQL import
├── GraphQL/               # GraphQL Yoga API (@sto-aegis/graphql)
├── VueUI/                 # Vue 3 + Vuetify catalog, collection, and loadout builder
├── docs/                  # Railway database, image hosting, Cloudflare runbooks
├── package.json           # npm workspaces root
└── .env                   # DATABASE_URL, STOWiki contact, R2 sync keys (local, gitignored)
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

Commit updated `Extractor/output/*.json` after extracting. Production never contacts the wiki: each GraphQL deploy on Railway imports the committed JSON (see [Railway](#railway-shared-monorepo)).

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

`VITE_DISCORD_URL` and `VITE_RAILWAY_REFERRAL_CODE` are optional VueUI build-time variables (same `VITE_` inlining as the API URL). Leave the Discord variable unset to keep `https://discord.gg/2jTgb9HnY`. Leave the referral code unset to hide the footer "Hosted on Railway" link. When the code is set, that link is `https://railway.com?referralCode=<code>`. On Railway, set both on the **VueUI** service. See [`.env.example`](.env.example).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run extract` / `extract:force` | Manual STOWiki extract → `Extractor/output/*.json` + images |
| `npm run extract:home` | Home-only monthly check: extract if last run was > ~1 month ago |
| `npm run extract:images` | Download new wiki images only (uses existing Cargo JSON; skips files already on R2) |
| `npm run extract:images:plan` | Print which images would be fetched; no wiki requests, no writes |
| `npm run extract:images:browser-script` | Write `Extractor/output/browser-download.js`, a DevTools downloader for the planned images |
| `npm run extract:images:offline` | Rebuild `imageIndex.json` and stamp filenames from files on disk, no wiki requests |
| `npm run images:import-downloads -- --from=<dir>` | Move browser "Save to Downloads" files into `VueUI/public/images/` |
| `npm run images:sync` | Upload new/changed local images to Cloudflare R2 (`--dry-run`). Never pass `--delete` from a sparse local tree |
| `npm run import` / `import:force` | Import committed JSON into local DB |
| `npm run import:prod` | Import committed JSON into production from the PC (needs a temporary TCP proxy; see [docs/railway-private-db.md](docs/railway-private-db.md)) |
| `npm run import:deploy` | Railway pre-deploy import (platform `DATABASE_URL`, hashes in `ImportState`) |
| `npm run railway:predeploy` | `db:wait` + `db:migrate` + `import:deploy` (GraphQL pre-deploy command) |
| `npm run db:generate` | Generate Prisma client in `packages/database` |
| `npm run db:wait` | Retry until `DATABASE_URL` accepts connections |
| `npm run db:migrate` | Apply migrations (deploy) |
| `npm run db:migrate:dev` | Create/apply migrations (Prisma migrate dev) |
| `npm run db:migrate:prod` | Apply migrations to production from the PC (needs a temporary TCP proxy) |
| `npm run db:studio` / `db:studio:prod` | Open Prisma Studio (local / production; production needs a temporary TCP proxy) |
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
npm run extract:images -- --no-remote-check        # disk-only skip check
npm run extract:images:plan -- --image-base-url=https://img.aegisarray.com
npm run extract:home -- --force
npm run extract:home -- --check-only
npm run import -- --force-import
npm run images:import-downloads -- --from="%USERPROFILE%\Downloads" --dry-run
```

STOWiki's Cloudflare check often blocks Node requests, even from a home IP. When `extract:images` is blocked, use the browser downloader (`extract:images:browser-script`, then `extract:images:offline`). Steps: [Extractor/README.md](Extractor/README.md#downloading-images-through-the-browser-when-cloudflare-blocks-node).

Schedule `npm run extract:home` weekly on a home machine (cron / Task Scheduler / systemd / launchd). The script itself enforces the ~1-month gate, refreshes stale Cargo when due, keeps images incremental, and reminds you to commit JSON, sync images (`npm run images:sync`), and push; the GraphQL deploy imports the JSON. Details: [Extractor/README.md](Extractor/README.md#monthly-home-extract-scheduled-check) and [docs/image-hosting.md](docs/image-hosting.md). Production must only import committed JSON — never extract on Railway.

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

Project **STO-AEGIS-Array** (region `sfo`) has three services: `GraphQL`, `VueUI`, and `Postgres`. All settings live in the Railway dashboard; there is no `railway.toml`. Both app services deploy from this repo's `main` branch with Root Directory `/` (required for npm workspaces) and the Railpack builder.

### GraphQL

- **Build command:** `npm install && npm run generate -w @sto-aegis/database`
- **Watch paths:** `/GraphQL/**`, `/packages/database/**`, `/Extractor/**`, `/package.json`, `/package-lock.json`
- **Pre-deploy command:** `npm run railway:predeploy` (timeout `900` s). Waits for the database, runs `prisma migrate deploy`, then imports changed committed JSON over the private network. A failed import stops the deploy.
- **Start command:** `npm run migrate:deploy -w @sto-aegis/database && npm run start -w @sto-aegis/graphql` (the migrate step is now redundant with pre-deploy and can be dropped)
- **Healthcheck:** `/graphql`
- **Variables:** `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`, `STOWIKI_CONTACT`
- **Domain:** `sto-aegis-array-production.up.railway.app`

How the deploy-time import works, log lines to ignore, PC access, backups, and restore: [docs/railway-private-db.md](docs/railway-private-db.md).

### VueUI

- **Build command:** `npm install && npm run build-only -w @sto-aegis/vue-ui`
- **Start command:** `npm run start -w @sto-aegis/vue-ui` (`vite preview` with the static-host policy plugin)
- **Watch paths:** `/VueUI/**`, `/package.json`, `/package-lock.json`
- **Domains:** `aegisarray.com`, `www.aegisarray.com` (through Cloudflare), plus `vueui-production.up.railway.app`
- **Variables** (inlined at **build** time; a change applies on the next VueUI deploy):
  - `VITE_GRAPHQL_URL` = `https://${{GraphQL.RAILWAY_PUBLIC_DOMAIN}}/graphql`
  - `VITE_IMAGE_BASE_URL` = `https://img.aegisarray.com` (see [docs/image-hosting.md](docs/image-hosting.md))
  - `VITE_DISCORD_URL` = full Discord invite (optional). Unset keeps `https://discord.gg/2jTgb9HnY`.
  - `VITE_RAILWAY_REFERRAL_CODE` = Railway affiliate code only, not a full URL (optional). Unset or empty hides the footer credit. When set, the footer links "Hosted on Railway" to `https://railway.com?referralCode=<VITE_RAILWAY_REFERRAL_CODE>`.

Cloudflare cache and WAF rules for the site: [docs/cloudflare-hardening.md](docs/cloudflare-hardening.md).

### Postgres

Railway's Postgres 18 template, in the same project, reachable only on the private network (`postgres.railway.internal`); it has no TCP proxy. Saved builds live here; catalog tables are rebuilt from the committed JSON on each GraphQL deploy. Production was moved here from a separate project on Nov 22, 2026.

## License

Original project source code is MIT — see [`LICENSE`](LICENSE).

Wiki-derived text and Cargo data are used under STOWiki’s
[CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) terms where
the wiki may lawfully license them. Game images are served at runtime from
separate object storage and are © Cryptic Studios / Arc Games / DECA / Paramount; sourced from STOWiki; not covered by this repo's licenses; unofficial non-commercial fan site; removed on rights-holder request.
Full details: [`ATTRIBUTION.md`](ATTRIBUTION.md). Hosting: [`docs/image-hosting.md`](docs/image-hosting.md). Cloudflare cache and probe rules: [`docs/cloudflare-hardening.md`](docs/cloudflare-hardening.md).
