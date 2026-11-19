<script setup lang="ts">
import AppSkeleton from './AppSkeleton.vue';

withDefaults(defineProps<{ rows?: number }>(), { rows: 5 });
</script>

<template>
  <div class="skeleton-list">
    <div v-for="row in rows" :key="row" class="skeleton-list-row">
      <AppSkeleton width="34px" height="34px" radius="50%" />
      <div class="skeleton-list-copy">
        <AppSkeleton width="58%" height="11px" />
        <AppSkeleton width="36%" height="9px" />
      </div>
      <AppSkeleton width="62px" height="10px" />
    </div>
  </div>
</template>
