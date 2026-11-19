<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { RouterView } from 'vue-router';
import ToastHost from '@/components/ToastHost.vue';

const AppShell = defineAsyncComponent(() => import('@/components/AppShell.vue'));
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <Transition v-if="route.meta.layout === 'blank'" name="page" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
    <AppShell v-else>
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </AppShell>
  </RouterView>
  <ToastHost />
</template>
