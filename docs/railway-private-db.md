# Railway database and deploy-time import

**Status (Nov 22, 2026): done.** Production Postgres is the `Postgres` service
inside the **STO-AEGIS-Array** Railway project. It has no public TCP proxy.
GraphQL reaches it over Railway's private network, and the committed
`Extractor/output/*.json` is imported by GraphQL's pre-deploy command. The home
PC only extracts, commits, and pushes.

The old database (project `desirable-fascination`) was copied with
`pg_dump`/`pg_restore`, checked (builds, featured builds, and fills matched),
and its Postgres service was removed. The empty project shell can be deleted.

## Current Railway setup

Project **STO-AEGIS-Array**, environment `production`, region `sfo`:

| Service | Source | Notes |
| --- | --- | --- |
| `Postgres` | `ghcr.io/railwayapp-templates/postgres-ssl:18` | Volume at `/var/lib/postgresql/data`. Private host `postgres.railway.internal`. No TCP proxy, no domain. |
| `GraphQL` | this repo, `main` | Public domain `sto-aegis-array-production.up.railway.app` (port 8080). |
| `VueUI` | this repo, `main` | `aegisarray.com`, `www.aegisarray.com`, plus `vueui-production.up.railway.app`. |

GraphQL settings (Railway dashboard; there is no config-as-code file):

