<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { apiGet } from '@/api/client';
import type { DashboardOverview, GroupsResponse, StreamerGroup, StreamerOverview } from '@/api/types';
import StatCard from '@/components/StatCard.vue';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtEUR, fmtNum, fmtUSD } from '@/utils/format';

const period = ref('24h');
const groupId = ref('');
const groups = ref<StreamerGroup[]>([]);
const data = ref<DashboardOverview | null>(null);
const loading = ref(false);
const error = ref('');
const lastUpdated = ref<Date | null>(null);
const toast = useToastStore();

let refreshTimer: number | undefined;

const periodOptions = [
  { value: 'today', label: 'Heute' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamt (All-Time)' },
];

const totals = computed(() => data.value?.totals ?? {});
const streamers = computed(() => data.value?.streamers ?? []);
const recentGifts = computed(() => data.value?.recent_gifts ?? []);
const system = computed(() => data.value?.system ?? {});
const uniqueGifters = computed(() =>
  streamers.value.reduce((sum, streamer) => sum + Number(streamer.unique_gifters ?? 0), 0),
);

async function load(silent = false): Promise<void> {
  if (!silent) loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({ period: period.value });
    if (groupId.value) params.set('group_id', groupId.value);
    const [overviewPayload, groupsPayload] = await Promise.all([
      apiGet<DashboardOverview>(`/api/overview?${params.toString()}`),
      apiGet<GroupsResponse>('/api/streamer-groups'),
    ]);
    data.value = overviewPayload;
    groups.value = groupsPayload.groups;
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

function streamerStatus(streamer: StreamerOverview): { label: string; className: string } {
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
  <div class="container">
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">LIVE EARNINGS / OVERVIEW</p>
        <h2>Dashboard</h2>
        <p class="section-hint">
          Einnahmen, Streamer und Geschenke im gewählten Zeitraum.
          <span v-if="lastUpdated" class="mono">
            Zuletzt aktualisiert: {{ lastUpdated.toLocaleTimeString('de-DE') }}
          </span>
        </p>
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
        <button type="button" :disabled="loading" @click="refresh">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
        <a class="btn-link" :href="`/api/export/gifts.csv${groupId ? `?group_id=${groupId}` : ''}`">Gifts CSV</a>
        <a class="btn-link" :href="`/api/export/battles.csv${groupId ? `?group_id=${groupId}` : ''}`">Battles CSV</a>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="summary-bar">
      <StatCard
        label="Netto Creator-Auszahlung"
        :value="fmtEUR(totals.eur_net)"
        :sub="`${fmtUSD(totals.usd_net)} · ${fmtNum(totals.total_coins)} Coins`"
        accent
      />
      <StatCard
        label="Streamer"
        :value="fmtNum(totals.streamer_count)"
        :sub="`${fmtNum(totals.live_count)} LIVE · ${fmtNum(totals.tracking_count)} Tracking`"
      />
      <StatCard
        label="Brutto Zuschauer-Kaufwert"
        :value="fmtEUR(totals.eur_gross)"
        :sub="fmtUSD(totals.usd_gross)"
      />
      <StatCard
        label="Erfasste Geschenke"
        :value="fmtNum(totals.total_gifts_sent)"
        :sub="`${fmtNum(totals.gift_events_count)} Transaktionen · ${fmtNum(uniqueGifters)} Gifter`"
      />
    </div>

    <div class="ttw-dashboard-grid">
      <section class="box ttw-dashboard-main">
        <div class="box-header">
          <div>
            <h2>Streamer &amp; Einnahmen</h2>
            <div class="section-hint">Sortiert nach Coins im gewählten Zeitraum.</div>
          </div>
          <span class="status-tag">{{ streamers.length }} STREAMER</span>
        </div>

        <div v-if="!streamers.length && !loading" class="ttw-empty">
          Keine Streamer im gewählten Zeitraum gefunden.
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
                  <span class="ttw-status" :class="streamerStatus(streamer).className">
                    <span class="ttw-status-dot"></span>
                    {{ streamerStatus(streamer).label }}
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
      </section>

      <aside class="ttw-dashboard-side">
        <section class="box">
          <div class="box-header">
            <div>
              <h2>System</h2>
              <div class="section-hint">Worker- und Bot-Status.</div>
            </div>
          </div>

          <dl class="ttw-kv">
            <div>
              <dt>Worker aktiv</dt>
              <dd>{{ fmtNum(system.workers_running) }} / {{ fmtNum(system.workers_total) }}</dd>
            </div>
            <div>
              <dt>Verbunden</dt>
              <dd>{{ fmtNum(system.workers_connected) }}</dd>
            </div>
            <div>
              <dt>Stalled</dt>
              <dd>{{ fmtNum(system.workers_stalled) }}</dd>
            </div>
            <div>
              <dt>TikTokLive</dt>
              <dd :class="system.tiktoklive_available ? 'ttw-ok' : 'ttw-bad'">
                {{ system.tiktoklive_available ? 'VERFÜGBAR' : 'NICHT VERFÜGBAR' }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="box">
          <div class="box-header">
            <div>
              <h2>Letzte Geschenke</h2>
              <div class="section-hint">Die jüngsten Transaktionen.</div>
            </div>
          </div>

          <div v-if="!recentGifts.length && !loading" class="ttw-empty">Noch keine Geschenke.</div>
          <ul v-else class="ttw-gift-list">
            <li v-for="gift in recentGifts.slice(0, 8)" :key="gift.id">
              <div class="ttw-gift-main">
                <strong>{{ gift.gift_name || 'Geschenk' }}</strong>
                <span class="mono muted">
                  {{ gift.sender_nickname || gift.sender_username || 'unbekannt' }} ·
                  {{ gift.streamer_display_name || gift.streamer_username }}
                </span>
              </div>
              <div class="ttw-gift-meta">
                <span class="mono">{{ fmtEUR(gift.eur_net) }}</span>
                <span class="mono muted">{{ fmtDate(gift.created_at) }}</span>
              </div>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>
