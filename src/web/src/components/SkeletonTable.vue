<script setup lang="ts">
import AppSkeleton from './AppSkeleton.vue';

withDefaults(
  defineProps<{
    rows?: number;
    columns?: number;
  }>(),
  { rows: 6, columns: 5 },
);
</script>

<template>
  <div class="skeleton-table">
    <div class="skeleton-table-row skeleton-table-head">
      <AppSkeleton
        v-for="col in columns"
        :key="`h-${col}`"
        height="9px"
        :width="col === 1 ? '72%' : col === columns ? '38%' : '48%'"
      />
    </div>
    <div v-for="row in rows" :key="`r-${row}`" class="skeleton-table-row">
      <AppSkeleton
        v-for="col in columns"
        :key="`c-${row}-${col}`"
        height="12px"
        :width="col === 1 ? '80%' : col === columns ? '34%' : '54%'"
      />
    </div>
  </div>
</template>
