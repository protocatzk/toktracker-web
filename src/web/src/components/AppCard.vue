<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    padding?: 'none' | 'sm' | 'md';
  }>(),
  { title: '', subtitle: '', padding: 'md' },
);
</script>

<template>
  <section class="ui-card" :class="`ui-card--${padding}`">
    <header v-if="title || $slots.header || $slots.actions" class="ui-card-header">
      <slot name="header">
        <div>
          <h2 v-if="title" class="ui-card-title">{{ title }}</h2>
          <p v-if="subtitle" class="ui-card-subtitle">{{ subtitle }}</p>
        </div>
      </slot>
      <div v-if="$slots.actions" class="ui-card-actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="ui-card-body">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="ui-card-footer">
      <slot name="footer" />
    </footer>
  </section>
</template>
