<script setup lang="ts">
import {
  ArrowUpRight,
  Coins,
  Gift,
  LayoutGrid,
  RefreshCw,
  Table2,
  Users,
  Wallet,
} from '@lucide/vue';
import type { ChartData } from '@/types/chart';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { apiGet } from '@/api/client';
import type {
  AnalyticsData,
  DashboardOverview,
  GroupsResponse,
  StreamerGroup,
  StreamerOverview,
} from '@/api/types';
import AnimatedNumber from '@/components/AnimatedNumber.vue';
import AppButton from '@/components/AppButton.vue';
import AppCard from '@/components/AppCard.vue';
import AppEmpty from '@/components/AppEmpty.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppSkeleton from '@/components/AppSkeleton.vue';
import ChartCanvas from '@/components/ChartCanvas.vue';
import ProgressRing from '@/components/ProgressRing.vue';
import SegmentedControl, { type SegmentOption } from '@/components/SegmentedControl.vue';
import StatCard from '@/components/StatCard.vue';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtEUR, fmtNum, fmtRelative, fmtUSD } from '@/utils/format';

type ViewMode = 'cards' | 'table';

const period = ref('24h');
const groupId = ref('');
const groups = ref<StreamerGroup[]>([]);
const data = ref<DashboardOverview | null>(null);
const analytics = ref<AnalyticsData | null>(null);
const loading = ref(false);
const analyticsLoading = ref(false);
const error = ref('');
const lastUpdated = ref<Date | null>(null);
const viewMode = ref<ViewMode>('cards');
const toast = useToastStore();

let refreshTimer: number | undefined;
let analyticsRequest = 0;

