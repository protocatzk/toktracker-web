<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    size?: number;
    label?: string;
    tone?: 'accent' | 'info' | 'warn' | 'danger';
  }>(),
  { size: 84, label: '', tone: 'accent' },
);

const clamped = computed(() => Math.min(100, Math.max(0, Number(props.value) || 0)));
const color = computed(() => {
  if (props.tone === 'danger') return 'var(--danger)';
  if (props.tone === 'warn') return 'var(--warn)';
  if (props.tone === 'info') return 'var(--info)';
  return 'var(--accent)';
});
</script>

<template>
  <div class="progress-ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <div
      class="progress-ring-track"
      :style="{
        background: `conic-gradient(${color} ${clamped * 3.6}deg, var(--surface-3) 0deg)`,
      }"
    >
      <div class="progress-ring-inner">
        <strong>{{ Math.round(clamped) }}%</strong>
        <span v-if="label">{{ label }}</span>
      </div>
    </div>
  </div>
</template>
