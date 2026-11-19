<script setup lang="ts">
import PageLoadingOverlay from '@/components/PageLoadingOverlay.vue';
import type { ChartData, ChartOptions } from '@/types/chart';
import { computed, onMounted, ref, watch } from 'vue';
import { apiGet } from '@/api/client';
import type { AnalyticsData, GroupsResponse, StreamerGroup } from '@/api/types';
import ChartCanvas from '@/components/ChartCanvas.vue';
import StatCard from '@/components/StatCard.vue';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtDuration, fmtEUR, fmtNum, fmtUSD } from '@/utils/format';

const period = ref('24h');
const groupId = ref('');
const groups = ref<StreamerGroup[]>([]);
const analytics = ref<AnalyticsData | null>(null);
const loading = ref(false);
const error = ref('');
const toast = useToastStore();

const periodOptions = [
  { value: 'today', label: 'Heute' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamt' },
];

const colors = ['#3fb950', '#58a6ff', '#d29922', '#a371f7', '#f85149', '#2dd4bf', '#e6edf3', '#8a97a8'];

const totals = computed(() => analytics.value?.totals);
const timeline = computed(() => analytics.value?.timeline ?? []);
const topGifts = computed(() => analytics.value?.top_gifts ?? []);
const topGifters = computed(() => analytics.value?.top_gifters ?? []);
const ranking = computed(() => analytics.value?.streamers_ranking ?? []);
const sessions = computed(() => analytics.value?.sessions ?? []);
const timeOfDay = computed(() => analytics.value?.time_of_day ?? []);

const timelineLabels = computed(() => timeline.value.map((point) => point.label));

const revenueChart = computed<ChartData>(() => ({
  labels: timelineLabels.value,
  datasets: [
    {
      label: 'Netto EUR',
      data: timeline.value.map((point) => point.eur_net),
      borderColor: '#3fb950',
      backgroundColor: 'rgba(63, 185, 80, 0.12)',
      fill: true,
      tension: 0.25,
      pointRadius: 2,
      borderWidth: 2,
    },
  ],
}));

const coinsChart = computed<ChartData>(() => ({
  labels: timelineLabels.value,
  datasets: [
    {
      label: 'Coins',
      data: timeline.value.map((point) => point.coins),
      backgroundColor: 'rgba(88, 166, 255, 0.55)',
      borderColor: '#58a6ff',
      borderWidth: 1,
    },
  ],
}));

const giftChart = computed<ChartData>(() => ({
  labels: topGifts.value.slice(0, 8).map((gift) => gift.gift_name),
  datasets: [
    {
      data: topGifts.value.slice(0, 8).map((gift) => gift.total_coins),
      backgroundColor: colors,
      borderColor: 'rgba(11, 14, 19, 0.8)',
      borderWidth: 1,
    },
  ],
}));

const timeOfDayChart = computed<ChartData>(() => ({
  labels: timeOfDay.value.map((point) => point.label),
  datasets: [
    {
      label: 'Coins',
      data: timeOfDay.value.map((point) => point.coins),
      backgroundColor: 'rgba(210, 153, 34, 0.5)',
      borderColor: '#d29922',
      borderWidth: 1,
    },
  ],
}));

const giftChartOptions = computed<ChartOptions>(() => ({
  cutout: '58%',
  plugins: { legend: { position: 'right' } },
}));

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({ period: period.value });
    if (groupId.value) params.set('group_id', groupId.value);
    const [analyticsPayload, groupsPayload] = await Promise.all([
      apiGet<AnalyticsData>(`/api/analytics?${params.toString()}`),
      apiGet<GroupsResponse>('/api/streamer-groups'),
    ]);
    analytics.value = analyticsPayload;
    groups.value = groupsPayload.groups;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Statistiken konnten nicht geladen werden.';
    toast.push(error.value, 'error');
  } finally {
    loading.value = false;
  }
}

watch([period, groupId], () => {
  void load();
});
onMounted(load);
</script>

