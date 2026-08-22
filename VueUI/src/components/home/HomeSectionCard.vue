<script setup lang="ts">
import { RouterLink } from "vue-router";

defineProps<{
  title: string;
  to: string;
  description: string;
  icon: string;
  countLabel: string;
  dense?: boolean;
}>();
</script>

<template>
  <RouterLink :to="to" class="section-card" :class="{ 'section-card--dense': dense }">
    <header class="section-card__header">
      <div class="section-card__title-row">
        <v-icon :icon="icon" size="22" />
        <h2 class="section-card__title">{{ title }}</h2>
      </div>
      <div class="section-card__count">{{ countLabel }}</div>
    </header>
    <p class="section-card__description">{{ description }}</p>
    <div class="section-card__cta">Browse</div>
  </RouterLink>
</template>

<style scoped>
.section-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  height: 100%;
  min-height: 11.5rem;
  padding: 1.15rem 1.25rem 1.2rem;
  text-decoration: none;
  color: inherit;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.04), transparent 40%),
    linear-gradient(160deg, #152336, #0d1624 70%, #0a121d);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  transition:
    border-color 140ms ease,
    transform 140ms ease,
    box-shadow 140ms ease;
}

.section-card:hover,
.section-card:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.55);
  transform: translateY(-2px);
  box-shadow:
    0 16px 32px rgba(0, 0, 0, 0.36),
    0 0 0 1px rgba(var(--v-theme-primary), 0.2);
  outline: none;
}

.section-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.section-card__title-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.section-card__title {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.2;
  font-weight: 700;
}

.section-card__count {
  flex-shrink: 0;
  color: #7dd3fc;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: right;
  line-height: 1.35;
}

.section-card__description {
  margin: 0;
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.45;
  flex: 1;
}

.section-card__cta {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  font-weight: 650;
}

.section-card--dense {
  min-height: 0;
  gap: 0.55rem;
  padding: 0.85rem 0.95rem 0.9rem;
}

.section-card--dense .section-card__header {
  flex-wrap: wrap;
  padding-bottom: 0.5rem;
}

.section-card--dense .section-card__title {
  font-size: 1.02rem;
}

.section-card--dense .section-card__description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
</style>
