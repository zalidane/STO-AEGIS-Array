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

All commands run from the repo root. Each one delegates to a workspace script (`-w @sto-aegis/...`).

### Develop and run

| Command | What it runs |
|---------|--------------|
| `npm run dev:graphql` | `tsx watch` on `GraphQL/src/server.ts`. Yoga listens on `0.0.0.0`, port `PORT` or **4000**, path `/graphql`; a browser GET there renders GraphiQL. |
| `npm run dev:vue` | Vite dev server with HMR, port **5173**. |
| `npm run dev:extractor` | `tsx watch src/main.ts extract`: re-runs a full extract whenever Extractor files change. Rarely what you want. |
| `npm run start` | GraphQL once with `tsx src/server.ts` (same bind as `dev:graphql`). Does not migrate; Railway migrates in pre-deploy. |
| `npm run start:vue` / `preview:vue` | `vite preview` of the built `VueUI/dist` (run `build:vue` first). Binds all interfaces; port `PORT` or **4173**. Railway's VueUI start command is the same. |
| `npm run start:extractor` | `node dist/main.js` (defaults to `extract`). Needs `build:extractor` first. |

### Wiki extract (home PC only)

| Command | What it runs |
|---------|--------------|
| `npm run extract` | Cargo tables → `Extractor/output/*.json`. A table file newer than 24 h is kept; a stale, empty, or missing one is re-fetched in full. Adds new experimental hulls to `ShipExperimentalWeapons.json`. Then the incremental image step (below). Writes gitignored `output/last-extract.json`. |
| `npm run extract:force` | `extract --force-refresh`: every Cargo table again. Experimental weapons and images stay incremental. |
| `npm run extract:home` | Home gate: runs `extract --force-refresh` only when the last extract (`last-extract.json`, else newest Cargo JSON mtime) is missing or older than 30 days. `--force` runs anyway; `--check-only` (alias `--dry-run`) never contacts the wiki. |
| `npm run extract:images` | `extract --images-only`: reads the committed Cargo JSON and downloads only images that are not on disk **and** not already on R2 (bucket listing with the R2 keys, or HEAD checks against `VITE_IMAGE_BASE_URL`/`IMAGE_BASE_URL`). Titles already recorded missing/skipped are not retried. Rewrites `imageIndex.json` and stamps filenames into `Infobox.json` and `TraySkill.json`. |
| `npm run extract:images:plan` | `--images-only --plan`: prints what would be fetched. No wiki requests, no writes. |
| `npm run extract:images:browser-script` | Writes the plan as `Extractor/output/browser-download.js` (gitignored), a DevTools downloader to paste into a stowiki.net tab. The practical path, since STOWiki's Cloudflare check usually blocks Node. |
| `npm run extract:images:offline` | `--images-only --no-fetch`: never contacts the wiki. Records files now on disk as present, browser-reported 404s as missing, the rest as failed (retried later), and re-stamps the JSON. |
| `npm run images:import-downloads -- --from=<dir>` | Copies browser "Save to Downloads" files (`<kind>__<filename>`) into `VueUI/public/images/<kind>/` and removes them from `<dir>`. `--dry-run` previews. |
| `npm run images:sync` | Uploads new or changed local images to Cloudflare R2 (keys from the environment or root `.env`). `--dry-run` prints the plan. **Never pass `--delete`**: it removes R2 objects missing locally, and the home tree is nearly empty. |

### Import and database