const periodOptions = [
  { value: 'today', label: 'Heute' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamt (All-Time)' },
];

const viewOptions: SegmentOption[] = [
  { label: 'Karten', value: 'cards', icon: LayoutGrid },
  { label: 'Tabelle', value: 'table', icon: Table2 },
];

const totals = computed(() => data.value?.totals ?? {});
const streamers = computed(() => data.value?.streamers ?? []);
const recentGifts = computed(() => data.value?.recent_gifts ?? []);
const system = computed(() => data.value?.system ?? {});
const timeline = computed(() => analytics.value?.timeline ?? []);
const uniqueGifters = computed(() =>
  streamers.value.reduce((sum, streamer) => sum + Number(streamer.unique_gifters ?? 0), 0),
);
const liveCount = computed(() => Number(totals.value.live_count ?? 0));
const workerTotal = computed(() => Number(system.value.workers_total ?? 0));
const workerRunning = computed(() => Number(system.value.workers_running ?? 0));
const workerConnected = computed(() => Number(system.value.workers_connected ?? 0));
const workerStalled = computed(() => Number(system.value.workers_stalled ?? 0));

const workerPercent = computed(() => (workerTotal.value ? (workerRunning.value / workerTotal.value) * 100 : 0));
const connectedPercent = computed(() =>
  workerTotal.value ? (workerConnected.value / workerTotal.value) * 100 : 0,
);
const stalledPercent = computed(() => (workerTotal.value ? (workerStalled.value / workerTotal.value) * 100 : 0));

const heroChart = computed<ChartData>(() => ({
  labels: timeline.value.map((point) => point.label),
  datasets: [
    {
      label: 'Netto EUR',
      data: timeline.value.map((point) => point.eur_net),
      borderColor: '#4ade80',
      backgroundColor: '#4ade80',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    },
  ],
}));

const heroTrend = computed(() => {
  const points = timeline.value;
  if (points.length < 2) return undefined;
  const previous = Number(points[points.length - 2].eur_net) || 0;
  const current = Number(points[points.length - 1].eur_net) || 0;
  if (!previous) return undefined;
  return ((current - previous) / previous) * 100;
});

const maxCoins = computed(() => Math.max(1, ...streamers.value.map((s) => Number(s.total_coins ?? 0))));

function shareOf(streamer: StreamerOverview): number {
  return Math.min(100, (Number(streamer.total_coins ?? 0) / maxCoins.value) * 100);
}

function statusOf(streamer: StreamerOverview): { label: string; className: string } {
  if (streamer.is_live || streamer.monitor_status === 'connected') {
    return { label: 'LIVE', className: 'is-live' };
  }
  if (streamer.is_tracking_active || streamer.is_tracking) {
    return { label: 'TRACKING', className: 'is-tracking' };
  }
  return { label: 'OFFLINE', className: 'is-offline' };
}

function avatarLetter(streamer: StreamerOverview): string {
  return (streamer.display_name || streamer.username || '?').slice(0, 1).toUpperCase();
}

async function loadAnalytics(query: string): Promise<void> {
  const requestId = (analyticsRequest += 1);
  analyticsLoading.value = true;
  try {
    const result = await apiGet<AnalyticsData>(`/api/analytics?${query}`);
    if (requestId === analyticsRequest) analytics.value = result;
  } catch {
    if (requestId === analyticsRequest) analytics.value = null;
  } finally {
    if (requestId === analyticsRequest) analyticsLoading.value = false;
  }
}

async function load(silent = false): Promise<void> {
  if (!silent) loading.value = true;
  error.value = '';
  const params = new URLSearchParams({ period: period.value });
  if (groupId.value) params.set('group_id', groupId.value);
  const query = params.toString();

  // Teure Analytics sofort parallel starten, aber das Rendern nicht blockieren.
  void loadAnalytics(query);

  try {
    const [overviewResult, groupsResult] = await Promise.allSettled([
      apiGet<DashboardOverview>(`/api/overview?${params.toString()}`),
      apiGet<GroupsResponse>('/api/streamer-groups'),
    ]);

    if (overviewResult.status === 'rejected') throw overviewResult.reason;
    data.value = overviewResult.value;
    groups.value = groupsResult.status === 'fulfilled' ? groupsResult.value.groups : groups.value;
    lastUpdated.value = new Date();
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Dashboard konnte nicht geladen werden.';
    error.value = message;
    if (!silent) toast.push(message, 'error');
  } finally {
    loading.value = false;
  }

}

function startTimer(): void {
  stopTimer();
  refreshTimer = window.setInterval(() => void load(true), 60_000);
}

function stopTimer(): void {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}

function refresh(): void {
  void load();
}

watch([period, groupId], () => {
  void load();
});

onMounted(() => {
  void load();
  startTimer();
});

onBeforeUnmount(stopTimer);
</script>

<template>
  <div class="container ui-page">
    <AppPageHeader
      eyebrow="LIVE EARNINGS / OVERVIEW"
      title="Dashboard"
      subtitle="Einnahmen, Streamer und Geschenke im gewählten Zeitraum."
    >
      <template #meta>
        <div class="dash-meta">
          <span class="ui-badge" :class="liveCount ? 'ui-badge--success' : ''" :dot="liveCount > 0">
            {{ liveCount ? `${fmtNum(liveCount)} live` : 'Niemand live' }}
          </span>
          <span v-if="lastUpdated" class="mono">
            Aktualisiert {{ lastUpdated.toLocaleTimeString('de-DE') }}
          </span>
        </div>
      </template>
      <template #actions>
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
        <AppButton variant="secondary" :loading="loading" @click="refresh">
          <RefreshCw :size="15" />
          Aktualisieren
        </AppButton>
      </template>
    </AppPageHeader>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div v-if="!data && loading" class="ui-kpi-grid">
      <AppSkeleton v-for="index in 4" :key="index" height="118px" radius="18px" />
    </div>

    <template v-else>
      <section class="dash-hero">
        <div class="dash-hero-main">
          <div class="dash-hero-top">
            <span class="ui-eyebrow">NETTO CREATOR-AUSZAHLUNG</span>
            <span v-if="heroTrend !== undefined" class="ui-trend" :class="heroTrend >= 0 ? 'is-up' : 'is-down'">
              {{ heroTrend >= 0 ? '+' : '' }}{{ heroTrend.toFixed(1) }}%
            </span>
          </div>

          <div class="dash-hero-value">
            <AnimatedNumber :value="Number(totals.eur_net ?? 0)" format="currencyEUR" />
          </div>
          <div class="dash-hero-sub">
            <span>{{ fmtUSD(totals.usd_net) }}</span>
            <span class="dash-dot"></span>
            <span>{{ fmtNum(totals.total_coins) }} Coins</span>
            <span class="dash-dot"></span>
            <span>{{ fmtNum(totals.gift_events_count) }} Events</span>
          </div>

          <div v-if="analyticsLoading && !timeline.length" class="dash-hero-chart">
            <AppSkeleton height="150px" radius="14px" />
            <span class="dash-chart-loading mono">Verlauf wird geladen…</span>
          </div>
          <div v-else-if="timeline.length" class="dash-hero-chart">
            <ChartCanvas type="line" :data="heroChart" :height="150" />
          </div>
          <div v-else class="dash-hero-chart dash-hero-chart--empty">
            Kein Zeitverlauf für diesen Zeitraum.
          </div>

          <div class="dash-hero-footer">
            <span class="mono">Spanne {{ fmtEUR(totals.eur_net_low) }} – {{ fmtEUR(totals.eur_net_high) }}</span>
            <RouterLink :to="{ name: 'stats' }" class="ui-btn ui-btn--ghost ui-btn--sm">
              Analytics <ArrowUpRight :size="14" />
            </RouterLink>
          </div>
        </div>

        <div class="dash-hero-side">
          <StatCard
            label="Streamer"
            :value="Number(totals.streamer_count ?? 0)"
            :sub="`${fmtNum(totals.live_count)} live · ${fmtNum(totals.tracking_count)} tracking`"
            :icon="Users"
            format="number"
          />
          <StatCard
            label="Erfasste Geschenke"
            :value="Number(totals.total_gifts_sent ?? 0)"
            :sub="`${fmtNum(uniqueGifters)} unique Gifter`"
            :icon="Gift"
            format="number"
          />
          <StatCard
            label="Brutto-Zuschauerwert"
            :value="Number(totals.eur_gross ?? 0)"
            :sub="fmtUSD(totals.usd_gross)"
            :icon="Wallet"
            format="currencyEUR"
          />
          <StatCard
            label="Coins"
            :value="Number(totals.total_coins ?? 0)"
            :sub="`${fmtNum(totals.streamer_count)} Profile`"
            :icon="Coins"
            format="number"
          />
        </div>
      </section>

      <div class="dash-grid">
        <AppCard
          title="Streamer &amp; Einnahmen"
          subtitle="Sortiert nach Coins im gewählten Zeitraum."
        >
          <template #actions>
            <SegmentedControl v-model="viewMode" :options="viewOptions" />
            <RouterLink :to="{ name: 'streamers' }" class="ui-btn ui-btn--ghost ui-btn--sm">
              Verwalten
            </RouterLink>
          </template>

          <AppEmpty
            v-if="!streamers.length"
            title="Keine Streamer gefunden"
            description="Für diesen Zeitraum liegen keine Streamer-Daten vor."
            :icon="Users"
          />

          <div v-else-if="viewMode === 'cards'" class="streamer-tiles">
            <article v-for="streamer in streamers.slice(0, 8)" :key="streamer.id" class="streamer-tile">
              <div class="streamer-tile-head">
                <span class="ui-avatar">
                  <img v-if="streamer.avatar_url" :src="streamer.avatar_url" :alt="streamer.username" loading="lazy" />
                  <template v-else>{{ avatarLetter(streamer) }}</template>
                </span>
                <div class="streamer-tile-copy">
                  <strong>{{ streamer.display_name || streamer.username }}</strong>
                  <span class="mono">@{{ streamer.username }}</span>
                </div>
                <span class="ttw-status" :class="statusOf(streamer).className">
                  <span class="ttw-status-dot"></span>
                  {{ statusOf(streamer).label }}
                </span>
              </div>
              <div class="streamer-tile-values">
                <div>
                  <span class="mono">Netto</span>
                  <strong>{{ fmtEUR(streamer.eur_net) }}</strong>
                </div>
                <div>
                  <span class="mono">Coins</span>
                  <strong>{{ fmtNum(streamer.total_coins) }}</strong>
                </div>
                <div>
                  <span class="mono">Viewer</span>
                  <strong>{{ fmtNum(streamer.current_viewers) }}</strong>
                </div>
              </div>
              <div class="streamer-tile-bar">
                <span :style="{ width: `${Math.max(4, shareOf(streamer))}%` }"></span>
              </div>
              <div class="streamer-tile-foot">
                <span class="mono">Top Gift: {{ streamer.top_gift?.gift_name ?? '–' }}</span>
                <span class="mono">{{ fmtNum(streamer.unique_gifters) }} Gifter</span>
              </div>
            </article>
          </div>

          <div v-else class="table-wrap table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Streamer</th>
                  <th>Status</th>
                  <th class="num-col">Coins</th>
                  <th class="num-col">Netto EUR</th>
                  <th class="num-col">Netto USD</th>
                  <th class="num-col">Gifter</th>
                  <th>Top Gift</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="streamer in streamers" :key="streamer.id">
                  <td>
                    <div class="ttw-streamer-cell">
                      <img
                        v-if="streamer.avatar_url"
                        :src="streamer.avatar_url"
                        :alt="streamer.username"
                        class="ttw-avatar-img"
                        loading="lazy"
                      />
                      <span v-else class="ttw-avatar-fallback">{{ avatarLetter(streamer) }}</span>
                      <span class="ttw-streamer-copy">
                        <strong>{{ streamer.display_name || streamer.username }}</strong>
                        <span class="mono muted">@{{ streamer.username }}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="ttw-status" :class="statusOf(streamer).className">
                      <span class="ttw-status-dot"></span>
                      {{ statusOf(streamer).label }}
                    </span>
                  </td>
                  <td class="num-col mono">{{ fmtNum(streamer.total_coins) }}</td>
                  <td class="num-col mono">{{ fmtEUR(streamer.eur_net) }}</td>
                  <td class="num-col mono">{{ fmtUSD(streamer.usd_net) }}</td>
                  <td class="num-col mono">{{ fmtNum(streamer.unique_gifters) }}</td>
                  <td>
                    <span v-if="streamer.top_gift?.gift_name">
                      {{ streamer.top_gift.gift_name }}
                      <span class="mono muted">· {{ fmtNum(streamer.top_gift.coins) }}</span>
                    </span>
                    <span v-else class="muted">–</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppCard>

        <aside class="dash-side">
          <AppCard title="System" subtitle="Worker- und Bot-Status.">
            <div class="system-rings">
              <ProgressRing :value="workerPercent" label="Worker" :tone="workerPercent >= 80 ? 'accent' : 'warn'" />
              <ProgressRing :value="connectedPercent" label="Verbunden" tone="info" />
              <ProgressRing :value="stalledPercent" label="Stalled" :tone="stalledPercent > 0 ? 'danger' : 'accent'" />
            </div>
            <div class="system-list">
              <div>
                <span class="mono">TikTokLive</span>
                <span :class="system.tiktoklive_available ? 'ttw-ok' : 'ttw-bad'">
                  {{ system.tiktoklive_available ? 'VERFÜGBAR' : 'NICHT VERFÜGBAR' }}
                </span>
              </div>
              <div>
                <span class="mono">Worker gesamt</span>
                <strong>{{ fmtNum(workerTotal) }}</strong>
              </div>
              <div>
                <span class="mono">Verbunden</span>
                <strong>{{ fmtNum(workerConnected) }}</strong>
              </div>
              <div>
                <span class="mono">Letzter Fehler</span>
                <span class="mono muted">{{ system.last_error || '–' }}</span>
              </div>
            </div>
          </AppCard>

          <AppCard title="Letzte Geschenke" subtitle="Die jüngsten Transaktionen.">
            <AppEmpty v-if="!recentGifts.length" title="Noch keine Geschenke" :icon="Gift" />
            <TransitionGroup v-else name="list" tag="ul" class="gift-feed">
              <li v-for="gift in recentGifts.slice(0, 7)" :key="gift.id">
                <span class="gift-feed-icon"><Gift :size="14" /></span>
                <div class="gift-feed-copy">
                  <strong>{{ gift.gift_name || 'Geschenk' }}</strong>
                  <span class="mono">
                    {{ gift.sender_nickname || gift.sender_username || 'unbekannt' }} ·
                    {{ gift.streamer_display_name || gift.streamer_username }}
                  </span>
                </div>
                <div class="gift-feed-meta">
                  <span>{{ fmtEUR(gift.eur_net) }}</span>
                  <small class="mono">{{ fmtRelative(gift.created_at) }}</small>
                </div>
              </li>
            </TransitionGroup>
            <template #footer>
              <div class="gift-feed-footer">
                <span class="mono">{{ fmtDate(recentGifts[0]?.created_at) }}</span>
                <RouterLink :to="{ name: 'gifts' }" class="ui-btn ui-btn--ghost ui-btn--sm">
                  Alle Events
                </RouterLink>
              </div>
            </template>
          </AppCard>
        </aside>
      </div>
    </template>
  </div>
</template>
