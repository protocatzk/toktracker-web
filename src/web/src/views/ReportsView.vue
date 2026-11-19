<script setup lang="ts">
import {
  Check,
  Coins,
  Copy,
  FileText,
  Gift,
  RefreshCw,
  Send,
  Users,
  Wallet,
} from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { apiGet, apiPost } from '@/api/client';
import type { DailyReport, StreamerReportCard } from '@/api/types';
import AppButton from '@/components/AppButton.vue';
import AppEmpty from '@/components/AppEmpty.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import PageLoadingOverlay from '@/components/PageLoadingOverlay.vue';
import SkeletonList from '@/components/SkeletonList.vue';
import StatCard from '@/components/StatCard.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtEUR, fmtNum, fmtUSD } from '@/utils/format';

const auth = useAuthStore();
const toast = useToastStore();

const hours = ref(24);
const report = ref<DailyReport | null>(null);
const loading = ref(false);
const error = ref('');
const view = ref<'overview' | 'markdown'>('overview');
const copied = ref(false);

const sendOpen = ref(false);
const sending = ref(false);
const chatId = ref('');

const streamerReportOpen = ref(false);
const streamerReportLoading = ref(false);
const streamerReportError = ref('');
const streamerReport = ref<StreamerReportCard | null>(null);
const streamerReportName = ref('');

const hoursOptions = [
  { value: 24, label: '24 Stunden' },
  { value: 72, label: '3 Tage' },
  { value: 168, label: '7 Tage' },
  { value: 720, label: '30 Tage' },
];

const canSend = computed(() => auth.can('reports.send'));
const totals = computed(() => report.value?.totals ?? {});
const streamers = computed(() =>
  [...(report.value?.streamers ?? [])].sort((a, b) => b.period_coins - a.period_coins),
);

