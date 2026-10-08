/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_URL?: string;
  /**
   * Public origin for wiki images, without a trailing slash.
   * Example: https://img.aegisarray.com
   * Unset falls back to the Vite public path `/images`.
   * Inlined at build time. See docs/image-hosting.md.
   */
  readonly VITE_IMAGE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
