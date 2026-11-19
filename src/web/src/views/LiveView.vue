<script setup lang="ts">
import { Eye, ExternalLink, Radio, RefreshCw, Search, Users } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { apiGet } from '@/api/client';
import type { LiveResponse, LiveStreamer } from '@/api/types';
import AppButton from '@/components/AppButton.vue';
import AppEmpty from '@/components/AppEmpty.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import PageLoadingOverlay from '@/components/PageLoadingOverlay.vue';
import StatCard from '@/components/StatCard.vue';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtNum, fmtRelative } from '@/utils/format';

type LiveFilter = 'all' | 'live' | 'tracking';

const data = ref<LiveResponse | null>(null);
const loading = ref(false);
const error = ref('');
const filter = ref<LiveFilter>('live');
const search = ref('');
const toast = useToastStore();

let timer: number | undefined;

const filters: Array<{ value: LiveFilter; label: string }> = [
  { value: 'live', label: 'Live' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'all', label: 'Alle' },
];

const streamers = computed(() => data.value?.streamers ?? []);
const liveCount = computed(() => streamers.value.filter((streamer) => Boolean(streamer.is_live)).length);
const trackingCount = computed(() =>
  streamers.value.filter((streamer) => Boolean(streamer.is_tracking)).length,
);
const viewerTotal = computed(() =>
  streamers.value.reduce((sum, streamer) => sum + Number(streamer.current_viewers ?? 0), 0),
);

const filtered = computed(() => {
  const needle = search.value.trim().toLowerCase();
  return streamers.value.filter((streamer) => {
    if (filter.value === 'live' && !streamer.is_live) return false;
    if (filter.value === 'tracking' && !streamer.is_tracking) return false;
    if (!needle) return true;
    return `${streamer.username} ${streamer.display_name ?? ''}`.toLowerCase().includes(needle);
  });
});

async function load(silent = false): Promise<void> {
  if (!silent) loading.value = true;
  error.value = '';
  try {
    data.value = await apiGet<LiveResponse>('/api/live');
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Live-Status konnte nicht geladen werden.';
    error.value = message;
    if (!silent) toast.push(message, 'error');
  } finally {
    loading.value = false;
  }
}

function startTimer(): void {
  stopTimer();
  timer = window.setInterval(() => void load(true), 30_000);
}

function stopTimer(): void {
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

function statusOf(streamer: LiveStreamer): { label: string; className: string } {
  if (streamer.is_live) return { label: 'LIVE', className: 'is-live' };
  if (streamer.is_tracking) return { label: 'TRACKING', className: 'is-tracking' };
  return { label: 'OFFLINE', className: 'is-offline' };
}

onMounted(() => {
  void load();
  startTimer();
});
onBeforeUnmount(stopTimer);
</script>

<template>
  <div class="container ui-page">
    <PageLoadingOverlay v-if="loading && !data" variant="cards" :kpis="4" />

    <AppPageHeader
      eyebrow="TOKTRACKER / LIVE"
      title="Live"
      subtitle="Aktuell live befindliche Streamer und ihr Tracking-Status."
    >
      <template #meta>
        <span v-if="data?.generated_at" class="mono">
          Stand {{ fmtDate(data.generated_at) }}
        </span>
      </template>
      <template #actions>
        <div class="live-search">
          <Search :size="14" />
          <input v-model="search" placeholder="Streamer suchen …" />
        </div>
        <AppButton variant="secondary" :loading="loading" @click="load()">
          <RefreshCw :size="15" />
          Aktualisieren
        </AppButton>
      </template>
    </AppPageHeader>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="summary-bar">
      <StatCard label="Live" :value="liveCount" :icon="Radio" accent />
      <StatCard label="Tracking" :value="trackingCount" :icon="Users" />
      <StatCard label="Zuschauer" :value="viewerTotal" :icon="Eye" />
      <StatCard label="Profile" :value="streamers.length" :icon="Users" />
    </div>

    <div class="ui-toolbar live-toolbar">
      <div class="ui-segmented">
        <button
          v-for="entry in filters"
          :key="entry.value"
          type="button"
          :class="{ active: filter === entry.value }"
          @click="filter = entry.value"
        >
          {{ entry.label }}
        </button>
      </div>
      <span class="mono muted">{{ filtered.length }} Streamer</span>
    </div>

    <AppEmpty
      v-if="!filtered.length && !loading"
      :title="filter === 'live' ? 'Niemand ist gerade live' : 'Keine Streamer gefunden'"
      description="Sobald ein Streamer live geht oder getrackt wird, erscheint er hier."
      :icon="Radio"
    >
      <button v-if="filter !== 'all'" type="button" class="ui-btn ui-btn--ghost ui-btn--sm" @click="filter = 'all'">
        Alle anzeigen
      </button>
    </AppEmpty>

    <div v-else class="live-grid">
      <article v-for="streamer in filtered" :key="streamer.id" class="live-card">
        <div class="live-card-head">
          <span class="ui-avatar live-avatar">
            <img
              v-if="streamer.avatar_url"
              :src="streamer.avatar_url"
              :alt="streamer.username"
              loading="lazy"
            />
            <template v-else>{{ (streamer.display_name || streamer.username).slice(0, 1).toUpperCase() }}</template>
          </span>
          <div class="live-card-copy">
            <strong>{{ streamer.display_name || streamer.username }}</strong>
            <span class="mono">@{{ streamer.username }}</span>
          </div>
          <span class="ttw-status" :class="statusOf(streamer).className">
            <span class="ttw-status-dot"></span>
            {{ statusOf(streamer).label }}
          </span>
        </div>

        <div class="live-card-stats">
          <div>
            <span class="mono">Viewer</span>
            <strong>{{ fmtNum(streamer.current_viewers) }}</strong>
          </div>
          <div>
            <span class="mono">Zuletzt</span>
            <strong>{{ fmtRelative(streamer.last_seen_at) }}</strong>
          </div>
          <div>
            <span class="mono">Auto-Monitor</span>
            <strong>{{ streamer.auto_monitor ? 'AN' : 'AUS' }}</strong>
          </div>
        </div>

        <div class="live-card-foot">
          <a
            class="ui-btn ui-btn--ghost ui-btn--sm"
            :href="`https://www.tiktok.com/@${encodeURIComponent(streamer.username)}/live`"
            target="_blank"
            rel="noopener"
          >
            TikTok <ExternalLink :size="13" />
          </a>
          <span v-if="streamer.is_live" class="live-pulse">
            <span></span> LIVE
          </span>
        </div>
      </article>
    </div>
  </div>
</template>
