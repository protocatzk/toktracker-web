<script setup lang="ts">
import AppSkeleton from './AppSkeleton.vue';
import SkeletonChart from './SkeletonChart.vue';
import SkeletonKpi from './SkeletonKpi.vue';
import SkeletonTable from './SkeletonTable.vue';

export type SkeletonVariant = 'table' | 'cards' | 'charts' | 'form';

withDefaults(
  defineProps<{
    kpis?: number;
    variant?: SkeletonVariant;
    rows?: number;
  }>(),
  { kpis: 4, variant: 'table', rows: 7 },
);
</script>

<template>
  <div class="skeleton-page">
    <div class="skeleton-page-head">
      <div class="skeleton-page-copy">
        <AppSkeleton width="120px" height="9px" />
        <AppSkeleton width="min(320px, 70%)" height="36px" />
        <AppSkeleton width="min(520px, 88%)" height="12px" />
      </div>
      <AppSkeleton width="154px" height="38px" radius="9px" />
    </div>

    <div v-if="kpis > 0" class="skeleton-kpi-grid">
      <SkeletonKpi v-for="index in kpis" :key="index" />
    </div>

    <template v-if="variant === 'charts'">
      <div class="skeleton-split">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div class="skeleton-card">
        <SkeletonTable :rows="5" :columns="5" />
      </div>
    </template>

    <template v-else-if="variant === 'cards'">
      <div class="skeleton-card-grid">
        <div v-for="index in 6" :key="index" class="skeleton-tile">
          <div class="skeleton-tile-head">
            <AppSkeleton width="42px" height="42px" radius="50%" />
            <div class="skeleton-tile-copy">
              <AppSkeleton width="70%" height="12px" />
              <AppSkeleton width="45%" height="9px" />
            </div>
          </div>
          <AppSkeleton width="100%" height="48px" radius="10px" />
          <AppSkeleton width="60%" height="9px" />
        </div>
      </div>
    </template>

    <template v-else-if="variant === 'form'">
      <div class="skeleton-card">
        <div class="skeleton-form">
          <AppSkeleton v-for="index in 6" :key="index" width="100%" height="44px" radius="9px" />
        </div>
      </div>
    </template>

    <div v-else class="skeleton-card">
      <SkeletonTable :rows="rows" :columns="6" />
    </div>
  </div>
</template>