<template>
  <div class="container">
    <PageLoadingOverlay v-if="loading && !analytics" variant="charts" :kpis="4" />
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">ANALYTICS / READ-ONLY</p>
        <h2>Statistiken</h2>
        <p class="section-hint">Einnahmen, Coins, Geschenke und Spender im Zeitverlauf.</p>
      </div>
      <div class="toolbar-controls">
        <select v-model="period" aria-label="Zeitraum">
          <option v-for="option in periodOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model="groupId" aria-label="Gruppe">
          <option value="">Alle Gruppen</option>
          <option v-for="group in groups" :key="group.id" :value="String(group.id)">
            {{ group.name }}
          </option>
        </select>
        <button type="button" :disabled="loading" @click="load">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="summary-bar">
      <StatCard
        label="Netto"
        :value="fmtEUR(totals?.eur_net)"
        :sub="fmtUSD(totals?.usd_net)"
        accent
      />
      <StatCard
        label="Coins"
        :value="fmtNum(totals?.total_coins)"
        :sub="`${fmtNum(totals?.total_gifts_sent)} Geschenke`"
      />
      <StatCard
        label="Unique Gifter"
        :value="fmtNum(totals?.unique_gifters)"
        :sub="`Ø ${fmtEUR(totals?.avg_eur_per_gifter)} pro Gifter`"
      />
      <StatCard
        label="Sessions"
        :value="fmtNum(totals?.sessions_count)"
        :sub="`${fmtDuration((totals?.total_stream_minutes ?? 0) * 60)} Streamzeit`"
      />
    </div>

    <div class="ttw-chart-grid">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Netto-Verlauf</h2>
            <div class="section-hint">Einnahmen in EUR pro Zeitbucket.</div>
          </div>
        </div>
        <ChartCanvas type="line" :data="revenueChart" :height="280" />
      </section>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Coins-Verlauf</h2>
            <div class="section-hint">Gesammelte Coins pro Zeitbucket.</div>
          </div>
        </div>
        <ChartCanvas type="bar" :data="coinsChart" :height="280" />
      </section>
    </div>

    <div class="ttw-chart-grid">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Top-Geschenke</h2>
            <div class="section-hint">Verteilung nach Coins.</div>
          </div>
        </div>
        <ChartCanvas type="doughnut" :data="giftChart" :options="giftChartOptions" :height="300" />
      </section>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Tageszeit-Aktivität</h2>
            <div class="section-hint">Coins nach Stunde (00–23 Uhr).</div>
          </div>
        </div>
        <ChartCanvas type="bar" :data="timeOfDayChart" :height="300" />
      </section>
    </div>

    <div class="ttw-chart-grid">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Top-Spender</h2>
            <div class="section-hint">Nach Coins im gewählten Zeitraum.</div>
          </div>
        </div>
        <div class="table-wrap table-responsive">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Spender</th>
                <th class="num-col">Coins</th>
                <th class="num-col">EUR</th>
                <th class="num-col">Anteil</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="gifter in topGifters" :key="gifter.sender_username">
                <td class="mono">{{ gifter.rank }}</td>
                <td>
                  {{ gifter.sender_nickname || gifter.sender_username }}
                  <span v-if="gifter.is_super_fan" class="ttw-perm-badge is-grant">FAN</span>
                </td>
                <td class="num-col mono">{{ fmtNum(gifter.total_coins) }}</td>
                <td class="num-col mono">{{ fmtEUR(gifter.eur_net) }}</td>
                <td class="num-col mono">{{ gifter.pct_of_total ?? 0 }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Streamer-Ranking</h2>
            <div class="section-hint">Einnahmen und Anteil am Gesamtvolumen.</div>
          </div>
        </div>
        <div class="table-wrap table-responsive">
          <table>
            <thead>
              <tr>
                <th>Streamer</th>
                <th class="num-col">Coins</th>
                <th class="num-col">EUR</th>
                <th class="num-col">Gifter</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="streamer in ranking" :key="streamer.id">
                <td>
                  @{{ streamer.username }}
                  <span class="mono muted">· {{ streamer.pct_of_total ?? 0 }}%</span>
                </td>
                <td class="num-col mono">{{ fmtNum(streamer.total_coins) }}</td>
                <td class="num-col mono">{{ fmtEUR(streamer.eur_net) }}</td>
                <td class="num-col mono">{{ fmtNum(streamer.unique_gifters) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Sessions</h2>
          <div class="section-hint">Die letzten 25 Stream-Sessions.</div>
        </div>
        <span class="status-tag">{{ sessions.length }} SESSIONS</span>
      </div>

      <div v-if="!sessions.length" class="ttw-empty">Keine Sessions im Zeitraum.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Streamer</th>
              <th>Start</th>
              <th class="num-col">Dauer</th>
              <th class="num-col">Peak</th>
              <th class="num-col">Coins</th>
              <th class="num-col">EUR</th>
              <th class="num-col">Coins/h</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in sessions" :key="session.id">
              <td>@{{ session.streamer_username }}</td>
              <td class="mono">{{ fmtDate(session.started_at) }}</td>
              <td class="num-col mono">{{ fmtDuration((session.duration_minutes ?? 0) * 60) }}</td>
              <td class="num-col mono">{{ fmtNum(session.peak_viewers) }}</td>
              <td class="num-col mono">{{ fmtNum(session.session_coins) }}</td>
              <td class="num-col mono">{{ fmtEUR(session.eur_net) }}</td>
              <td class="num-col mono">{{ fmtNum(session.coins_per_hour) }}</td>
              <td>{{ session.status || '–' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
