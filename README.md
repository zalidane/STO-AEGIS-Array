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
cp .env.example .env   # if present; otherwise create .env with DATABASE_URL
npm run db:generate
npm run db:migrate
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run extract` | Manual STOWiki extract → `Extractor/output/*.json` |
| `npm run import` | Import committed JSON into local DB |
| `npm run import:prod` | Import committed JSON into production DB |
| `npm run db:generate` | Generate Prisma client in `packages/database` |
| `npm run db:migrate` | Apply migrations (local) |
| `npm run db:migrate:prod` | Apply migrations (production) |
| `npm run db:studio` | Open Prisma Studio |

Extract/import flags (pass after `--`):

```bash
npm run extract -- --force-refresh
npm run import -- --force-import
npm run import:prod
```

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

This is a **shared npm workspaces** monorepo. Do **not** set each service’s Root Directory to `GraphQL/`, `VueUI/`, etc. — keep **Root Directory = `/`** so workspace packages like `@sto-aegis/database` resolve.

Per-service config files:

| Service | Config-as-code path |
|---------|---------------------|
| GraphQL | `/GraphQL/railway.toml` |
| VueUI | `/VueUI/railway.toml` |
| Extractor import | `/Extractor/railway.toml` |

**GraphQL**
- Variables: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (private network URL preferred)
- Generate domain; Yoga serves `/graphql`
- Runs `prisma migrate deploy` as `releaseCommand`

**VueUI**
- Build variable: `VITE_GRAPHQL_URL=https://${{GraphQL.RAILWAY_PUBLIC_DOMAIN}}/graphql`
- Generate a public domain for the SPA

**Extractor**
- Prefer a **Cron Job** / one-shot service (`restartPolicyType = NEVER`) that runs `import:force`
- Variables: same `DATABASE_URL` as GraphQL
- Or fold import into GraphQL `releaseCommand` and skip this service

## License

MIT
