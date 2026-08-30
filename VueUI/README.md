# Vue UI

Vue 3 catalog, collection, and ship loadout builder for STO AEGIS Array. Talks to the GraphQL API via Apollo; collection and builds persist in the browser.

## Run

From the **monorepo root**, with GraphQL already running (`npm run dev:graphql`):

```bash
npm run dev:vue           # http://localhost:5173 (Vite HMR)
```

`npm run start:vue` / `preview:vue` serve the **built** app with `vite preview` (default port **4173**). Run `npm run build:vue` first. Use `dev:vue` while coding.

The API URL defaults to `http://localhost:4000/graphql`. Override with `VITE_GRAPHQL_URL` (required at **build** time on Railway).

## Stack

- Vue 3 + Vue Router + Pinia
- Vuetify 4
- Apollo Client (`@vue/apollo-composable`)
- Vite 8

## What it does

- **Catalog** — ships (binder + details), items, traits, starship traits, tray skills, masteries, reputations, modifiers, ship types
- **Search** — `/search` tabs over GraphQL `search(text:)` (name vs item body-text hits)
- **Collection** — captains, owned ships/items/traits, bind scope; stored in `localStorage` (not the API)
- **Build** — `/ships/:id/loadout` seats gear on hull slots, captain traits, quality/mark, set bonuses, granted unique console / experimental weapon

Hull slots use wiki Tac/Eng/Sci counts plus assumed **full upgrades**: T5-U career console when `t5uConsole` is set, T5-X/X2 or T6-X/X2 extras, and Commander Miracle Worker universal.

## Layout

Keep UI, logic, and persistence separate (`UI → logic → model`):

```text
VueUI/src/
├── views/                # Routes
├── components/           # Presentation
├── logic/                # Collection, loadout, binders, search helpers
├── models/               # Collection repository (localStorage adapter)
├── stores/               # Pinia (calls logic + repository)
├── graphql/queries/      # Operations (hand-written)
└── graphql/generated/    # Codegen output — do not edit
```

## GraphQL client types

After changing `GraphQL/src/schema/**/*.graphql` or `src/graphql/queries/*.graphql`:

```bash
npm run codegen           # from repo root
```

Codegen reads the GraphQL package’s SDL files (no running server required).

## Tests

```bash
npm run test:unit         # from repo root (Vitest)
```

## Images

Wiki icons and ship renders live in `public/images/{items,ships,traits,starship-traits}/`. The Extractor downloads them; see [Extractor/README.md](../Extractor/README.md) and [`ATTRIBUTION.md`](../ATTRIBUTION.md).

## Deploy

Railway config: [`railway.toml`](railway.toml). Set `VITE_GRAPHQL_URL` on the VueUI service at build time. See the [monorepo README](../README.md#railway-shared-monorepo).
