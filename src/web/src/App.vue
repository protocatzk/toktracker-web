<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import { RouterView } from 'vue-router';
import BootScreen from '@/components/BootScreen.vue';
import RouteProgress from '@/components/RouteProgress.vue';
import ToastHost from '@/components/ToastHost.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const AppShell = defineAsyncComponent({
  loader: () => import('@/components/AppShell.vue'),
  loadingComponent: BootScreen,
  delay: 0,
});
</script>

<template>
  <RouteProgress />
  <BootScreen v-if="!auth.loaded" />

  <RouterView v-else v-slot="{ Component, route }">
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
