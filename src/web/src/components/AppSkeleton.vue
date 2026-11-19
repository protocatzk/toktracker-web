<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string;
    height?: string;
    radius?: string;
  }>(),
  { width: '100%', height: '16px', radius: '8px' },
);
</script>

<template>
  <span
    class="ui-skeleton"
    :style="{ display: 'block', width, height, borderRadius: radius }"
    aria-hidden="true"
  ></span>
</template>
