<script setup lang="ts">
import { Minus, TrendingDown, TrendingUp } from '@lucide/vue';
import type { Component } from 'vue';
import { computed } from 'vue';
import AnimatedNumber from './AnimatedNumber.vue';

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    sub?: string;
    accent?: boolean;
    icon?: Component;
    trend?: number;
    format?: 'number' | 'currencyEUR' | 'currencyUSD' | 'percent';
    decimals?: number;
  }>(),
  {
    sub: '',
    accent: false,
    icon: undefined,
    trend: undefined,
    format: 'number',
    decimals: 0,
  },
);

const animated = computed(() => typeof props.value === 'number');
const trendClass = computed(() => {
  if (props.trend === undefined || props.trend === 0) return '';
  return props.trend > 0 ? 'is-up' : 'is-down';
});
</script>

<template>
  <article class="ui-kpi" :class="{ 'is-accent': props.accent }">
    <div class="ui-kpi-top">
      <span class="ui-kpi-label">{{ props.label }}</span>
      <component :is="props.icon" v-if="props.icon" :size="16" class="ui-kpi-icon" />
    </div>

    <div class="ui-kpi-value">
      <AnimatedNumber
        v-if="animated"
        :value="Number(props.value)"
        :format="props.format"
        :decimals="props.decimals"
      />
      <template v-else>{{ props.value }}</template>
    </div>

    <div v-if="props.sub" class="ui-kpi-sub">{{ props.sub }}</div>

    <div v-if="props.trend !== undefined" class="ui-trend" :class="trendClass">
      <TrendingUp v-if="props.trend > 0" :size="12" />
      <TrendingDown v-else-if="props.trend < 0" :size="12" />
      <Minus v-else :size="12" />
      {{ Math.abs(props.trend).toFixed(1) }}%
    </div>
  </article>
</template>
