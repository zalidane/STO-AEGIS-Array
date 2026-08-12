/**
 * Run vue-tsc against this workspace's TypeScript 6 install.
 *
 * In the monorepo, TypeScript 7 is hoisted for Prisma/GraphQL/Extractor.
 * TS 7 no longer exports `typescript/lib/tsc`, which vue-tsc requires, so
 * resolving from the repo root breaks type-check / `npm run build`.
 */
const path = require("node:path");
const { createRequire } = require("node:module");

const vueUiRoot = path.join(__dirname, "..");
const requireFromVueUi = createRequire(path.join(vueUiRoot, "package.json"));
const tscPath = requireFromVueUi.resolve("typescript/lib/tsc.js");

require("vue-tsc").run(tscPath);
