<script setup lang="ts">
import PageLoadingOverlay from '@/components/PageLoadingOverlay.vue';
import type { ChartData } from '@/types/chart';
import { computed, onMounted, ref, watch } from 'vue';
import { apiGet } from '@/api/client';
import type { ApiAnalytics, SiteAnalytics } from '@/api/types';
import ChartCanvas from '@/components/ChartCanvas.vue';
import StatCard from '@/components/StatCard.vue';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtNum } from '@/utils/format';

const toast = useToastStore();

const period = ref('today');
const onlyExternal = ref(true);
const site = ref<SiteAnalytics | null>(null);
const api = ref<ApiAnalytics | null>(null);
const loading = ref(false);
const error = ref('');

const periodOptions = [
  { value: 'today', label: 'Heute' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamt' },
];

const viewsChart = computed<ChartData>(() => ({
  labels: (site.value?.timeline ?? []).map((point) => point.label),
  datasets: [
    {
      label: 'Views',
      data: (site.value?.timeline ?? []).map((point) => point.views ?? 0),
      borderColor: '#58a6ff',
      backgroundColor: 'rgba(88, 166, 255, 0.12)',
      fill: true,
      tension: 0.25,
      pointRadius: 2,
      borderWidth: 2,
    },
    {
      label: 'Visitors',
      data: (site.value?.timeline ?? []).map((point) => point.visitors ?? 0),
      borderColor: '#3fb950',
      backgroundColor: 'rgba(63, 185, 80, 0.08)',
      fill: false,
      tension: 0.25,
      pointRadius: 2,
      borderWidth: 2,
    },
  ],
}));

const callsChart = computed<ChartData>(() => ({
  labels: (api.value?.timeline ?? []).map((point) => point.label),
  datasets: [
    {
      label: 'Calls',
      data: (api.value?.timeline ?? []).map((point) => point.calls ?? 0),
      backgroundColor: 'rgba(88, 166, 255, 0.55)',
      borderColor: '#58a6ff',
      borderWidth: 1,
    },
    {
      label: 'Errors',
      data: (api.value?.timeline ?? []).map((point) => point.errors ?? 0),
      backgroundColor: 'rgba(248, 81, 73, 0.55)',
      borderColor: '#f85149',
      borderWidth: 1,
    },
  ],
}));

const botSessions = computed(() => site.value?.bot_sessions ?? []);
const challenges = computed(() => site.value?.recent_challenges ?? []);
const workers = computed(() => site.value?.tiktok_workers ?? []);
const telegram = computed(() => site.value?.telegram_diagnostics ?? {});

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '–';
  return String(value);
}

function statusClass(status?: string): string {
  const value = String(status ?? '').toLowerCase();
  if (['approved', 'ok', 'success', 'healthy', 'running', 'connected'].includes(value)) return 'is-live';
  if (['rejected', 'locked', 'error', 'failed', 'blocked', 'offline', 'stopped'].includes(value)) return 'is-offline';
  return 'is-tracking';
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const apiParams = new URLSearchParams({
      period: period.value,
      only_external: String(onlyExternal.value),
    });
    const [sitePayload, apiPayload] = await Promise.all([
      apiGet<SiteAnalytics>(`/api/site-analytics?period=${encodeURIComponent(period.value)}`),
      apiGet<ApiAnalytics>(`/api/site-analytics/api-calls?${apiParams.toString()}`),
    ]);
    site.value = sitePayload;
    api.value = apiPayload;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Site-Analytics konnten nicht geladen werden.';
    toast.push(error.value, 'error');
  } finally {
    loading.value = false;
  }
}

watch([period, onlyExternal], () => {
  void load();
});
onMounted(load);
</script>

