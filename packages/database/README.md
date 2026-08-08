# @sto-aegis/database

Shared Prisma schema, migrations, and client for STO AEGIS Array apps.

## Usage

```ts
import { createPrismaClient } from "@sto-aegis/database";

const { prisma, pool } = createPrismaClient(process.env.DATABASE_URL);
```

## Commands

Run from monorepo root:

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

Or from this package:

```bash
npm run generate
npm run migrate:dev
npm run migrate:deploy
```

`DATABASE_URL` is read from the monorepo root `.env` (or `packages/database/.env`).
