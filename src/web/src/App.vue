<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppShell from '@/components/AppShell.vue';
import ToastHost from '@/components/ToastHost.vue';
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="Component" v-if="route.meta.layout === 'blank'" />
    <AppShell v-else>
      <component :is="Component" />
    </AppShell>
  </RouterView>
  <ToastHost />
</template>
