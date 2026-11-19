<script setup lang="ts">
import type { ChartConfiguration } from 'chart.js';
import { computed, onMounted, ref, watch } from 'vue';
import { apiGet } from '@/api/client';
import type {
  AnalyticsData,
  BattleRow,
  BattleStats,
  BattlesResponse,
  PublicOverview,
  StreamerOverview,
} from '@/api/types';
import ChartCanvas from '@/components/ChartCanvas.vue';
import StatCard from '@/components/StatCard.vue';
import { fmtDate, fmtEUR, fmtNum, fmtUSD } from '@/utils/format';

type PublicTab = 'leaderboard' | 'battles' | 'analytics' | 'gifts' | 'bot';

const period = ref('24h');
const tab = ref<PublicTab>('leaderboard');
const overview = ref<PublicOverview | null>(null);
const battles = ref<BattleRow[]>([]);
const battleStats = ref<BattleStats | null>(null);
const analytics = ref<AnalyticsData | null>(null);
const loading = ref(false);
const error = ref('');

const periodOptions = [
  { value: 'today', label: 'Heute' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamt' },
];

const tabs: Array<{ value: PublicTab; label: string }> = [
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'battles', label: 'Battles' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'gifts', label: 'Geschenke' },
  { value: 'bot', label: 'Telegram-Bot' },
];

const totals = computed(() => overview.value?.totals ?? {});
const streamers = computed(() => overview.value?.streamers ?? []);
const recentGifts = computed(() => overview.value?.recent_gifts ?? []);
const banner = computed(() => overview.value?.banner);
const timeline = computed(() => analytics.value?.timeline ?? []);

