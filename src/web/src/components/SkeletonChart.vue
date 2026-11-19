<script setup lang="ts">
import AppSkeleton from './AppSkeleton.vue';

withDefaults(defineProps<{ height?: number }>(), { height: 240 });
</script>

<template>
  <div class="skeleton-chart">
    <div class="skeleton-chart-head">
      <AppSkeleton width="32%" height="10px" />
      <AppSkeleton width="62px" height="9px" />
    </div>
    <div class="skeleton-chart-body" :style="{ height: `${height}px` }">
      <span
        v-for="bar in 14"
        :key="bar"
        :style="{ height: `${18 + ((bar * 41) % 64)}%` }"
      ></span>
    </div>
  </div>
</template>
