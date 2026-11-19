<script setup lang="ts">
import { Inbox } from '@lucide/vue';
import type { Component } from 'vue';

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    icon?: Component;
  }>(),
  {
    title: 'Keine Daten',
    description: '',
    icon: Inbox,
  },
);
</script>

<template>
  <div class="ui-empty">
    <span class="ui-empty-icon">
      <component :is="icon" :size="19" />
    </span>
    <strong>{{ title }}</strong>
    <span v-if="description">{{ description }}</span>
    <slot />
  </div>
</template>
