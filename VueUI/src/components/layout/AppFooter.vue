<script setup lang="ts">
import { RouterLink } from "vue-router";
import {
  CC_BY_NC_SA_30_URL,
  FOOTER_SUMMARY,
  STOWIKI_HOME_URL,
} from "@/logic/attribution";
</script>

<template>
  <footer class="app-footer" aria-label="Content attributions">
    <p class="app-footer__summary">{{ FOOTER_SUMMARY }}</p>
    <p class="app-footer__links">
      <a :href="STOWIKI_HOME_URL" target="_blank" rel="noopener noreferrer"
        >STOWiki</a
      >
      <span class="app-footer__sep" aria-hidden="true">·</span>
      <a :href="CC_BY_NC_SA_30_URL" target="_blank" rel="noopener noreferrer"
        >CC BY-NC-SA 3.0</a
      >
      <span class="app-footer__sep" aria-hidden="true">·</span>
      <RouterLink to="/attributions">Full attributions</RouterLink>
    </p>
  </footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid rgba(63, 167, 255, 0.18);
  background: rgba(2, 9, 20, 0.85);
  padding: 1rem 1.25rem 1.25rem;
  text-align: center;
}

.app-footer__summary,
.app-footer__links {
  margin: 0;
  color: rgba(200, 214, 230, 0.72);
  font-size: 0.78rem;
  line-height: 1.45;
}

.app-footer__summary {
  max-width: 52rem;
  margin-inline: auto;
}

.app-footer__links {
  margin-top: 0.45rem;
}

.app-footer__links a {
  color: #7ec4ff;
  text-decoration: none;
}

.app-footer__links a:hover {
  text-decoration: underline;
}

.app-footer__sep {
  margin: 0 0.4rem;
  opacity: 0.55;
}
</style>
