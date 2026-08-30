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

Ships store wiki console counts and `t5uConsole`; unique console and experimental weapon FKs (`uniconsoleId`, `experimentalWeaponId`) are filled by Extractor `linkRelations` after import.

Schema: [`prisma/schema.prisma`](prisma/schema.prisma).

## Commands

From the monorepo root:

```bash
npm run db:generate
npm run db:migrate
npm run db:migrate:dev
npm run db:studio
npm run db:migrate:prod
npm run db:studio:prod
```

Or from this package:

```bash
npm run generate
npm run migrate:dev
npm run migrate:deploy
```

`DATABASE_URL` is read from the monorepo root `.env` (or `packages/database/.env`). Production scripts load `.env.production` via `scripts/withProdEnv.cjs`.

Prisma CLI config is [`prisma.config.ts`](prisma.config.ts) (`prisma generate` does not require a live database URL).
