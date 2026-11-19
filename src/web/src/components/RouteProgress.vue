<script setup lang="ts">
import { routeLoading } from '@/router/progress';
</script>

<template>
  <Transition name="route-progress-fade">
    <div
      v-if="routeLoading"
      class="route-progress"
      role="progressbar"
      aria-label="Seite wird geladen"
      aria-busy="true"
    >
      <span></span>
    </div>
  </Transition>
</template>
