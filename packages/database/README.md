# @sto-aegis/database

Shared Prisma schema, migrations, and client for STO AEGIS Array. Extractor and GraphQL both import this package.

## Usage

```ts
import { createPrismaClient } from "@sto-aegis/database";

const { prisma, pool } = createPrismaClient(process.env.DATABASE_URL);
```

`createPrismaClient()` uses the `pg` adapter with serialized pool clients (avoids concurrent use of one `pg` Client). It loads `DATABASE_URL` from the environment or the monorepo root `.env` (`.env.production` when `NODE_ENV` / `PRISMA_ENV` is `production`). Platform-injected `DATABASE_URL` (Railway) is never overwritten.

## Models

Cargo-backed tables: **Ship**, **Infobox**, **Trait**, **StarshipTrait**, **TraySkill**, **Mastery**, **Reputation**, **Modifier**, **SetBonus**, **GwObtain**, **SwObtain**. Join / lookup: **ShipType**, **StarshipTraitShip**, **ModifierItem**.

App data (never touched by the Extractor's Cargo import): **Build** (published loadout snapshots, keyed by ship name, with a hashed edit token), **BuildFill** (catalog items each build uses, for usage counts), and **BuildFeatured** (build of the day). These are the tables that matter in a backup.

**ImportState** holds the last imported content hash per Cargo table. Railway's pre-deploy import (`import --deploy`) uses it to skip unchanged tables; local imports use `Extractor/output/importState.json` instead.

**CatalogSupplement** is app data, not a Cargo dump. One row is one correction. `kind` names the Cargo table (`Modifiers`, `Reputation`, `SetBonus`, `Traits`). `payload` is the Cargo-shaped record that kind's importer merges. Extractor replace never deletes these rows, so a correction survives the next import without a repository change.

Ships store wiki console counts and `t5uConsole`; unique console and experimental weapon FKs (`uniconsoleId`, `experimentalWeaponId`) are filled by Extractor `linkRelations` after import.

Schema: [`prisma/schema.prisma`](prisma/schema.prisma).

## Commands

From the monorepo root:

```bash
npm run db:generate
npm run db:wait          # retry until DATABASE_URL accepts connections (Railway pre-deploy)
npm run db:migrate
npm run db:migrate:dev
npm run db:studio
npm run db:migrate:prod  # production from the PC; needs a temporary TCP proxy
npm run db:studio:prod   # same
```

Or from this package:

```bash
npm run generate
npm run wait
npm run migrate:dev
npm run migrate:deploy
```

`DATABASE_URL` is read from the environment first, then the monorepo root `.env` (or `packages/database/.env`). The `*:prod` scripts load `.env.production` via `scripts/withProdEnv.cjs`. Production Postgres has no public TCP proxy, so those only work while one is temporarily added; on Railway, migrations run in GraphQL's pre-deploy command. See [docs/railway-private-db.md](../../docs/railway-private-db.md).

Prisma is 7.x (`prisma`, `@prisma/client`, and `@prisma/adapter-pg` ^7.9). The generated client is written to `src/generated/prisma/` (gitignored); run `npm run db:generate` after install or schema changes.

Prisma CLI config is [`prisma.config.ts`](prisma.config.ts) (`prisma generate` does not require a live database URL).
