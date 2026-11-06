import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Connect, Plugin } from "vite";

import { applyStaticHost, scrubStaticOutput, type HeaderSink } from "./staticHostPolicy";

const vueRoot = fileURLToPath(new URL("..", import.meta.url));

/**
 * Preview (`vite preview`, the Railway start command) and the dev server.
 * Middleware registered inside the hook runs before Vite's static and SPA
 * fallback, so dotfiles are rejected instead of being rewritten to index.html.
 */
export function staticHostPlugin(): Plugin {
  const guard: Connect.NextHandleFunction = (req, res, next) => {
    const blocked = applyStaticHost(req, res as HeaderSink);
    if (!blocked) next();
  };

  return {
    name: "aegis-static-host",
    configureServer(server) {
      server.middlewares.use(guard);
    },
    configurePreviewServer(server) {
      server.middlewares.use(guard);
    },
    closeBundle() {
      if (process.env.VITEST) return;
      const environment = this.environment;
      if (!environment) return;
      const resolved = path.resolve(
        environment.config.root,
        environment.config.build.outDir,
      );
      if (resolved !== path.resolve(vueRoot, "dist")) return;
      const { removed } = scrubStaticOutput(resolved);
      if (removed.length > 0) {
        this.info(
          `Removed ${removed.length} blocked file(s) from the static build.`,
        );
      }
    },
  };
}
