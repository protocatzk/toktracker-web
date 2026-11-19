<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'violet';
    dot?: boolean;
  }>(),
  { tone: 'neutral', dot: false },
);
</script>

<template>
  <span class="ui-badge" :class="tone !== 'neutral' ? `ui-badge--${tone}` : ''">
    <span v-if="dot" class="ui-badge-dot"></span>
    <slot />
  </span>
</template>
