<script setup lang="ts">
import { RouterLink } from "vue-router";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import {
  ABOUT_LEDE,
  ABOUT_SECTIONS,
  aboutPageTitle,
  GITHUB_BUG_REPORT_LABEL,
  GITHUB_BUG_REPORT_URL,
  isInternalHref,
  KOFI_LABEL,
  KOFI_URL,
} from "@/logic/about";

const title = aboutPageTitle();
</script>

<template>
  <v-container class="about-page" fluid>
    <AppBreadcrumbs />

    <header class="about-header">
      <h1 class="about-header__title">{{ title }}</h1>
      <p class="about-header__lede">{{ ABOUT_LEDE }}</p>
    </header>

    <section
      v-for="section in ABOUT_SECTIONS"
      :id="section.id"
      :key="section.id"
      class="about-section"
      :aria-labelledby="`${section.id}-heading`"
    >
      <h2 :id="`${section.id}-heading`" class="about-section__title">
        {{ section.title }}
      </h2>
      <p
        v-for="(paragraph, index) in section.paragraphs"
        :key="`${section.id}-${index}`"
        class="about-section__body"
      >
        {{ paragraph }}
      </p>
      <p v-if="section.id === 'support'" class="about-section__action">
        <a
          class="about-kofi"
          :href="KOFI_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          Support hosting on {{ KOFI_LABEL }}
        </a>
      </p>
      <p v-else-if="section.id === 'bugs'" class="about-section__action">
        <a
          class="about-kofi"
          :href="GITHUB_BUG_REPORT_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ GITHUB_BUG_REPORT_LABEL }}
        </a>
      </p>
      <ul v-if="section.links.length" class="about-section__links">
        <li v-for="link in section.links" :key="link.href">
          <RouterLink v-if="isInternalHref(link.href)" :to="link.href">
            {{ link.label }}
          </RouterLink>
          <a
            v-else
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
            >{{ link.label }}</a
          >
        </li>
      </ul>
    </section>
  </v-container>
</template>

<style scoped>
.about-page {
  max-width: 48rem;
  padding-bottom: 2.5rem;
}

.about-header {
  margin: 0.75rem 0 1.75rem;
}

.about-header__title {
  margin: 0 0 0.55rem;
  font-size: clamp(1.6rem, 2.4vw, 2.1rem);
  font-weight: 650;
  letter-spacing: 0.02em;
  color: #e8f1fb;
}

.about-header__lede {
  margin: 0;
  color: rgba(200, 214, 230, 0.78);
  line-height: 1.55;
}

.about-section {
  margin-bottom: 1.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid rgba(63, 167, 255, 0.14);
}

.about-section__title {
  margin: 1rem 0 0.65rem;
  font-size: 1.15rem;
  font-weight: 600;
  color: #d7e7f8;
}

.about-section__body {
  margin: 0 0 0.7rem;
  color: rgba(200, 214, 230, 0.82);
  line-height: 1.55;
}

.about-section__action {
  margin: 0.85rem 0 0.7rem;
}

.about-kofi {
  display: inline-block;
  padding: 0.45rem 0.85rem;
  border-radius: 0.35rem;
  background: rgba(63, 167, 255, 0.16);
  color: #7ec4ff;
  text-decoration: none;
  font-weight: 600;
}

.about-kofi:hover {
  text-decoration: underline;
  background: rgba(63, 167, 255, 0.24);
}

.about-section__links {
  margin: 0;
  padding-left: 1.1rem;
  color: rgba(200, 214, 230, 0.75);
}

.about-section__links a {
  color: #7ec4ff;
  text-decoration: none;
}

.about-section__links a:hover {
  text-decoration: underline;
}
</style>
