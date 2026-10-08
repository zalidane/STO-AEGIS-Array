# Vue UI

Vue 3 catalog, collection, and ship loadout builder for STO AEGIS Array. Talks to the GraphQL API via Apollo; collection and builds persist in the browser.

**Live site:** [https://vueui-production.up.railway.app](https://vueui-production.up.railway.app)


## Run

From the **monorepo root**, with GraphQL already running (`npm run dev:graphql`):

```bash
npm run dev:vue           # http://localhost:5173 (Vite HMR)
```

`npm run start:vue` / `preview:vue` serve the **built** app with `vite preview` (default port **4173**). Run `npm run build:vue` first. Use `dev:vue` while coding.

The API URL defaults to `http://localhost:4000/graphql`. Override with `VITE_GRAPHQL_URL` (required at **build** time on Railway).

Wiki image URLs default to `/images/...`. Set `VITE_IMAGE_BASE_URL` (for example `https://img.aegisarray.com`, no trailing slash) to load them from object storage. It is inlined at **build** time. Leave it unset for local dev. See [`docs/image-hosting.md`](../docs/image-hosting.md).

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

Hull slots use wiki Tac/Eng/Sci counts plus optional extras (T5-U career console, T5-X/X2 or T6-X/X2, Commander Miracle Worker universal). Each loadout can hide or lock unused extras and hide quality/mark/suffix pickers. Universal consoles never take suffix mods; career consoles do when listed in Modifiers `available`.

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

Wiki icons and ship renders are served at runtime from object storage when `VITE_IMAGE_BASE_URL` is set, and from `public/images/{items,ships,traits,starship-traits,tray-skills}/` when it is not. The Extractor still downloads into that folder; `npm run images:sync` publishes it. Placeholders live in `public/placeholders/`. See [Extractor/README.md](../Extractor/README.md), [`docs/image-hosting.md`](../docs/image-hosting.md), and [`ATTRIBUTION.md`](../ATTRIBUTION.md).

They are © Cryptic Studios / Arc Games / DECA / Paramount; sourced from STOWiki; not covered by this repo's licenses; unofficial non-commercial fan site; removed on rights-holder request.

## Deploy

Railway config: [`railway.toml`](railway.toml). Set `VITE_GRAPHQL_URL` on the VueUI service at build time. Set `VITE_IMAGE_BASE_URL` only after the image bucket is verified. See the [monorepo README](../README.md#railway-shared-monorepo).
