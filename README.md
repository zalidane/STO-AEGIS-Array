# STO AEGIS Array

Unofficial Star Trek Online catalog, collection tracker, and space loadout builder.

**Live site:** [https://vueui-production.up.railway.app](https://vueui-production.up.railway.app)

Monorepo for wiki extraction, a shared database, GraphQL API, and Vue UI.


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

`VITE_DISCORD_URL` and `VITE_RAILWAY_REFERRAL_CODE` are optional VueUI build-time variables (same `VITE_` inlining as the API URL). Leave the Discord variable unset to keep `https://discord.gg/2jTgb9HnY`. Leave the referral code unset to hide the footer "Hosted on Railway" link. When the code is set, that link is `https://railway.com?referralCode=<code>`. On Railway, set both on the **VueUI** service. See [`.env.example`](.env.example).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:extractor` | `tsx watch` re-runs `Extractor/src/main.ts extract` when files change. Same run as `extract`. |
| `npm run dev:graphql` | `tsx watch` on `GraphQL/src/server.ts`. Yoga listens on `0.0.0.0`, port `PORT` or **4000**, path `/graphql`. A browser GET there renders GraphiQL. |
| `npm run dev:vue` | Vite dev server with HMR. Default port **5173**. |
| `npm run extract` | Fetches STOWiki Cargo into `Extractor/output/*.json`. A non-empty table file no older than 24 hours is left in place; a stale, empty, or missing table is replaced in full. New experimental hulls are added to `ShipExperimentalWeapons.json` (that step logs into the wiki even when every Cargo file is fresh). Images already on disk, and titles already marked missing or skipped in `imageIndex.json`, stay put; other catalog images are downloaded to `VueUI/public/images/{items,ships,traits,starship-traits,tray-skills}/`. Rewrites `imageIndex.json`, stamps image filenames into `Infobox.json` and `TraySkill.json`, and writes gitignored `output/last-extract.json`. |
| `npm run extract:force` | `extract --force-refresh`. Every Cargo table is fetched again. The experimental-weapon file and images stay incremental. |
| `npm run extract:images` | `extract --images-only`. Reads Cargo JSON already in `Extractor/output/` and runs the image download, `imageIndex.json` rewrite, and Infobox/TraySkill stamp. Also writes `last-extract.json`. |
| `npm run images:sync` | Uploads those image folders to Cloudflare R2. Credentials are `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` from the environment or the root `.env` (`R2_REGION` optional). Extra arguments are forwarded: `--dry-run` prints the plan, `--delete` removes remote keys under those prefixes that are absent on disk. |
| `npm run extract:home` | Home-machine gate. Reads `Extractor/output/last-extract.json`, or the newest Cargo JSON mtime when that file is missing. When the last extract is absent or older than 30 days, runs `extract --force-refresh` (images and the experimental-weapon sidecar stay incremental) and stamps `last-extract.json` with source `home-extract`. A newer stamp exits with no wiki call. `--force` runs the extract anyway. `--check-only` (alias `--dry-run`) never calls the wiki. |
| `npm run import` | Loads the root `.env` with override and imports `Extractor/output/*.json` into that `DATABASE_URL`. A table whose hash matches `output/importState.json` is left unchanged. The hash includes the CatalogSupplement fingerprint, so a supplement edit is imported on the next run. Relations are re-linked when a table was imported or `ShipExperimentalWeapons.json` changed. |
| `npm run import:force` | Same import with `--force-import`: every mapped table is written again, then relations are re-linked. |
| `npm run import:prod` | `--prod --force-import`. Sets `PRISMA_ENV=production`, loads the root `.env.production` over the environment when that file exists, and force-imports into that database. |
| `npm run db:generate` | `prisma generate` from `packages/database/prisma/schema.prisma` into `packages/database/src/generated/prisma`. With `DATABASE_URL` unset, generate still runs against a dummy localhost URL. |
| `npm run db:migrate` | `prisma migrate deploy` using `.env`. Applies pending migrations. |
| `npm run db:migrate:dev` | `prisma migrate dev`. Creates a migration and applies it to the development database. |
| `npm run db:migrate:prod` | Sets `PRISMA_ENV=production` (and `NODE_ENV` when it is unset), then `prisma migrate deploy`. Prisma reads `.env.production` when that file exists. |
| `npm run db:studio` | Prisma Studio against `.env`. |
| `npm run db:studio:prod` | Prisma Studio with `PRISMA_ENV=production` (`.env.production` when present). |
| `npm run codegen` | GraphQL Codegen client preset. Schema is `GraphQL/src/schema/**/*.graphql`, documents are `VueUI/src/graphql/**/*.graphql`, output is `VueUI/src/graphql/generated/`. |
| `npm run build` | Runs `db:generate`, then `build` in each workspace that defines it (database, Extractor, GraphQL, VueUI). |
| `npm run build:database` / `build:extractor` / `build:graphql` | `tsc` into that package’s `dist/`. `npm run start` and the database package exports still run TypeScript from `src/`. `start:extractor` is the command that executes compiled JavaScript. |
| `npm run build:vue` | `vue-tsc --build` and `vite build` in parallel. Vite writes `VueUI/dist`. The script fails if either command fails. |
| `npm run type-check` | `type-check` in each workspace that defines it. |
| `npm run type-check:database` / `type-check:extractor` / `type-check:graphql` | `tsc --noEmit`. |
| `npm run type-check:vue` | `vue-tsc --build` using VueUI’s TypeScript 6 install. Type-check only. |
| `npm run test` | GraphQL `node:test`, then Extractor `node:test`, then Vue Vitest. Stops at the first failure. The database package has no test script on this command. |
| `npm run test:graphql` | `tsx --test` on `GraphQL/src/logic/**/*.test.ts`. |
| `npm run test:extractor` | `tsx --test` on `Extractor/src/**/*.test.ts`. |
| `npm run test:unit` | VueUI Vitest in jsdom (`src/**/__tests__`, `e2e/**` excluded). Watches when stdin is a TTY and `CI` is unset; otherwise one run. |
| `npm run start` | GraphQL server once: `tsx src/server.ts`. Same bind as `dev:graphql`. File watching stays on `dev:graphql`; migrations stay on `db:migrate`. |
| `npm run start:extractor` | `node dist/main.js` in Extractor, which defaults to the `extract` command. Run `build:extractor` first so `dist/main.js` exists. |
| `npm run start:vue` / `preview:vue` | Both run `vite preview` of `VueUI/dist`. Binds all interfaces; port is `PORT` or **4173**. |

`extract` and `import` at the repo root do not forward extra arguments, so `npm run extract -- --skip-images` never reaches the CLI. `extract:home` and `images:sync` do forward them. Pass other flags on the workspace script, or use the root script that already includes them:

```bash
npm run extract:force          # --force-refresh (Cargo only)
npm run extract:images         # --images-only
npm run extract -w @sto-aegis/extractor -- --skip-images
npm run extract -w @sto-aegis/extractor -- --force-images
npm run extract:home -- --force
npm run extract:home -- --check-only
npm run import:force           # --force-import
npm run import -w @sto-aegis/extractor -- --force-import
npm run import:prod            # .env.production + --force-import
npm run images:sync -- --dry-run
npm run images:sync -- --delete
```

`npm run extract -w @sto-aegis/extractor -- --prod` only chooses `.env.production` for env loading. The wiki fetch ignores it, and the script says so.

Schedule `npm run extract:home` weekly on a home machine (cron / Task Scheduler / systemd / launchd). The script itself enforces the 30-day gate, re-fetches every Cargo table when an extract is due, keeps images incremental, and reminds you to commit JSON, sync images (`npm run images:sync`), then `import:prod`. Details: [Extractor/README.md](Extractor/README.md#monthly-home-extract-scheduled-check) and [docs/image-hosting.md](docs/image-hosting.md). Production must only import committed JSON — never extract on Railway.

After changing `GraphQL/src/schema/**/*.graphql` or `VueUI/src/graphql/**/*.graphql`, run `npm run codegen` so the Vue client types stay in sync.

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
5. Variables (available at **build** time on the **VueUI** service; Vite inlines them, so a change applies on the next VueUI deploy):
   - `VITE_GRAPHQL_URL` = `https://${{GraphQL.RAILWAY_PUBLIC_DOMAIN}}/graphql`
   - `VITE_IMAGE_BASE_URL` = `https://img.aegisarray.com` (optional; leave unset until R2 is verified. Inlined at build time. See [docs/image-hosting.md](docs/image-hosting.md))
   - `VITE_DISCORD_URL` = full Discord invite (optional). Unset keeps `https://discord.gg/2jTgb9HnY`.
   - `VITE_RAILWAY_REFERRAL_CODE` = Railway affiliate code only, not a full URL (optional). Unset or empty hides the footer credit. When set, the footer links "Hosted on Railway" to `https://railway.com?referralCode=<VITE_RAILWAY_REFERRAL_CODE>`.
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
the wiki may lawfully license them. Game images are served at runtime from
separate object storage and are © Cryptic Studios / Arc Games / DECA / Paramount; sourced from STOWiki; not covered by this repo's licenses; unofficial non-commercial fan site; removed on rights-holder request.
Full details: [`ATTRIBUTION.md`](ATTRIBUTION.md). Hosting: [`docs/image-hosting.md`](docs/image-hosting.md). Cloudflare cache and probe rules: [`docs/cloudflare-hardening.md`](docs/cloudflare-hardening.md).
