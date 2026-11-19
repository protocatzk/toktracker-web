<script setup lang="ts">
import type { ChartData, ChartOptions } from '@/types/chart';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { use, type EChartsCoreOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { computed } from 'vue';
import VChart from 'vue-echarts';
import { useThemeStore } from '@/stores/theme';

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
]);

const props = withDefaults(
  defineProps<{
    type: 'line' | 'bar' | 'doughnut' | 'pie';
    data: ChartData;
    options?: ChartOptions;
    height?: number;
  }>(),
  { height: 280, options: undefined },
);

const theme = useThemeStore();

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function rgba(color: string, alpha: number): string {
  const value = color.trim();
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const full = hex.length === 3 ? hex.split('').map((part) => part + part).join('') : hex;
    const number = Number.parseInt(full, 16);
    if (!Number.isFinite(number)) return value;
    const r = (number >> 16) & 255;
    const g = (number >> 8) & 255;
    const b = number & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (value.startsWith('rgb(')) {
    return value.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  return value;
}

function colorOf(dataset: Record<string, unknown>, index: number, palette: string[]): string {
  const border = dataset.borderColor;
  if (typeof border === 'string' && border) return border;
  const background = dataset.backgroundColor;
  if (typeof background === 'string' && background) return background;
  if (Array.isArray(background) && typeof background[index] === 'string') {
    return background[index] as string;
  }
  return palette[index % palette.length];
}

const option = computed<EChartsCoreOption>(() => {
  // Referenz auf das Theme erzwingt eine Neuberechnung bei Theme-Wechsel.
  void theme.theme;

  const text = cssVar('--text', '#d7e0ec');
  const muted = cssVar('--muted', '#8391a5');
  const border = cssVar('--border', 'rgba(148,163,184,.14)');
  const grid = cssVar('--chart-grid', 'rgba(148,163,184,.12)');
  const surface = cssVar('--surface-elev', '#111925');
  const palette = [
    cssVar('--chart-1', '#4ade80'),
    cssVar('--chart-2', '#22d3ee'),
    cssVar('--chart-3', '#fbbf24'),
    cssVar('--chart-4', '#a78bfa'),
    cssVar('--chart-5', '#fb7185'),
  ];
  const mono = 'JetBrains Mono, monospace';
  const isCircular = props.type === 'doughnut' || props.type === 'pie';
  const labels = (props.data.labels ?? []).map((label) => String(label));
  const datasets = (props.data.datasets ?? []) as unknown as Array<Record<string, unknown>>;
  const firstData = (datasets[0]?.data as unknown[] | undefined) ?? [];

  const legendConfig = (props.options as Record<string, unknown> | undefined)?.plugins as
    | Record<string, unknown>
    | undefined;
  const legend = legendConfig?.legend as Record<string, unknown> | undefined;
  const legendPosition = (legend?.position as string | undefined) ?? 'bottom';
  const cutout =
    (props.options as Record<string, unknown> | undefined)?.cutout ??
    (isCircular ? '58%' : undefined);

  const series = isCircular
    ? [
        {
          type: 'pie' as const,
          radius: cutout ? [String(cutout), '76%'] : ['0%', '76%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: surface,
            borderWidth: 2,
            borderRadius: 4,
          },
          label: { show: false },
          emphasis: { scale: true, scaleSize: 5 },
          data: labels.map((label, index) => ({
            name: label,
            value: Number(firstData[index] ?? 0),
          })),
          color:
            Array.isArray(datasets[0]?.backgroundColor) &&
            (datasets[0]?.backgroundColor as unknown[]).length
              ? (datasets[0].backgroundColor as string[])
              : palette,
        },
      ]
    : datasets.map((dataset, index) => {
        const color = colorOf(dataset, index, palette);
        const data = (dataset.data as unknown[])?.map((value) => Number(value ?? 0)) ?? [];
        if (props.type === 'bar') {
          return {
            type: 'bar' as const,
            name: String(dataset.label ?? ''),
            data,
            barMaxWidth: 28,
            itemStyle: { color, borderRadius: [5, 5, 0, 0] },
            emphasis: { focus: 'series' as const },
          };
        }
        return {
          type: 'line' as const,
          name: String(dataset.label ?? ''),
          data,
          smooth: true,
          showSymbol: false,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2.4, color },
          itemStyle: { color },
          emphasis: { focus: 'series' as const },
          areaStyle: dataset.fill
            ? {
                color: {
                  type: 'linear' as const,
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: rgba(color, 0.28) },
                    { offset: 1, color: rgba(color, 0.01) },
                  ],
                },
              }
            : undefined,
        };
      });

  return {
    animationDuration: 650,
    animationEasing: 'cubicOut',
    color: palette,
    textStyle: { fontFamily: 'Inter, sans-serif', color: text },
    grid: isCircular
      ? undefined
      : { left: 8, right: 10, top: 18, bottom: datasets.length > 1 ? 34 : 24, containLabel: true },
    tooltip: {
      trigger: isCircular ? 'item' : 'axis',
      backgroundColor: surface,
      borderColor: border,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: text, fontFamily: mono, fontSize: 11 },
      axisPointer: { type: 'line', lineStyle: { color: border } },
    },
    legend: {
      show: isCircular || datasets.length > 1,
      orient: legendPosition === 'right' ? 'vertical' : 'horizontal',
      bottom: legendPosition === 'right' ? undefined : 0,
      right: legendPosition === 'right' ? 4 : undefined,
      top: legendPosition === 'right' ? 'middle' : undefined,
      textStyle: { color: muted, fontFamily: mono, fontSize: 9 },
      icon: 'circle',
      itemWidth: 7,
      itemHeight: 7,
      itemGap: 12,
    },
    xAxis: isCircular
      ? undefined
      : {
          type: 'category',
          data: labels,
          boundaryGap: props.type === 'bar',
          axisLine: { lineStyle: { color: border } },
          axisTick: { show: false },
          axisLabel: {
            color: muted,
            fontFamily: mono,
            fontSize: 9,
            hideOverlap: true,
            maxRotation: 0,
          },
          splitLine: { show: false },
        },
    yAxis: isCircular
      ? undefined
      : {
          type: 'value',
          splitLine: { lineStyle: { color: grid, type: 'dashed' } },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: muted, fontFamily: mono, fontSize: 9 },
        },
    series,
  };
});
</script>

<template>
  <div class="ttw-chart" :style="{ height: `${height}px` }">
    <VChart :option="option" autoresize class="ttw-chart-canvas" />
  </div>
</template>
