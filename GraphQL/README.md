# GraphQL

Yoga GraphQL API for STO AEGIS Array. Reads PostgreSQL through [`@sto-aegis/database`](../packages/database).

## Run

From the **monorepo root**:

```bash
npm run db:generate
npm run db:migrate
npm run import            # load Extractor/output/*.json if the DB is empty
npm run dev:graphql       # http://localhost:4000/graphql
```

`PORT` defaults to `4000`. GraphiQL is served at `/graphql`. Schema files under `src/schema/` are loaded at process start; restart the server after editing `.graphql` files.

## Layout

```text
GraphQL/src/
├── server.ts             # Yoga HTTP server
├── schema/               # SDL (*.graphql), merged at startup
├── resolvers/            # Query + type resolvers
└── logic/                # Search ranking, HTML decode, ship names, shared builds, STO news, request logging
```

Resolvers wrap string fields with HTML-entity decoding so wiki Cargo values such as `Mat&#039;Ha` display as `Mat'Ha`.

## Queries

List / by-id / by-name (or compound key) for:

| Type | Typical queries |
|------|-----------------|
| Ship | `ships`, `ship`, `shipByName` |
| Infobox (items) | `infoboxes`, `infobox`, `infoboxesByName` |
| Trait / StarshipTrait | `traits`, `traitById`, `starshipTraits`, … |
| TraySkill, Mastery, Reputation, Modifier, SetBonus, ShipType | matching `*s` / by id / by name |
| GwObtain / SwObtain | ground / space obtain tables |
| Search | `search(text:)` |
| Shared builds | `sharedBuild(code:)`, `publicBuilds(...)`, `buildOfTheDay`, `catalogUsage(...)` |
| STO news | `stoNews(limit:)` (Arc Games RSS, falling back to Arc's JSON news API; cached in memory) |

Mutations (shared builds): `publishBuild`, `updateBuild`, and `unlistBuild`. Publishing returns an `editToken`; only its hash is stored (`Build.editTokenHash`), and later edits or unlisting need that token. Builds are keyed by ship **name**, not Cargo id, so a re-import cannot orphan them.

`search` matches ships, traits, starship traits, tray skills, reputations, set bonuses, and items. Item hits split **identity** fields (name, type, rarity, …) from **body** copy (Text/Head/Subhead 1–9) so a weapon name match does not hide consoles that only mention the damage type in the infobox body.

Ship fields include wiki console counts, `t5uConsole`, unique console / experimental weapon links (`uniConsole`, `experimentalWeaponItem`), and related starship traits. Hull upgrade extras (T5-U/X, T6-X) are applied in the Vue UI, not in this API.

## Tests

Node’s test runner, from the repo root:

```bash
npm run test:graphql
```

Logic lives in `src/logic/*.ts` with colocated `*.test.ts` files.

## Deploy

Railway service `GraphQL` (settings in the dashboard, no `railway.toml`). The pre-deploy command `npm run railway:predeploy` waits for Postgres, migrates, and imports changed committed JSON over the private network; the start command runs this package with `tsx` on `PORT` (Railway routes port 8080). `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`. Public URL: `https://sto-aegis-array-production.up.railway.app/graphql`. Details: [docs/railway-private-db.md](../docs/railway-private-db.md) and the [monorepo README](../README.md#railway-shared-monorepo).
