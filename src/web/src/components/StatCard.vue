<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string;
    sub?: string;
    accent?: boolean;
  }>(),
  { sub: '', accent: false },
);
</script>

<template>
  <div class="summary-box ttw-stat" :class="{ 'is-accent': accent }">
    <div class="label">{{ label }}</div>
    <div class="val">{{ value }}</div>
    <div v-if="sub" class="sub">{{ sub }}</div>
  </div>
</template>
