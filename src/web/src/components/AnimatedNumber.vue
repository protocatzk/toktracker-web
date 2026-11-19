<script setup lang="ts">
import { TransitionPresets, useTransition } from '@vueuse/core';
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    format?: 'number' | 'currencyEUR' | 'currencyUSD' | 'percent';
    decimals?: number;
    duration?: number;
  }>(),
  { format: 'number', decimals: 0, duration: 750 },
);

const source = computed(() => Number(props.value) || 0);
const output = useTransition(source, {
  duration: props.duration,
  transition: TransitionPresets.easeOutExpo,
});

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const display = computed(() => {
  const value = output.value;
  if (props.format === 'currencyEUR') return eur.format(value);
  if (props.format === 'currencyUSD') return usd.format(value);
  if (props.format === 'percent') return `${value.toFixed(props.decimals)}%`;
  return new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: props.decimals,
  }).format(value);
});
</script>

<template>
  <span class="animated-number">{{ display }}</span>
</template>