function statusOf(streamer: StreamerReportCard): { label: string; className: string } {
  if (streamer.is_live) return { label: 'LIVE', className: 'is-live' };
  if (streamer.is_tracking_active) return { label: 'TRACKING', className: 'is-tracking' };
  return { label: 'OFFLINE', className: 'is-offline' };
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    report.value = await apiGet<DailyReport>(`/api/v1/reports/daily?hours=${hours.value}`);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Report konnte nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

async function sendReport(): Promise<void> {
  if (sending.value) return;
  sending.value = true;
  try {
    const params = new URLSearchParams({ hours: String(hours.value) });
    if (chatId.value.trim()) params.set('chat_id', chatId.value.trim());
    await apiPost(`/api/v1/telegram/send-report?${params.toString()}`);
    toast.push('Report wurde an Telegram gesendet.', 'success');
    sendOpen.value = false;
    chatId.value = '';
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Report konnte nicht gesendet werden.', 'error');
  } finally {
    sending.value = false;
  }
}

async function copyMarkdown(): Promise<void> {
  if (!report.value) return;
  try {
    await navigator.clipboard.writeText(report.value.telegram_markdown);
    copied.value = true;
    toast.push('Markdown kopiert.', 'success');
    window.setTimeout(() => (copied.value = false), 2000);
  } catch {
    toast.push('Kopieren ist in diesem Browser nicht möglich.', 'error');
  }
}

async function openStreamerReport(streamer: StreamerReportCard): Promise<void> {
  streamerReportName.value = streamer.display_name || streamer.username;
  streamerReport.value = null;
  streamerReportError.value = '';
  streamerReportOpen.value = true;
  streamerReportLoading.value = true;
  try {
    streamerReport.value = await apiGet<StreamerReportCard>(
      `/api/v1/streamers/${streamer.streamer_id}/report?hours=${hours.value}`,
    );
  } catch (caught) {
    streamerReportError.value =
      caught instanceof Error ? caught.message : 'Streamer-Report konnte nicht geladen werden.';
  } finally {
    streamerReportLoading.value = false;
  }
}

watch(hours, () => {
  void load();
});
onMounted(load);
</script>

<template>
  <div class="container ui-page">
    <PageLoadingOverlay v-if="loading && !report" variant="table" :kpis="4" />

    <AppPageHeader
      eyebrow="TOKTRACKER / REPORTS"
      title="Reports"
      subtitle="Tagesreport, Streamer-Einzelreports und Telegram-Versand."
    >
      <template #meta>
        <span v-if="report?.generated_at" class="mono">
          Erstellt {{ fmtDate(report.generated_at) }} · {{ report.period_hours }}h
        </span>
      </template>
      <template #actions>
        <select v-model.number="hours" aria-label="Zeitraum">
          <option v-for="option in hoursOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <AppButton variant="secondary" :loading="loading" @click="load">
          <RefreshCw :size="15" />
          Aktualisieren
        </AppButton>
        <AppButton v-if="canSend" variant="primary" @click="sendOpen = true">
          <Send :size="15" />
          Report senden
        </AppButton>
      </template>
    </AppPageHeader>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="summary-bar">
      <StatCard label="Streamer" :value="Number(totals.streamers_count ?? 0)" :sub="`${fmtNum(totals.live_count)} live`" :icon="Users" />
      <StatCard label="Coins" :value="Number(totals.period_coins ?? 0)" :sub="`${fmtNum(totals.period_gifts_sent)} Geschenke`" :icon="Coins" />
      <StatCard label="Netto" :value="Number(totals.period_eur_net ?? 0)" :sub="fmtUSD(totals.period_usd_net)" :icon="Wallet" format="currencyEUR" accent />
      <StatCard label="Brutto" :value="Number(totals.period_eur_gross ?? 0)" :sub="fmtUSD(totals.period_usd_gross)" :icon="Gift" format="currencyEUR" />
    </div>

    <div class="ui-toolbar report-toolbar">
      <div class="ui-segmented">
        <button type="button" :class="{ active: view === 'overview' }" @click="view = 'overview'">
          <FileText :size="13" /> Übersicht
        </button>
        <button type="button" :class="{ active: view === 'markdown' }" @click="view = 'markdown'">
          <FileText :size="13" /> Markdown
        </button>
      </div>
      <span class="mono muted">{{ streamers.length }} Streamer im Report</span>
    </div>

    <template v-if="report">
      <section v-if="view === 'overview'" class="box">
        <div class="box-header">
          <div>
            <h2>Streamer-Report</h2>
            <div class="section-hint">Zeitraumwerte und All-Time-Vergleich.</div>
          </div>
          <span class="status-tag">{{ streamers.length }} STREAMER</span>
        </div>

        <AppEmpty v-if="!streamers.length" title="Keine Streamer im Report" :icon="Users" />
        <div v-else class="table-wrap table-responsive">
          <table>
            <thead>
              <tr>
                <th>Streamer</th>
                <th>Status</th>
                <th>Worker</th>
                <th class="num-col">Coins</th>
                <th class="num-col">Netto EUR</th>
                <th class="num-col">Gifts</th>
                <th class="num-col">Gifter</th>
                <th class="num-col">Peak</th>
                <th class="num-col">All-Time EUR</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="streamer in streamers" :key="streamer.streamer_id">
                <td>
                  <strong>{{ streamer.display_name || streamer.username }}</strong>
                  <div class="mono muted">@{{ streamer.username }}</div>
                </td>
                <td>
                  <span class="ttw-status" :class="statusOf(streamer).className">
                    <span class="ttw-status-dot"></span>
                    {{ statusOf(streamer).label }}
                  </span>
                </td>
                <td class="mono">{{ streamer.worker_state }}</td>
                <td class="num-col mono">{{ fmtNum(streamer.period_coins) }}</td>
                <td class="num-col mono">{{ fmtEUR(streamer.period_eur_net) }}</td>
                <td class="num-col mono">{{ fmtNum(streamer.period_gifts_sent) }}</td>
                <td class="num-col mono">{{ fmtNum(streamer.period_unique_gifters) }}</td>
                <td class="num-col mono">{{ fmtNum(streamer.period_peak_viewers) }}</td>
                <td class="num-col mono">{{ fmtEUR(streamer.alltime_eur_net) }}</td>
                <td>
                  <button type="button" class="sm" @click="openStreamerReport(streamer)">Report</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="box report-preview-box">
        <div class="box-header">
          <div>
            <h2>Markdown-Vorschau</h2>
            <div class="section-hint">Genau der Text, der an Telegram gehen würde.</div>
          </div>
          <button type="button" class="sm" @click="copyMarkdown">
            <Check v-if="copied" :size="14" />
            <Copy v-else :size="14" />
            {{ copied ? 'Kopiert' : 'Kopieren' }}
          </button>
        </div>
        <pre class="report-preview">{{ report.telegram_markdown }}</pre>
      </section>
    </template>

    <ModalDialog :open="sendOpen" title="Report senden" @close="sendOpen = false">
      <div class="ttw-user-form">
        <div class="status-banner info">
          Der Report wird über den TokTracker-Telegram-Bot versendet.
        </div>
        <label class="ttw-field">
          <span>Zeitraum</span>
          <select v-model.number="hours">
            <option v-for="option in hoursOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="ttw-field">
          <span>Ziel-Chat-ID (optional)</span>
          <input v-model="chatId" placeholder="Standard-Chat aus .env" />
        </label>
      </div>
      <template #footer>
        <button type="button" class="sm" :disabled="sending" @click="sendOpen = false">Abbrechen</button>
        <button type="button" class="primary sm" :disabled="sending" @click="sendReport">
          {{ sending ? 'Sendet…' : 'Jetzt senden' }}
        </button>
      </template>
    </ModalDialog>

    <ModalDialog
      :open="streamerReportOpen"
      :title="streamerReport ? `Report · ${streamerReportName}` : 'Streamer-Report'"
      wide
      @close="streamerReportOpen = false"
    >
      <SkeletonList v-if="streamerReportLoading" :rows="6" />
      <div v-else-if="streamerReportError" class="status-banner error">{{ streamerReportError }}</div>
      <div v-else-if="streamerReport" class="ttw-detail">
        <div class="summary-bar">
          <div class="summary-box">
            <div class="label">Coins</div>
            <div class="val">{{ fmtNum(streamerReport.period_coins) }}</div>
            <div class="sub">{{ fmtNum(streamerReport.period_gifts_sent) }} Geschenke</div>
          </div>
          <div class="summary-box">
            <div class="label">Netto</div>
            <div class="val">{{ fmtEUR(streamerReport.period_eur_net) }}</div>
            <div class="sub">{{ fmtUSD(streamerReport.period_usd_net) }}</div>
          </div>
          <div class="summary-box">
            <div class="label">Gifter</div>
            <div class="val">{{ fmtNum(streamerReport.period_unique_gifters) }}</div>
            <div class="sub">{{ fmtNum(streamerReport.period_sessions_count) }} Sessions</div>
          </div>
          <div class="summary-box">
            <div class="label">All-Time</div>
            <div class="val">{{ fmtEUR(streamerReport.alltime_eur_net) }}</div>
            <div class="sub">{{ fmtNum(streamerReport.alltime_coins) }} Coins</div>
          </div>
        </div>

        <div class="ttw-detail-grid">
          <div>
            <h3 class="ttw-detail-title">Top-Geschenke</h3>
            <div v-if="!(streamerReport.top_gifts ?? []).length" class="ttw-empty">Keine Daten.</div>
            <ul v-else class="ttw-mini-list">
              <li v-for="gift in streamerReport.top_gifts" :key="gift.gift_name">
                <span>{{ gift.gift_name }}</span>
                <span class="mono">{{ fmtNum(gift.total_coins) }} Coins</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="ttw-detail-title">Top-Spender</h3>
            <div v-if="!(streamerReport.top_gifters ?? []).length" class="ttw-empty">Keine Daten.</div>
            <ul v-else class="ttw-mini-list">
              <li v-for="gifter in streamerReport.top_gifters" :key="gifter.sender_username">
                <span>{{ gifter.sender_nickname || gifter.sender_username }}</span>
                <span class="mono">{{ fmtNum(gifter.total_coins) }} Coins</span>
              </li>
            </ul>
          </div>
        </div>

        <h3 class="ttw-detail-title">Telegram-Text</h3>
        <pre class="report-preview report-preview--small">{{ streamerReport.telegram_text }}</pre>
      </div>
      <template #footer>
        <button type="button" class="sm" @click="streamerReportOpen = false">Schließen</button>
      </template>
    </ModalDialog>
  </div>
</template>