<template>
  <div class="container">
    <PageLoadingOverlay v-if="loading && !site" variant="charts" :kpis="4" />
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">TOKTRACKER / SITE &amp; API</p>
        <h2>Site-Analytics</h2>
        <p class="section-hint">Web-Traffic, API-Aufrufe, Bot-Sessions und Worker.</p>
      </div>
      <div class="toolbar-controls">
        <select v-model="period" aria-label="Zeitraum">
          <option v-for="option in periodOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <label class="checkbox-label">
          <input v-model="onlyExternal" type="checkbox" />
          Nur externe API-Calls
        </label>
        <button type="button" :disabled="loading" @click="load">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="summary-bar">
      <StatCard label="Views" :value="fmtNum(site?.kpis.total_views)" :sub="`${fmtNum(site?.kpis.unique_visitors)} Besucher`" accent />
      <StatCard label="Ø Latenz" :value="`${fmtNum(site?.kpis.avg_latency)} ms`" :sub="`${fmtNum(site?.kpis.error_views)} Fehler`" />
      <StatCard label="API-Calls" :value="fmtNum(api?.kpis.total_calls)" :sub="`${fmtNum(api?.kpis.unique_callers)} Caller`" />
      <StatCard label="API-Fehlerrate" :value="`${fmtNum(api?.kpis.error_rate_pct)}%`" :sub="`${fmtNum(api?.kpis.error_calls)} Fehler`" />
    </div>

    <div class="ttw-chart-grid">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Traffic</h2>
            <div class="section-hint">Views und eindeutige Besucher.</div>
          </div>
        </div>
        <ChartCanvas type="line" :data="viewsChart" :height="280" />
      </section>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>API-Aufrufe</h2>
            <div class="section-hint">Calls und Fehler im Zeitverlauf.</div>
          </div>
        </div>
        <ChartCanvas type="bar" :data="callsChart" :height="280" />
      </section>
    </div>

    <div class="ttw-chart-grid">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Top-Pfade</h2>
            <div class="section-hint">Meistbesuchte Web-Routen.</div>
          </div>
        </div>
        <div v-if="!(site?.paths ?? []).length" class="ttw-empty">Keine Daten.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pfad</th>
                <th class="num-col">Views</th>
                <th class="num-col">Besucher</th>
                <th class="num-col">Ø ms</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="path in site?.paths" :key="path.path">
                <td class="mono">{{ path.path }}</td>
                <td class="num-col mono">{{ fmtNum(path.views) }}</td>
                <td class="num-col mono">{{ fmtNum(path.visitors) }}</td>
                <td class="num-col mono">{{ fmtNum(path.avg_ms) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Geräte &amp; Referrer</h2>
            <div class="section-hint">Woher der Traffic kommt.</div>
          </div>
        </div>
        <div class="ttw-detail-grid">
          <div>
            <h3 class="ttw-detail-title">Geräte</h3>
            <ul class="ttw-mini-list">
              <li v-for="device in site?.devices ?? []" :key="device.device">
                <span>{{ device.device }}</span>
                <span class="mono">{{ fmtNum(device.count) }}</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="ttw-detail-title">Referrer</h3>
            <ul class="ttw-mini-list">
              <li v-for="referrer in (site?.referrers ?? []).slice(0, 10)" :key="referrer.referrer">
                <span class="ttw-ellipsis">{{ referrer.referrer || 'direkt' }}</span>
                <span class="mono">{{ fmtNum(referrer.count) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>API-Endpunkte</h2>
          <div class="section-hint">Aufrufe, Caller und Fehler pro Endpunkt.</div>
        </div>
        <span class="status-tag">{{ api?.endpoints.length ?? 0 }} ENDPUNKTE</span>
      </div>
      <div v-if="!(api?.endpoints ?? []).length" class="ttw-empty">Keine API-Daten.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Methode</th>
              <th>Endpunkt</th>
              <th class="num-col">Calls</th>
              <th class="num-col">Caller</th>
              <th class="num-col">Ø ms</th>
              <th class="num-col">Fehler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="endpoint in api?.endpoints" :key="`${endpoint.method}-${endpoint.endpoint}`">
              <td class="mono">{{ endpoint.method }}</td>
              <td class="mono">{{ endpoint.endpoint }}</td>
              <td class="num-col mono">{{ fmtNum(endpoint.count) }}</td>
              <td class="num-col mono">{{ fmtNum(endpoint.unique_callers) }}</td>
              <td class="num-col mono">{{ fmtNum(endpoint.avg_ms) }}</td>
              <td class="num-col mono">{{ fmtNum(endpoint.errors) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="ttw-chart-grid">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>API-Consumer</h2>
            <div class="section-hint">Aufrufer nach Auth-Typ und Volumen.</div>
          </div>
        </div>
        <div v-if="!(api?.consumers ?? []).length" class="ttw-empty">Keine Consumer.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Auth</th>
                <th class="num-col">Calls</th>
                <th class="num-col">Ø ms</th>
                <th>Zuletzt</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="consumer in api?.consumers.slice(0, 15)" :key="consumer.ip_hash">
                <td class="mono">{{ consumer.auth_type || '–' }}</td>
                <td class="num-col mono">{{ fmtNum(consumer.call_count) }}</td>
                <td class="num-col mono">{{ fmtNum(consumer.avg_ms) }}</td>
                <td class="mono">{{ fmtDate(consumer.last_seen) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Letzte API-Calls</h2>
            <div class="section-hint">Rohdaten der jüngsten Aufrufe.</div>
          </div>
        </div>
        <div v-if="!(api?.recent_calls ?? []).length" class="ttw-empty">Keine Calls.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Endpunkt</th>
                <th class="num-col">Status</th>
                <th class="num-col">ms</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="call in api?.recent_calls.slice(0, 15)" :key="call.id">
                <td class="mono">{{ fmtDate(call.created_at) }}</td>
                <td class="mono ttw-ellipsis">{{ call.method }} {{ call.endpoint }}</td>
                <td class="num-col mono">{{ call.status_code }}</td>
                <td class="num-col mono">{{ fmtNum(call.response_time_ms) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Letzte Web-Views</h2>
          <div class="section-hint">Pfad, Gerät, Status und Latenz.</div>
        </div>
      </div>
      <div v-if="!(site?.recent_views ?? []).length" class="ttw-empty">Keine Views.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Pfad</th>
              <th>Gerät</th>
              <th>Referrer</th>
              <th class="num-col">Status</th>
              <th class="num-col">ms</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="view in site?.recent_views.slice(0, 20)" :key="view.id">
              <td class="mono">{{ fmtDate(view.created_at) }}</td>
              <td class="mono">{{ view.path }}</td>
              <td>{{ view.device_type || '–' }}</td>
              <td class="ttw-ellipsis">{{ view.referrer || 'direkt' }}</td>
              <td class="num-col mono">{{ view.status_code }}</td>
              <td class="num-col mono">{{ fmtNum(view.response_time_ms) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Bot-Sessions</h2>
          <div class="section-hint">Telegram-Logins, Mini-App-Sessions und Bot-Aktionen.</div>
        </div>
        <span class="status-tag">{{ botSessions.length }} SESSIONS</span>
      </div>
      <div v-if="!botSessions.length" class="ttw-empty">Keine Bot-Sessions.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Typ</th>
              <th>Telegram</th>
              <th>Status</th>
              <th>Zuletzt aktiv</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="session in botSessions.slice(0, 25)" :key="session.id">
              <td class="mono">{{ fmtDate(session.created_at) }}</td>
              <td class="mono">{{ display(session.session_type) }}</td>
              <td>
                {{ display(session.username || session.first_name) }}
                <span v-if="session.telegram_id" class="mono muted"> · {{ session.telegram_id }}</span>
              </td>
              <td>
                <span class="ttw-status" :class="statusClass(session.status)">
                  <span class="ttw-status-dot"></span>
                  {{ display(session.status).toUpperCase() }}
                </span>
              </td>
              <td class="mono">{{ fmtDate(session.last_active_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Login-Challenges</h2>
          <div class="section-hint">Letzte Telegram-Login-Anfragen. Codes werden nicht angezeigt.</div>
        </div>
        <span class="status-tag">{{ challenges.length }} CHALLENGES</span>
      </div>
      <div v-if="!challenges.length" class="ttw-empty">Keine Challenges.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Anfrage</th>
              <th>Status</th>
              <th class="num-col">Versuche</th>
              <th>Erstellt</th>
              <th>Läuft ab</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="challenge in challenges.slice(0, 20)" :key="challenge.challenge_id">
              <td class="mono ttw-ellipsis">{{ display(challenge.challenge_id) }}</td>
              <td class="mono">{{ display(challenge.client_info || challenge.admin_label) }}</td>
              <td>
                <span class="ttw-status" :class="statusClass(challenge.status)">
                  <span class="ttw-status-dot"></span>
                  {{ display(challenge.status).toUpperCase() }}
                </span>
              </td>
              <td class="num-col mono">{{ fmtNum(challenge.attempts) }}</td>
              <td class="mono">{{ fmtDate(challenge.created_at) }}</td>
              <td class="mono">{{ fmtDate(challenge.expires_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>TikTok-Worker</h2>
          <div class="section-hint">Alle Streamer mit Monitoring-Status und Session-Werten.</div>
        </div>
        <span class="status-tag">{{ workers.length }} WORKER</span>
      </div>
      <div v-if="!workers.length" class="ttw-empty">Keine Worker-Daten.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Streamer</th>
              <th>Status</th>
              <th class="num-col">Live</th>
              <th class="num-col">Gifts</th>
              <th class="num-col">Reconnects</th>
              <th>Verbunden seit</th>
              <th>Letzter Fehler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="worker in workers.slice(0, 30)" :key="worker.id">
              <td>@{{ worker.username }}</td>
              <td>
                <span class="ttw-status" :class="statusClass(worker.status)">
                  <span class="ttw-status-dot"></span>
                  {{ display(worker.status).toUpperCase() }}
                </span>
              </td>
              <td class="num-col mono">{{ worker.is_live ? 'JA' : '–' }}</td>
              <td class="num-col mono">{{ fmtNum(worker.gifts_received_session) }}</td>
              <td class="num-col mono">{{ fmtNum(worker.reconnect_count) }}</td>
              <td class="mono">{{ fmtDate(worker.connected_since) }}</td>
              <td class="mono muted">{{ display(worker.last_error) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Telegram-Diagnostics</h2>
          <div class="section-hint">Bot-Zustand, Whitelist und letzte Meldungen.</div>
        </div>
      </div>
      <dl class="ttw-kv">
        <div>
          <dt>Status</dt>
          <dd>{{ display(telegram.state) }}</dd>
        </div>
        <div>
          <dt>Bot</dt>
          <dd>{{ telegram.bot_username ? `@${display(telegram.bot_username)}` : '–' }}</dd>
        </div>
        <div>
          <dt>Zugriffsmodus</dt>
          <dd>{{ display(telegram.access_mode) }}</dd>
        </div>
        <div>
          <dt>Freigegeben</dt>
          <dd>{{ fmtNum(telegram.allowed_users_count) }}</dd>
        </div>
        <div>
          <dt>Wartend</dt>
          <dd>{{ fmtNum(telegram.pending_users_count) }}</dd>
        </div>
        <div>
          <dt>Letzter Report</dt>
          <dd>{{ fmtDate(telegram.last_report_sent_at) }}</dd>
        </div>
        <div>
          <dt>Letzter Fehler</dt>
          <dd>{{ display(telegram.last_error) }}</dd>
        </div>
      </dl>
      <pre v-if="telegram.logs?.length" class="report-preview report-preview--small">{{ telegram.logs.slice(-8).join('\n') }}</pre>
    </section>
  </div>
</template>
