# Private Postgres on Railway (import runs inside Railway)

Goal: move Postgres into the **STO-AEGIS-Array** Railway project, turn its
public TCP proxy off, and let Railway import the committed
`Extractor/output/*.json` itself. The home PC only extracts, commits, and pushes.

## How it works

The GraphQL service gets a **pre-deploy command**:

```sh
npm run railway:predeploy
```

which runs, inside Railway's private network and from the GraphQL build image:

1. `db:wait` – `packages/database/scripts/waitForDb.cjs` retries `SELECT 1`
   (15 × 2 s by default) so a slow private-DNS start does not fail the deploy.
   It logs the host only, never the URL.
2. `db:migrate` – `prisma migrate deploy`.
3. `import:deploy` – `tsx src/main.ts import --deploy` in `Extractor/`:
   - uses only the platform `DATABASE_URL` (never loads a `.env` file);
   - keeps per-table hashes in the `ImportState` table instead of
     `output/importState.json`, because the pre-deploy container's filesystem
     is thrown away after each run;
   - skips tables whose JSON (and CatalogSupplement rows) are unchanged;
   - records hashes only after relationships link, so a failed relink is
     retried next deploy;
   - exits non-zero if any table fails, so Railway stops the deploy and the
     previous GraphQL version keeps serving.

GraphQL's watch paths already include `/Extractor/**`, so pushing new JSON
redeploys GraphQL, which runs the import before the new version goes live.

Timing: a full import of the current data (about 7,400 rows) took ~10 s against
a local database; expect well under a few minutes over the private network. A
deploy with unchanged JSON takes ~2 s. The first deploy after this change does
one full import because `ImportState` starts empty (upserts and identity
replaces are idempotent, so that is safe).

Local commands are unchanged: `npm run import`, `import:force`, and
`import:prod` still use `output/importState.json`. Add `--state=db` to share the
database's hashes instead.

## Railway steps (do these yourself, in order)

Nothing in this PR changes Railway settings. Placeholders like `<OLD_PUBLIC_URL>`
are the values you copy from the Railway dashboard; never commit or paste them.

### 1. Create the new database

1. Open the **STO-AEGIS-Array** project → **+ Create** → **Database** →
   **PostgreSQL**. Keep the service name `Postgres` (the reference variable below
   depends on it). Put it in the same region as GraphQL (`sfo`).
2. Leave its TCP proxy on for now; the restore uses it.

### 2. Copy the data (dump and restore)

Pause JSON pushes until step 4 is done.

The old server runs Postgres 18, so use `pg_dump`/`pg_restore` 18 or newer.

From the Railway dashboard copy:

- `<OLD_PUBLIC_URL>` = old project (`desirable-fascination`) → Postgres →
  Variables → `DATABASE_PUBLIC_URL`
- `<NEW_PUBLIC_URL>` = STO-AEGIS-Array → new Postgres → Variables →
  `DATABASE_PUBLIC_URL`

bash / macOS / Linux:

```sh
pg_dump --format=custom --no-owner --no-acl --dbname "<OLD_PUBLIC_URL>" --file sto.dump
pg_restore --no-owner --no-acl --dbname "<NEW_PUBLIC_URL>" sto.dump
```

PowerShell (Windows):

```powershell
pg_dump --format=custom --no-owner --no-acl --dbname "<OLD_PUBLIC_URL>" --file sto.dump
pg_restore --no-owner --no-acl --dbname "<NEW_PUBLIC_URL>" sto.dump
```

No local Postgres 18 tools? Use Docker (works from any OS):

```sh
docker run --rm -v "${PWD}:/work" -w /work postgres:18 pg_dump --format=custom --no-owner --no-acl --dbname "<OLD_PUBLIC_URL>" --file sto.dump
docker run --rm -v "${PWD}:/work" -w /work postgres:18 pg_restore --no-owner --no-acl --dbname "<NEW_PUBLIC_URL>" sto.dump
```

Quick check that the copy matches (run against both URLs and compare):

```sh
psql "<OLD_PUBLIC_URL>" -c 'SELECT (SELECT count(*) FROM "Infobox") infobox, (SELECT count(*) FROM "Ship") ships, (SELECT count(*) FROM "Trait") traits, (SELECT count(*) FROM "_prisma_migrations") migrations;'
```

Delete `sto.dump` when you are done; it holds the whole database.

### 3. Point GraphQL at the private database

STO-AEGIS-Array → **GraphQL** service:

| Where | Setting | Value |
| --- | --- | --- |
| Variables | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (resolves to `postgres.railway.internal:5432`) |
| Settings → Deploy | Pre-deploy command | `npm run railway:predeploy` |
| Settings → Deploy | Pre-deploy timeout | `900` seconds (appears after you type the command) |
| Settings → Deploy | Start command (optional) | `npm run start -w @sto-aegis/graphql` (migrations now run in pre-deploy; the current start command, which migrates again, also still works) |

Leave build command, watch paths, root directory, and healthcheck as they are.
GraphQL also has `RAILPACK_BUILD_CMD` and `RAILPACK_START_CMD` variables; make
sure they do not conflict with the service's build/start settings (or delete
them if they are leftovers).

### 4. Deploy and verify

1. Merge this PR (or press **Deploy** on the staged changes). In the deploy
   logs, the pre-deploy step should show:
   - `waitForDb: postgres.railway.internal:5432 is ready`
   - `Applying migration 20261122040000_add_import_state`
   - `Import summary: 11 imported, 0 unchanged, 0 failed` (first run)
2. The healthcheck on `/graphql` passes and the site loads ships, traits, and
   items.
3. Redeploy GraphQL once more: the pre-deploy log should now say
   `Import summary: 0 imported, 11 unchanged, 0 failed`.

### 5. Close the public door

1. STO-AEGIS-Array → **Postgres** → Settings → **Networking** → delete the
   **TCP proxy**. `DATABASE_PUBLIC_URL` stops working; services keep using the
   private URL.
2. Your PC's `.env.production` points at the old database. After the move,
   `import:prod`, `db:migrate:prod`, and `db:studio:prod` from the PC will not
   reach production; that is intended. For a one-off query or restore, turn the
   TCP proxy back on, do the job, and turn it off again.
3. After a few days of normal operation, take a final dump of the old database
   (step 2's `pg_dump` line) and delete the old project (`desirable-fascination`
   → Settings → Danger → Delete Project).

## Rollback

The old database is untouched until you delete its project.

1. GraphQL → Variables → set `DATABASE_URL` back to the old database's public
   URL (`DATABASE_PUBLIC_URL` from the old project; cross-project references
   are not available, so paste the value in the dashboard).
2. GraphQL → Settings → Deploy → clear the pre-deploy command (or leave it; it
   works against any reachable database).
3. Redeploy GraphQL.

Code rollback is not required: the `ImportState` table is unused by local
imports, and reverting this PR does not need a down-migration.

## Day-to-day after the move

1. Home PC: `npm run extract:home` (or `extract`), review, commit
   `Extractor/output/*.json`, sync images, push.
2. Railway rebuilds GraphQL and imports the changed tables before the new
   version goes live. A failed import stops the deploy and leaves the old
   version serving; fix the JSON and push again.
3. Database-only CatalogSupplement edits are picked up on the next GraphQL
   deploy (their fingerprint is part of the table hash). Trigger one with
   **Redeploy** if nothing else changed.