| Command | What it runs |
|---------|--------------|
| `npm run import` | Loads root `.env` (overriding the environment) and imports `Extractor/output/*.json` into that database. Tables whose hash matches `Extractor/output/importState.json` are skipped; the hash includes the table's `CatalogSupplement` rows, so a supplement edit re-imports. Relations are re-linked when anything was imported. |
| `npm run import:force` | Same with `--force-import`: every table, then relations. |
| `npm run import:deploy` | What Railway runs: `import --deploy`. Uses only the platform `DATABASE_URL` (no `.env`), keeps hashes in the `ImportState` table, exits non-zero if any table fails. |
| `npm run import:prod` | `--prod --force-import` from the PC: loads root `.env.production` and force-imports. Production has no public TCP proxy, so this only works while one is temporarily on ([docs/railway-private-db.md](docs/railway-private-db.md#reaching-production-from-the-pc)). Normally unnecessary: push and let the deploy import. |
| `npm run railway:predeploy` | GraphQL's Railway pre-deploy command: `db:wait`, then `db:migrate`, then `import:deploy`. |
| `npm run db:wait` | Retries `SELECT 1` on `DATABASE_URL` (15 × 2 s by default) and logs only the host. |
| `npm run db:generate` | `prisma generate` into `packages/database/src/generated/prisma` (gitignored). Works without a `DATABASE_URL`. |
| `npm run db:migrate` | `prisma migrate deploy` (pending migrations only). |
| `npm run db:migrate:dev` | `prisma migrate dev`: create and apply a migration on the development database. |
| `npm run db:migrate:prod` / `db:studio:prod` | Same as `db:migrate` / `db:studio` with `PRISMA_ENV=production`, reading `.env.production`. Need the temporary TCP proxy too. |
| `npm run db:studio` | Prisma Studio against `.env`. |

### Build, check, test

| Command | What it runs |
|---------|--------------|
| `npm run codegen` | GraphQL Codegen client preset: schema `GraphQL/src/schema/**/*.graphql`, documents `VueUI/src/graphql/**/*.graphql`, output `VueUI/src/graphql/generated/`. No server needed. |
| `npm run build` | `db:generate`, then `build` in every workspace that has one. |
| `npm run build:database` / `build:extractor` / `build:graphql` | `tsc` into that package's `dist/`. Production still runs TypeScript from `src/` with `tsx`. |
| `npm run build:vue` | `vue-tsc --build` and `vite build` in parallel into `VueUI/dist`; fails if either fails. Railway's VueUI build uses `build-only` (Vite only). |
| `npm run type-check` | `type-check` in every workspace; `type-check:database` / `:extractor` / `:graphql` (`tsc --noEmit`) and `type-check:vue` (`vue-tsc`) run one. |
| `npm run test` | GraphQL `node:test`, then Extractor `node:test`, then Vue Vitest; stops at the first failure. |
| `npm run test:graphql` / `test:extractor` / `test:unit` | One package. `test:unit` is Vitest in jsdom and watches when run in a TTY outside CI. |

### Passing flags

`extract`, `extract:force`, `extract:images`, `import`, `import:force`, `import:prod`, and `import:deploy` at the root **do not forward** extra arguments: `npm run extract -- --skip-images` never reaches the CLI (npm reads the flag itself). `extract:home`, `extract:images:plan`, `extract:images:browser-script`, `extract:images:offline`, `images:import-downloads`, and `images:sync` do forward. For other flags, call the workspace script directly:

```bash
npm run extract -w @sto-aegis/extractor -- --skip-images
npm run extract -w @sto-aegis/extractor -- --images-only --force-images
npm run extract:images -w @sto-aegis/extractor -- --no-remote-check   # disk-only skip check
npm run import -w @sto-aegis/extractor -- --force-import              # same as import:force
npm run import -w @sto-aegis/extractor -- --state=db                  # use ImportState locally
npm run extract:images:plan -- --image-base-url=https://img.aegisarray.com
npm run extract:home -- --force
npm run extract:home -- --check-only
npm run images:import-downloads -- --from="%USERPROFILE%\Downloads" --dry-run
npm run images:sync -- --dry-run
```

`--prod` on `extract` only changes which `.env` file is loaded; the wiki fetch ignores it. Full flag list: [Extractor/README.md](Extractor/README.md#cli).

STOWiki's Cloudflare check often blocks Node requests, even from a home IP. When `extract:images` is blocked, use the browser downloader (`extract:images:browser-script`, then `extract:images:offline`). Steps: [Extractor/README.md](Extractor/README.md#downloading-images-through-the-browser-when-cloudflare-blocks-node).

Schedule `npm run extract:home` weekly on a home machine (cron / Task Scheduler / systemd / launchd). The script enforces the 30-day gate, re-fetches every Cargo table when due, keeps images incremental, and reminds you to commit JSON, sync images (`npm run images:sync`), and push; the GraphQL deploy imports the JSON. Details: [Extractor/README.md](Extractor/README.md#monthly-home-extract-scheduled-check) and [docs/image-hosting.md](docs/image-hosting.md). Production only imports committed JSON — never extract on Railway.

After changing `GraphQL/src/schema/**/*.graphql` or anything under `VueUI/src/graphql/**/*.graphql`, run `npm run codegen` so the Vue client types stay in sync.

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

Project **STO-AEGIS-Array** (region `sfo`) has three services: `GraphQL`, `VueUI`, and `Postgres`. All settings live in each service's **Settings** in the Railway dashboard; there is no `railway.toml` (the files were removed because Railway stops reading Config as Code for existing services on Dec 1, 2026). Both app services deploy from this repo's `main` branch with Root Directory `/` (required for npm workspaces) and the Railpack builder.

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
