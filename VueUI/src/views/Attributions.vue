<script setup lang="ts">
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import {
  ATTRIBUTION_SECTIONS,
  attributionPageTitle,
  DISCLAIMER,
} from "@/logic/attribution";

const title = attributionPageTitle();
</script>

<template>
  <v-container class="attributions-page" fluid>
    <AppBreadcrumbs />

    <header class="attributions-header">
      <h1 class="attributions-header__title">{{ title }}</h1>
      <p class="attributions-header__lede">{{ DISCLAIMER }}</p>
    </header>

    <section
      v-for="section in ATTRIBUTION_SECTIONS"
      :id="section.id"
      :key="section.id"
      class="attribution-section"
      :aria-labelledby="`${section.id}-heading`"
    >
      <h2 :id="`${section.id}-heading`" class="attribution-section__title">
        {{ section.title }}
      </h2>
      <p
        v-for="(paragraph, index) in section.paragraphs"
        :key="`${section.id}-${index}`"
        class="attribution-section__body"
      >
        {{ paragraph }}
      </p>
      <ul class="attribution-section__links">
        <li v-for="link in section.links" :key="link.href">
          <a :href="link.href" target="_blank" rel="noopener noreferrer">{{
            link.label
          }}</a>
        </li>
      </ul>
    </section>
  </v-container>
</template>

<style scoped>
.attributions-page {
  max-width: 48rem;
  padding-bottom: 2.5rem;
}

.attributions-header {
  margin: 0.75rem 0 1.75rem;
}

.attributions-header__title {
  margin: 0 0 0.55rem;
  font-size: clamp(1.6rem, 2.4vw, 2.1rem);
  font-weight: 650;
  letter-spacing: 0.02em;
  color: #e8f1fb;
}

.attributions-header__lede {
  margin: 0;
  color: rgba(200, 214, 230, 0.78);
  line-height: 1.55;
}

.attribution-section {
  margin-bottom: 1.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid rgba(63, 167, 255, 0.14);
}

.attribution-section__title {
  margin: 1rem 0 0.65rem;
  font-size: 1.15rem;
  font-weight: 600;
  color: #d7e7f8;
}

.attribution-section__body {
  margin: 0 0 0.7rem;
  color: rgba(200, 214, 230, 0.82);
  line-height: 1.55;
}

.attribution-section__links {
  margin: 0;
  padding-left: 1.1rem;
  color: rgba(200, 214, 230, 0.75);
}

.attribution-section__links a {
  color: #7ec4ff;
  text-decoration: none;
}

.attribution-section__links a:hover {
  text-decoration: underline;
}
</style>
