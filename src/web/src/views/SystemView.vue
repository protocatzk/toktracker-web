<script setup lang="ts">
import PageLoadingOverlay from '@/components/PageLoadingOverlay.vue';
import { computed, onMounted, ref } from 'vue';
import { apiGet, apiPost } from '@/api/client';
import type { DockerContainer, SystemHealth, SystemStatus } from '@/api/types';
import StatCard from '@/components/StatCard.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtDuration, fmtNum } from '@/utils/format';

const auth = useAuthStore();
const toast = useToastStore();

const status = ref<SystemStatus | null>(null);
const health = ref<SystemHealth | null>(null);
const loading = ref(false);
const error = ref('');
const sending = ref(false);

const alerts = computed(() => health.value?.alerts ?? []);
const containers = computed<DockerContainer[]>(() => health.value?.docker?.containers ?? []);
const workers = computed(() => status.value?.workers ?? []);
const telegramBot = computed<Record<string, unknown>>(() => status.value?.telegram_bot ?? {});
const host = computed<NonNullable<SystemHealth['host']>>(() => health.value?.host ?? {});
const database = computed<NonNullable<SystemHealth['database']>>(
  () => health.value?.database ?? {},
);
const canSendReport = computed(() => auth.can('reports.send'));

function workerValue(worker: Record<string, unknown>, key: string): unknown {
  return worker[key];
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '–';
  return String(value);
}

