<script setup lang="ts">
import { computed } from "vue";
import { useQuery } from "@vue/apollo-composable";
import AppBreadcrumbs from "@/components/shared/AppBreadcrumbs.vue";
import LoadingPanel from "@/components/shared/LoadingPanel.vue";
import {
  StoNewsDocument,
  type StoNewsQuery,
} from "@/graphql/generated/graphql";
import {
  NEWS_OFFICIAL_INDEX_URL,
  NEWS_PAGE_LEDE,
  NEWS_PAGE_TITLE,
  NEWS_SOURCE_NOTE,
  formatNewsPublishedAt,
  newsSourceKindLabel,
} from "@/logic/news/copy";

const { result, loading, error, refetch } = useQuery(StoNewsDocument, {
  limit: 40,
});

type Entry = StoNewsQuery["stoNews"]["entries"][number];

const feed = computed(() => result.value?.stoNews ?? null);
const entries = computed<Entry[]>(() => feed.value?.entries ?? []);
const sourceLabel = computed(() =>
  newsSourceKindLabel(feed.value?.sourceKind),
);
</script>

<template>
  <v-container class="news-page" fluid>
    <AppBreadcrumbs />

    <header class="news-header">
      <h1 class="news-header__title">{{ NEWS_PAGE_TITLE }}</h1>
      <p class="news-header__lede">{{ NEWS_PAGE_LEDE }}</p>
      <p class="news-header__note">{{ NEWS_SOURCE_NOTE }}</p>
      <p class="news-header__official">
        <a
          :href="NEWS_OFFICIAL_INDEX_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          Official STO news on Arc Games
        </a>
      </p>
    </header>

    <section class="news-list" aria-labelledby="news-list-heading">
      <h2 id="news-list-heading" class="news-list__title">Latest posts</h2>

      <LoadingPanel v-if="loading && !feed" message="STO news" />

      <v-alert
        v-else-if="error"
        type="error"
        variant="tonal"
        class="mb-4"
        border="start"
      >
        Could not load news right now.
        <button type="button" class="news-retry" @click="refetch()">
          Try again
        </button>
      </v-alert>

      <template v-else>
        <p v-if="feed" class="news-list__meta">
          Source: {{ sourceLabel }}
          <span v-if="feed.fetchedAt" class="news-list__fetched">
            · refreshed
            {{ formatNewsPublishedAt(feed.fetchedAt) }}
          </span>
        </p>

        <ul v-if="entries.length" class="news-entries">
          <li v-for="entry in entries" :key="entry.id" class="news-entry">
            <a
              class="news-entry__title"
              :href="entry.link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ entry.title }}
            </a>
            <p v-if="entry.publishedAt" class="news-entry__date">
              <time :datetime="String(entry.publishedAt)">
                {{ formatNewsPublishedAt(entry.publishedAt) }}
              </time>
            </p>
            <p v-if="entry.summary" class="news-entry__summary">
              {{ entry.summary }}
            </p>
            <p class="news-entry__action">
              <a
                :href="entry.link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read on Arc Games
              </a>
            </p>
          </li>
        </ul>

        <p v-else class="news-list__empty">No news entries returned.</p>
      </template>
    </section>
  </v-container>
</template>

<style scoped>
.news-page {
  max-width: 48rem;
  padding-bottom: 2.5rem;
}

.news-header {
  margin: 0.75rem 0 1.75rem;
}

.news-header__title {
  margin: 0 0 0.55rem;
  font-size: clamp(1.6rem, 2.4vw, 2.1rem);
  font-weight: 650;
  letter-spacing: 0.02em;
  color: #e8f1fb;
}

.news-header__lede,
.news-header__note {
  margin: 0 0 0.65rem;
  max-width: 40rem;
  line-height: 1.55;
  color: rgba(232, 241, 251, 0.78);
}

.news-header__note {
  font-size: 0.92rem;
  color: rgba(232, 241, 251, 0.62);
}

.news-header__official {
  margin: 0;
  font-size: 0.92rem;
}

.news-header__official a,
.news-entry__title,
.news-entry__action a {
  color: #8ec7ff;
  text-decoration: none;
}

.news-header__official a:hover,
.news-entry__title:hover,
.news-entry__action a:hover {
  text-decoration: underline;
}

.news-list__title {
  margin: 0 0 0.75rem;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(232, 241, 251, 0.7);
}

.news-list__meta,
.news-list__empty {
  margin: 0 0 1rem;
  font-size: 0.88rem;
  color: rgba(232, 241, 251, 0.55);
}

.news-entries {
  list-style: none;
  margin: 0;
  padding: 0;
}

.news-entry {
  padding: 1.1rem 0;
  border-top: 1px solid rgba(232, 241, 251, 0.12);
}

.news-entry:last-child {
  border-bottom: 1px solid rgba(232, 241, 251, 0.12);
}

.news-entry__title {
  display: inline-block;
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.35;
  color: #e8f1fb;
}

.news-entry__date {
  margin: 0.35rem 0 0.45rem;
  font-size: 0.85rem;
  color: rgba(232, 241, 251, 0.55);
}

.news-entry__summary {
  margin: 0 0 0.55rem;
  line-height: 1.5;
  color: rgba(232, 241, 251, 0.78);
}

.news-entry__action {
  margin: 0;
  font-size: 0.9rem;
}

.news-retry {
  margin-left: 0.5rem;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
</style>
