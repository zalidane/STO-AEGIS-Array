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
| `npm run dev:extractor` | Run the Extractor pipeline |
| `npm run db:generate` | Generate Prisma client in `packages/database` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Prisma Studio |

Extractor flags (pass after `--`):

```bash
npm run dev:extractor -- --force-import
npm run dev:extractor -- --force-refresh --force-import
```

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

## License

MIT
