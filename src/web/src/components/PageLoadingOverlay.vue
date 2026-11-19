<script setup lang="ts">
import SkeletonPage, { type SkeletonVariant } from './SkeletonPage.vue';

withDefaults(
  defineProps<{
    variant?: SkeletonVariant;
    kpis?: number;
    rows?: number;
  }>(),
  { variant: 'table', kpis: 4, rows: 7 },
);
</script>

<template>
  <div class="page-loading-overlay" role="status" aria-busy="true" aria-live="polite">
    <span class="sr-only">Daten werden geladen …</span>
    <SkeletonPage :variant="variant" :kpis="kpis" :rows="rows" />
  </div>
</template>
