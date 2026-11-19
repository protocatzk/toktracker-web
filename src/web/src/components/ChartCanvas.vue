<script setup lang="ts">
import Chart, { type ChartConfiguration } from 'chart.js/auto';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useThemeStore } from '@/stores/theme';

const props = withDefaults(
  defineProps<{
    type: 'line' | 'bar' | 'doughnut' | 'pie';
    data: ChartConfiguration['data'];
    options?: ChartConfiguration['options'];
    height?: number;
  }>(),
  { height: 260, options: undefined },
);

const theme = useThemeStore();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function render(): void {
  if (!canvas.value) return;
  chart?.destroy();

  const muted = cssVar('--muted', '#8a97a8');
  const grid = cssVar('--chart-grid', 'rgba(138, 151, 168, 0.16)');
  const isCircular = props.type === 'doughnut' || props.type === 'pie';

  const chartData = structuredClone(props.data);
  const chartOptions = props.options ? structuredClone(props.options) : undefined;

  chart = new Chart(canvas.value, {
    type: props.type,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: isCircular || (props.data.datasets?.length ?? 0) > 1,
          position: 'bottom',
          labels: {
            color: muted,
            boxWidth: 10,
            boxHeight: 10,
            font: { family: 'JetBrains Mono, monospace', size: 10 },
          },
        },
        tooltip: {
          backgroundColor: cssVar('--surface-2', '#151b23'),
          borderColor: cssVar('--border', '#27303c'),
          borderWidth: 1,
          titleColor: cssVar('--text-strong', '#f4f8fc'),
          bodyColor: cssVar('--text', '#dfe6ee'),
          titleFont: { family: 'JetBrains Mono, monospace', size: 10 },
          bodyFont: { family: 'JetBrains Mono, monospace', size: 10 },
        },
      },
      scales: isCircular
        ? undefined
        : {
            x: {
              ticks: {
                color: muted,
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 12,
                font: { family: 'JetBrains Mono, monospace', size: 9 },
              },
              grid: { color: grid, drawTicks: false },
              border: { color: grid },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: muted,
                font: { family: 'JetBrains Mono, monospace', size: 9 },
              },
              grid: { color: grid, drawTicks: false },
              border: { color: grid },
            },
          },
      ...chartOptions,
    },
  });
}

onMounted(render);
onBeforeUnmount(() => chart?.destroy());

watch(() => [props.type, props.data, props.options], render, { deep: true });
watch(() => theme.theme, render);
</script>

<template>
  <div class="ttw-chart" :style="{ height: `${height}px` }">
    <canvas ref="canvas"></canvas>
  </div>
</template>