| Setting | Value |
| --- | --- |
| Root directory | `/` |
| Build command | `npm install && npm run generate -w @sto-aegis/database` |
| Watch paths | `/GraphQL/**`, `/packages/database/**`, `/Extractor/**`, `/package.json`, `/package-lock.json` |
| Pre-deploy command | `npm run railway:predeploy` |
| Pre-deploy timeout | `900` seconds |
| Start command | `npm run migrate:deploy -w @sto-aegis/database && npm run start -w @sto-aegis/graphql` |
| Healthcheck | `/graphql`, timeout 300 s |
| Variable `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (private URL) |

The start command still runs `migrate:deploy` a second time. That is harmless
(it reports "No pending migrations"). It can be shortened to
`npm run start -w @sto-aegis/graphql` now that pre-deploy migrates.

## What happens on a deploy

`npm run railway:predeploy` runs in a separate container built from the GraphQL
image, inside the private network:

1. `db:wait` – `packages/database/scripts/waitForDb.cjs` retries `SELECT 1`
   (15 × 2 s; `DB_WAIT_ATTEMPTS` / `DB_WAIT_INTERVAL_MS` override). It logs the
   host only, never the URL.
2. `db:migrate` – `prisma migrate deploy`.
3. `import:deploy` – `tsx src/main.ts import --deploy` in `Extractor/`:
   - uses only the platform `DATABASE_URL` (no `.env` files);
   - stores per-table hashes in the `ImportState` table, because the
     pre-deploy container's filesystem is discarded after each run;
   - skips tables whose JSON and `CatalogSupplement` rows are unchanged;
   - records hashes only after `linkRelations` succeeds, so a failed relink is
     retried next deploy;
   - exits non-zero if any table fails. Railway then stops the deploy and the
     previous GraphQL version keeps serving.

GraphQL's watch paths include `/Extractor/**`, so pushing new JSON redeploys
GraphQL and imports it before the new version goes live. A full import of the
current data takes about 10 s; a deploy with unchanged JSON about 2 s.

### Reading the pre-deploy log

- Lines Railway shows in red as `error` are often just stderr: npm's
  `--omit=dev` config warning and Prisma's "update available" notice. They are
  harmless. A real failure ends with `Import failed for: …` or a non-zero exit.
- `StarshipTraits: JSON has 386 rows but database has 384` and
  `SetBonus: JSON has 7 rows but database has 6` are expected. Some rows share
  a name and collapse into one database row on upsert. This predates the move.
- Healthy steady state:
  `Import summary: 0 imported, 11 unchanged, 0 failed`.

## Day-to-day workflow

1. Home PC: `npm run extract:home` (or `extract`), review, commit
   `Extractor/output/*.json`, sync images (`npm run images:sync`; never
   `--delete`), push.
2. Railway rebuilds GraphQL and imports the changed tables. If the import
   fails, fix the JSON and push again.
3. Database-only `CatalogSupplement` edits are picked up on the next GraphQL
   deploy (their fingerprint is part of the table hash). Use **Redeploy** if
   nothing else changed.

## Reaching production from the PC

`npm run import:prod`, `npm run db:migrate:prod`, and `npm run db:studio:prod`
read the repo-root `.env.production`. With no TCP proxy they cannot reach the
database, which is intended. For a one-off job:

1. Postgres → Settings → **Networking** → add a **TCP proxy** (port 5432).
2. Put the new `DATABASE_PUBLIC_URL` into `.env.production` as `DATABASE_URL`
   (never commit it; it contains the password).
3. Run the command.
4. Delete the TCP proxy again.

`import:prod` keeps its hashes in the local `output/importState.json`, not in
`ImportState`, and always forces a full import. The next deploy may then
re-import tables once; that is idempotent.

## Backups and restore

A logical dump from the PC needs the TCP proxy on for the duration (see
above). Use Postgres 18 client tools, or Docker:

```sh
pg_dump --format=custom --no-owner --no-acl --dbname "<PUBLIC_URL>" --file sto.dump
# no local v18 tools:
docker run --rm -v "${PWD}:/work" -w /work postgres:18 pg_dump --format=custom --no-owner --no-acl --dbname "<PUBLIC_URL>" --file sto.dump
```

`<PUBLIC_URL>` is Postgres → Variables → `DATABASE_PUBLIC_URL` while the proxy
exists. Do not paste it anywhere public, and delete dumps you no longer need;
they hold the whole database, including saved builds.

### Restoring into a database

A database that GraphQL has already deployed against already has every table
(pre-deploy ran the migrations and the catalog import). A plain `pg_restore`
into it skips or fails on those tables. Either:

- restore **before** pointing GraphQL at the new database, or
- replace what is there:

```sh
pg_restore --clean --if-exists --no-owner --no-acl --dbname "<PUBLIC_URL>" sto.dump
```

Catalog tables are rebuilt from the committed JSON on every deploy, so the
tables that matter in a restore are the user data: `Build`, `BuildFeatured`,
`BuildFill`, plus `CatalogSupplement`. Compare counts after a restore:

```sql
SELECT (SELECT count(*) FROM "Build") AS builds,
       (SELECT count(*) FROM "BuildFeatured") AS featured,
       (SELECT count(*) FROM "BuildFill") AS fills,
       (SELECT count(*) FROM "CatalogSupplement") AS supplements;
```

Ship and trait counts can legitimately differ between an old and a freshly
imported database: upserts never delete, so an older database keeps rows that
were renamed or removed on the wiki.

After any restore, clear `ImportState` (`DELETE FROM "ImportState";`)
or redeploy with a changed JSON so the next pre-deploy re-imports everything.

## Rollback / disaster recovery

The old database no longer exists. To recover:

1. Create a fresh Postgres in the project (Database → PostgreSQL), name it
   `Postgres` (or update the reference in GraphQL's `DATABASE_URL`).
2. Temporarily add a TCP proxy and `pg_restore` the latest dump into it
   **before** GraphQL deploys against it (or use `--clean --if-exists`).
3. Redeploy GraphQL. Pre-deploy migrates and imports the catalog.
4. Remove the TCP proxy.

To stop importing on deploy, clear GraphQL's pre-deploy command. Nothing in the
code requires it; local and `import:prod` imports still work.

## Optional: separate import service

Not used. If imports ever get slow enough to hold up GraphQL deploys, add a
service from the same repo (root `/`, same build command), start command
`npm run db:wait && npm run db:migrate && npm run import:deploy`, restart
policy **Never**, watch paths `/Extractor/output/**`, and `DATABASE_URL` =
`${{Postgres.DATABASE_URL}}`. Then clear GraphQL's pre-deploy command.