const revenueChart = computed<ChartConfiguration['data']>(() => ({
  labels: timeline.value.map((point) => point.label),
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

const giftChart = computed<ChartConfiguration['data']>(() => ({
  labels: (analytics.value?.top_gifts ?? []).slice(0, 8).map((gift) => gift.gift_name),
  datasets: [
    {
      data: (analytics.value?.top_gifts ?? []).slice(0, 8).map((gift) => gift.total_coins),
      backgroundColor: ['#3fb950', '#58a6ff', '#d29922', '#a371f7', '#f85149', '#2dd4bf', '#e6edf3', '#8a97a8'],
      borderColor: 'rgba(11, 14, 19, 0.8)',
      borderWidth: 1,
    },
  ],
}));

const giftChartOptions = computed<ChartConfiguration['options']>(() => ({
  cutout: '58%',
  plugins: { legend: { position: 'right' } },
}));

function statusOf(streamer: StreamerOverview): { label: string; className: string } {
  if (streamer.is_live || streamer.is_tracking_active) {
    return { label: 'LIVE', className: 'is-live' };
  }
  return { label: 'OFFLINE', className: 'is-offline' };
}

function battleTitle(battle: BattleRow): string {
  if (battle.is_internal && battle.streamer_a && battle.streamer_b) {
    return `${battle.streamer_a.username ?? 'A'} vs ${battle.streamer_b.username ?? 'B'}`;
  }
  return `${battle.streamer_username ?? 'Streamer'} vs ${
    battle.opponent_display_name ?? battle.opponent_username ?? 'Gegner'
  }`;
}

function battleScore(battle: BattleRow): string {
  if (battle.is_internal && battle.streamer_a && battle.streamer_b) {
    return `${fmtNum(battle.streamer_a.score)} : ${fmtNum(battle.streamer_b.score)}`;
  }
  return `${fmtNum(battle.streamer_score)} : ${fmtNum(battle.opponent_score)}`;
}

async function loadOverview(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    overview.value = await apiGet<PublicOverview>(
      `/api/public/overview?period=${encodeURIComponent(period.value)}`,
    );
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Public Panel konnte nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

async function loadBattles(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({ period: period.value, limit: '50' });
    const [battlePayload, statsPayload] = await Promise.all([
      apiGet<BattlesResponse>(`/api/public/battles?${params.toString()}`),
      apiGet<BattleStats>(`/api/public/battles/stats?period=${encodeURIComponent(period.value)}`),
    ]);
    battles.value = battlePayload.battles;
    battleStats.value = statsPayload;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Battles konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

async function loadAnalytics(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    analytics.value = await apiGet<AnalyticsData>(
      `/api/public/analytics?period=${encodeURIComponent(period.value)}`,
    );
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Analytics konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

async function loadTab(): Promise<void> {
  if (tab.value === 'battles') return loadBattles();
  if (tab.value === 'analytics') return loadAnalytics();
  return loadOverview();
}

watch(tab, () => {
  void loadTab();
});
watch(period, () => {
  void loadTab();
});
onMounted(loadTab);
</script>

<template>
  <div class="container">
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">PUBLIC / READ-ONLY</p>
        <h2>Public Panel</h2>
        <p class="section-hint">Öffentliche Streamer-, Battle- und Einnahmen-Übersicht.</p>
      </div>
      <div class="toolbar-controls">
        <select v-model="period" aria-label="Zeitraum">
          <option v-for="option in periodOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button type="button" :disabled="loading" @click="loadTab">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div v-if="banner?.enabled && banner.text" class="status-banner info ttw-public-banner">
      <div>
        <strong>{{ banner.title || 'Hinweis' }}</strong>
        <div>{{ banner.text }}</div>
      </div>
      <a
        v-if="banner.btn_text && banner.btn_url"
        class="btn sm"
        :href="banner.btn_url"
        target="_blank"
        rel="noopener"
      >
        {{ banner.btn_text }}
      </a>
    </div>

    <nav class="nav-bar ttw-public-tabs" aria-label="Public Panel">
      <div class="tab-list">
        <button
          v-for="entry in tabs"
          :key="entry.value"
          type="button"
          class="tab-btn"
          :class="{ active: tab === entry.value }"
          @click="tab = entry.value"
        >
          {{ entry.label }}
        </button>
      </div>
    </nav>

    <template v-if="tab === 'leaderboard'">
      <div class="summary-bar">
        <StatCard label="Netto Creator" :value="fmtEUR(totals.eur_net)" :sub="fmtUSD(totals.usd_net)" accent />
        <StatCard label="Streamer" :value="fmtNum(totals.streamer_count)" :sub="`${fmtNum(totals.live_count)} LIVE`" />
        <StatCard label="Coins" :value="fmtNum(totals.total_coins)" />
        <StatCard label="Geschenke" :value="fmtNum(totals.total_gifts_sent)" :sub="`${fmtNum(totals.gift_events_count)} Events`" />
      </div>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Streamer</h2>
            <div class="section-hint">Live-Status und Einnahmen im gewählten Zeitraum.</div>
          </div>
          <span class="status-tag">{{ streamers.length }} STREAMER</span>
        </div>

        <div v-if="!streamers.length && !loading" class="ttw-empty">Keine öffentlichen Streamer-Daten.</div>
        <div v-else class="table-wrap table-responsive">
          <table>
            <thead>
              <tr>
                <th>Streamer</th>
                <th>Status</th>
                <th class="num-col">Viewer</th>
                <th class="num-col">Coins</th>
                <th class="num-col">Netto EUR</th>
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
                    <span v-else class="ttw-avatar-fallback">
                      {{ (streamer.display_name || streamer.username).slice(0, 1).toUpperCase() }}
                    </span>
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
                <td class="num-col mono">{{ fmtNum(streamer.current_viewers) }}</td>
                <td class="num-col mono">{{ fmtNum(streamer.total_coins) }}</td>
                <td class="num-col mono">{{ fmtEUR(streamer.eur_net) }}</td>
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
      </section>
    </template>

    <template v-else-if="tab === 'battles'">
      <div class="summary-bar">
        <StatCard label="Battles" :value="fmtNum(battleStats?.total_battles)" :sub="`${fmtNum(battleStats?.ongoing)} laufend`" />
        <StatCard label="Winrate" :value="`${fmtNum(battleStats?.winrate_pct)}%`" :sub="`${fmtNum(battleStats?.wins)} W · ${fmtNum(battleStats?.losses)} L`" accent />
        <StatCard label="Coins" :value="fmtNum(battleStats?.total_coins)" />
        <StatCard label="Netto" :value="fmtEUR(battleStats?.total_eur_net)" />
      </div>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Battle-Verlauf</h2>
            <div class="section-hint">Öffentliche Battles im Zeitraum.</div>
          </div>
          <span class="status-tag">{{ battles.length }} BATTLES</span>
        </div>
        <div v-if="!battles.length && !loading" class="ttw-empty">Keine Battles gefunden.</div>
        <div v-else class="table-wrap table-responsive">
          <table>
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Battle</th>
                <th>Score</th>
                <th>Ergebnis</th>
                <th class="num-col">Coins</th>
                <th class="num-col">EUR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="battle in battles" :key="battle.id">
                <td class="mono">{{ fmtDate(battle.started_at) }}</td>
                <td>{{ battleTitle(battle) }}</td>
                <td class="mono">{{ battleScore(battle) }}</td>
                <td class="mono">{{ battle.result || battle.status }}</td>
                <td class="num-col mono">{{ fmtNum(battle.coins_earned ?? battle.total_coins) }}</td>
                <td class="num-col mono">{{ fmtEUR(battle.eur_net ?? battle.total_eur_net) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <template v-else-if="tab === 'analytics'">
      <div class="summary-bar">
        <StatCard label="Netto" :value="fmtEUR(analytics?.totals.eur_net)" :sub="fmtUSD(analytics?.totals.usd_net)" accent />
        <StatCard label="Coins" :value="fmtNum(analytics?.totals.total_coins)" />
        <StatCard label="Gifter" :value="fmtNum(analytics?.totals.unique_gifters)" />
        <StatCard label="Sessions" :value="fmtNum(analytics?.totals.sessions_count)" />
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
              <h2>Top-Geschenke</h2>
              <div class="section-hint">Verteilung nach Coins.</div>
            </div>
          </div>
          <ChartCanvas type="doughnut" :data="giftChart" :options="giftChartOptions" :height="280" />
        </section>
      </div>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Top-Spender</h2>
            <div class="section-hint">Öffentliche Rangliste.</div>
          </div>
        </div>
        <div v-if="!(analytics?.top_gifters ?? []).length" class="ttw-empty">Keine Spender-Daten.</div>
        <div v-else class="table-wrap table-responsive">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Spender</th>
                <th class="num-col">Coins</th>
                <th class="num-col">EUR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="gifter in analytics?.top_gifters" :key="gifter.sender_username">
                <td class="mono">{{ gifter.rank }}</td>
                <td>{{ gifter.sender_nickname || gifter.sender_username }}</td>
                <td class="num-col mono">{{ fmtNum(gifter.total_coins) }}</td>
                <td class="num-col mono">{{ fmtEUR(gifter.eur_net) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <template v-else-if="tab === 'gifts'">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Letzte Geschenke</h2>
            <div class="section-hint">Öffentliche Transaktionen im Zeitraum.</div>
          </div>
        </div>
        <div v-if="!recentGifts.length && !loading" class="ttw-empty">Keine Geschenke.</div>
        <div v-else class="table-wrap table-responsive">
          <table>
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Streamer</th>
                <th>Spender</th>
                <th>Geschenk</th>
                <th class="num-col">Coins</th>
                <th class="num-col">EUR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="gift in recentGifts" :key="gift.id">
                <td class="mono">{{ fmtDate(gift.created_at) }}</td>
                <td>@{{ gift.streamer_username }}</td>
                <td>{{ gift.sender_nickname || gift.sender_username || '–' }}</td>
                <td>{{ gift.gift_name }}</td>
                <td class="num-col mono">{{ fmtNum(gift.total_coins) }}</td>
                <td class="num-col mono">{{ fmtEUR(gift.eur_net) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Telegram-Bot</h2>
            <div class="section-hint">Live-Reports und Statistiken direkt aus Telegram.</div>
          </div>
        </div>
        <p class="section-hint">
          Der TokTracker-Bot liefert 24h-Reports, Streamer-Statistiken und Live-Status.
        </p>
        <a class="btn primary" href="https://t.me/toktrackeragent" target="_blank" rel="noopener">
          Bot öffnen ↗
        </a>
      </section>
    </template>

    <div v-if="overview?.rates" class="ttw-public-rates mono">
      <span>USD/Diamond: {{ overview.rates.usd_per_diamond ?? '–' }}</span>
      <span>Brutto USD/Coin: {{ overview.rates.gross_usd_per_coin ?? '–' }}</span>
      <span>USD→EUR: {{ overview.rates.usd_to_eur_rate ?? '–' }}</span>
    </div>
  </div>
</template>
