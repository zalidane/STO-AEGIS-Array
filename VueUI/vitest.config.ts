import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      server: {
        deps: {
          // Vuetify component CSS is imported from node_modules. Inline so Vite
          // transforms those imports instead of handing them to Node.
          inline: ['vuetify'],
        },
      },
    },
  }),
)
