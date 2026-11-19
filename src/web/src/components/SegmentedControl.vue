<script setup lang="ts">
import type { Component } from 'vue';

export interface SegmentOption {
  label: string;
  value: string;
  icon?: Component;
}

defineProps<{
  options: SegmentOption[];
}>();

const model = defineModel<string>({ required: true });
</script>

<template>
  <div class="ui-segmented" role="group">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :class="{ active: model === option.value }"
      @click="model = option.value"
    >
      <component :is="option.icon" v-if="option.icon" :size="13" />
      {{ option.label }}
    </button>
  </div>
</template>
