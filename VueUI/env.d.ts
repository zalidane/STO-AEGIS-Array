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
  /**
   * Discord invite shown in the footer and About page.
   * Example: https://discord.gg/2jTgb9HnY
   * Unset or blank falls back to that default invite.
   * Inlined at build time on the VueUI service.
   */
  readonly VITE_DISCORD_URL?: string;
  /**
   * Railway affiliate code (not a full URL).
   * When set, the footer shows "Hosted on Railway" linking to
   * `https://railway.com?referralCode=<code>`.
   * Unset or blank hides that section.
   * Inlined at build time on the VueUI service.
   */
  readonly VITE_RAILWAY_REFERRAL_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
