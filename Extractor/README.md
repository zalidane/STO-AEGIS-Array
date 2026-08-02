# Extractor

Extracts Star Trek Online game data from [STOWiki](https://stowiki.net) Cargo tables, caches it as JSON under `output/`, and imports it into PostgreSQL using the shared `@sto-aegis/database` package.

## Setup

From the **monorepo root**:

```bash
npm install
npm run db:generate
npm run db:migrate
```

Ensure root `.env` contains `DATABASE_URL`.

## Usage

```bash
# from monorepo root
npm run dev:extractor

npm run dev:extractor -- --force-import
npm run dev:extractor -- --force-refresh --force-import
```

Or from this directory:

```bash
npm run dev
```

## CLI flags

| Flag | Effect |
|------|--------|
| `--force-refresh` | Re-extract all Cargo tables from STOWiki |
| `--force-import` | Re-import all JSON files, ignoring hash skip |

## Pipeline

1. Extract → `output/{Table}.json`
2. Map + import → PostgreSQL
3. `linkRelations` → FKs / join tables

See the monorepo [README](../README.md) for workspace layout and the shared database package.