function stateClass(state?: string): string {
  if (state === 'running' || state === 'connected') return 'is-live';
  if (state === 'exited' || state === 'stopped') return 'is-offline';
  return 'is-tracking';
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const [statusPayload, healthPayload] = await Promise.all([
      apiGet<SystemStatus>('/api/system/status'),
      apiGet<SystemHealth>('/api/system/health?force_refresh=true'),
    ]);
    status.value = statusPayload;
    health.value = healthPayload;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Systemstatus konnte nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

async function sendReport(): Promise<void> {
  if (sending.value) return;
  sending.value = true;
  try {
    await apiPost('/api/v1/telegram/send-report?hours=24');
    toast.push('Report wurde an Telegram gesendet.', 'success');
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Report fehlgeschlagen.', 'error');
  } finally {
    sending.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="container">
    <PageLoadingOverlay v-if="loading && !status" variant="charts" :kpis="4" />
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">TOKTRACKER / SYSTEM</p>
        <h2>System &amp; Worker</h2>
        <p class="section-hint">Host-Ressourcen, Docker-Container, Worker und Telegram-Bot.</p>
      </div>
      <div class="toolbar-controls">
        <button type="button" :disabled="loading" @click="load">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
        <button
          v-if="canSendReport"
          type="button"
          class="primary"
          :disabled="sending"
          @click="sendReport"
        >
          {{ sending ? 'Sendet…' : '24h-Report senden' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div v-if="alerts.length" class="ttw-alert-stack">
      <div
        v-for="(alert, index) in alerts"
        :key="`${alert.type}-${index}`"
        class="status-banner"
        :class="alert.level === 'critical' ? 'error' : 'warning'"
      >
        <strong>{{ alert.type }}:</strong> {{ alert.message }}
      </div>
    </div>

    <div class="summary-bar">
      <StatCard
        label="Systemstatus"
        :value="health?.is_healthy ? 'OK' : 'PRÜFEN'"
        :sub="health?.timestamp ? fmtDate(health.timestamp) : '–'"
        :accent="health?.is_healthy"
      />
      <StatCard
        label="Festplatte"
        :value="`${fmtNum(host.disk?.percent)}%`"
        :sub="`${fmtNum(host.disk?.free_gb)} GB frei`"
      />
      <StatCard
        label="RAM"
        :value="`${fmtNum(host.memory?.percent)}%`"
        :sub="`${fmtNum(host.memory?.free_mb)} MB frei`"
      />
      <StatCard
        label="CPU"
        :value="`${fmtNum(host.cpu?.percent)}%`"
        :sub="`${fmtNum(host.cpu?.cores)} Kerne`"
      />
    </div>

    <div class="ttw-chart-grid">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Worker</h2>
            <div class="section-hint">
              {{ fmtNum(status?.workers_running) }} aktiv ·
              {{ fmtNum(status?.workers_connected) }} verbunden ·
              {{ fmtNum(status?.workers_stalled) }} stalled
            </div>
          </div>
          <span class="status-tag">{{ workers.length }} WORKER</span>
        </div>

        <div v-if="!workers.length" class="ttw-empty">Keine Worker gemeldet.</div>
        <div v-else class="table-wrap table-responsive">
          <table>
            <thead>
              <tr>
                <th>Streamer</th>
                <th>State</th>
                <th class="num-col">Verbunden</th>
                <th class="num-col">Gifts</th>
                <th class="num-col">Coins</th>
                <th class="num-col">Reconnects</th>
                <th>Fehler</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="worker in workers" :key="String(worker.streamer_id)">
                <td class="mono">@{{ worker.username }}</td>
                <td>
                  <span class="ttw-status" :class="stateClass(String(worker.state))">
                    <span class="ttw-status-dot"></span>
                    {{ String(worker.state ?? '–').toUpperCase() }}
                  </span>
                </td>
                <td class="num-col mono">
                  {{ fmtDuration(Number(workerValue(worker, 'connected_for_seconds') ?? 0)) }}
                </td>
                <td class="num-col mono">{{ fmtNum(workerValue(worker, 'gifts_received_session')) }}</td>
                <td class="num-col mono">{{ fmtNum(workerValue(worker, 'coins_received_session')) }}</td>
                <td class="num-col mono">{{ fmtNum(workerValue(worker, 'reconnect_attempts')) }}</td>
                <td class="mono muted">{{ display(workerValue(worker, 'last_error')) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Datenbank</h2>
            <div class="section-hint">Speicher und Tabellen.</div>
          </div>
        </div>
        <dl class="ttw-kv">
          <div>
            <dt>Engine</dt>
            <dd>{{ database.engine || '–' }}</dd>
          </div>
          <div>
            <dt>Datenbank</dt>
            <dd>{{ database.database_name || '–' }}</dd>
          </div>
          <div>
            <dt>Gesamt</dt>
            <dd>{{ fmtNum(database.total_mb) }} MB</dd>
          </div>
          <div>
            <dt>Daten</dt>
            <dd>{{ fmtNum(database.data_mb) }} MB</dd>
          </div>
          <div>
            <dt>Indexe</dt>
            <dd>{{ fmtNum(database.index_mb) }} MB</dd>
          </div>
          <div>
            <dt>Tabellen</dt>
            <dd>{{ fmtNum(database.table_count) }}</dd>
          </div>
        </dl>
      </section>
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Docker-Container</h2>
          <div class="section-hint">
            {{ health?.docker?.available ? 'Docker-API verfügbar' : 'Docker-API nicht verfügbar' }}
          </div>
        </div>
        <span class="status-tag">{{ containers.length }} CONTAINER</span>
      </div>

      <div v-if="health?.docker?.error" class="status-banner warning">{{ health.docker.error }}</div>
      <div v-if="!containers.length" class="ttw-empty">Keine Container-Daten.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Container</th>
              <th>Image</th>
              <th>State</th>
              <th class="num-col">RAM</th>
              <th class="num-col">CPU</th>
              <th class="num-col">RW</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="container in containers" :key="container.id ?? container.name">
              <td>
                <strong>{{ container.display_name || container.name }}</strong>
                <div v-if="container.status" class="mono muted">{{ container.status }}</div>
              </td>
              <td class="mono ttw-ellipsis">{{ container.image }}</td>
              <td>
                <span class="ttw-status" :class="stateClass(container.state)">
                  <span class="ttw-status-dot"></span>
                  {{ String(container.state ?? '–').toUpperCase() }}
                </span>
              </td>
              <td class="num-col mono">
                {{ fmtNum(container.memory_used_mb) }} / {{ fmtNum(container.memory_limit_mb) }} MB
              </td>
              <td class="num-col mono">{{ fmtNum(container.cpu_percent) }}%</td>
              <td class="num-col mono">{{ fmtNum(container.size_rw_mb) }} MB</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Telegram-Bot</h2>
          <div class="section-hint">Verbindung, Whitelist und letzte Meldung.</div>
        </div>
      </div>
      <dl class="ttw-kv">
        <div>
          <dt>Status</dt>
          <dd>{{ display(telegramBot.state) }}</dd>
        </div>
        <div>
          <dt>Bot</dt>
          <dd>{{ telegramBot.bot_username ? `@${display(telegramBot.bot_username)}` : '–' }}</dd>
        </div>
        <div>
          <dt>SDK</dt>
          <dd>{{ telegramBot.sdk_available ? 'VERFÜGBAR' : 'FEHLT' }}</dd>
        </div>
        <div>
          <dt>Freigegeben</dt>
          <dd>{{ fmtNum(telegramBot.allowed_users_count) }}</dd>
        </div>
        <div>
          <dt>Wartend</dt>
          <dd>{{ fmtNum(telegramBot.pending_users_count) }}</dd>
        </div>
        <div>
          <dt>Letzter Report</dt>
          <dd>{{ fmtDate(display(telegramBot.last_report_sent_at)) }}</dd>
        </div>
        <div>
          <dt>Letzter Fehler</dt>
          <dd>{{ display(telegramBot.last_error) }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
