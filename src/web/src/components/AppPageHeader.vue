<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title: string;
    subtitle?: string;
  }>(),
  { eyebrow: '', subtitle: '' },
);
</script>

<template>
  <header class="ui-page-header">
    <div>
      <p v-if="eyebrow" class="ui-eyebrow">{{ eyebrow }}</p>
      <h2 class="ui-page-title">{{ title }}</h2>
      <p v-if="subtitle" class="ui-page-subtitle">{{ subtitle }}</p>
      <slot name="meta" />
    </div>
    <div v-if="$slots.actions" class="ui-page-actions">
      <slot name="actions" />
    </div>
  </header>
</template>
