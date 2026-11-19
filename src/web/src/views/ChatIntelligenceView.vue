<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { downloadFile, apiGet } from '@/api/client';
import type {
  ChatAnalysis,
  ChatAnalysisResponse,
  ChatLogsResponse,
  ChatMessage,
  ChatSession,
  ChatSessionsResponse,
} from '@/api/types';
import StatCard from '@/components/StatCard.vue';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtNum } from '@/utils/format';

const toast = useToastStore();

const sessions = ref<ChatSession[]>([]);
const selectedSessionId = ref<number | null>(null);
const streamerFilter = ref('');
const statusFilter = ref('');
const analysis = ref<ChatAnalysis | null>(null);
const messages = ref<ChatMessage[]>([]);
const loading = ref(false);
const detailLoading = ref(false);
const error = ref('');

const statusOptions = [
  { value: '', label: 'Alle Sessions' },
  { value: 'active', label: 'Aktiv' },
  { value: 'ended', label: 'Beendet' },
];

const streamerOptions = computed(() => {
  const seen = new Map<number, string>();
  for (const session of sessions.value) {
    if (session.streamer_id && !seen.has(session.streamer_id)) {
      seen.set(session.streamer_id, session.streamer_username ?? `#${session.streamer_id}`);
    }
  }
  return Array.from(seen.entries()).map(([id, username]) => ({ id, username }));
});

const selectedSession = computed(
  () => sessions.value.find((session) => session.id === selectedSessionId.value) ?? null,
);

const exportSuffix = computed(() =>
  selectedSessionId.value ? `-session-${selectedSessionId.value}` : '-all',
);

async function loadSessions(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({ limit: '80' });
    if (streamerFilter.value) params.set('streamer_id', streamerFilter.value);
    if (statusFilter.value) params.set('status', statusFilter.value);
    const payload = await apiGet<ChatSessionsResponse>(
      `/api/chat-intelligence/sessions?${params.toString()}`,
    );
    sessions.value = payload.sessions;
    if (!sessions.value.some((session) => session.id === selectedSessionId.value)) {
      selectedSessionId.value = sessions.value[0]?.id ?? null;
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Sessions konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

async function loadSelected(): Promise<void> {
  if (!selectedSessionId.value) {
    analysis.value = null;
    messages.value = [];
    return;
  }
  detailLoading.value = true;
  try {
    const params = new URLSearchParams({
      session_id: String(selectedSessionId.value),
      period: 'all',
    });
    const messageParams = new URLSearchParams({
      session_id: String(selectedSessionId.value),
      limit: '200',
      order_dir: 'ASC',
    });
    const [analysisPayload, logsPayload] = await Promise.all([
      apiGet<ChatAnalysisResponse>(`/api/chat-intelligence/analysis?${params.toString()}`),
      apiGet<ChatLogsResponse>(`/api/chat-logs?${messageParams.toString()}`),
    ]);
    analysis.value = analysisPayload.data;
    messages.value = logsPayload.messages;
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Chat-Daten konnten nicht geladen werden.', 'error');
  } finally {
    detailLoading.value = false;
  }
}

async function exportChat(format: 'csv' | 'txt' | 'json'): Promise<void> {
  try {
    const params = new URLSearchParams({ format });
    if (selectedSessionId.value) params.set('session_id', String(selectedSessionId.value));
    if (streamerFilter.value) params.set('streamer_id', streamerFilter.value);
    await downloadFile(
      `/api/chat-intelligence/export?${params.toString()}`,
      `chat${exportSuffix.value}.${format}`,
    );
    toast.push('Export gestartet.', 'success');
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Export fehlgeschlagen.', 'error');
  }
}

watch([streamerFilter, statusFilter], () => {
  void loadSessions();
});

watch(selectedSessionId, () => {
  void loadSelected();
});

onMounted(async () => {
  await loadSessions();
  await loadSelected();
});
</script>

<template>
  <div class="container">
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">TOKTRACKER / CHAT INTELLIGENCE</p>
        <h2>Chat-Intelligence</h2>
        <p class="section-hint">Session-Analyse, Trends und Chatlog-Export.</p>
      </div>
      <div class="toolbar-controls">
        <select v-model="streamerFilter" aria-label="Streamer">
          <option value="">Alle Streamer</option>
          <option v-for="streamer in streamerOptions" :key="streamer.id" :value="String(streamer.id)">
            @{{ streamer.username }}
          </option>
        </select>
        <select v-model="statusFilter" aria-label="Status">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button type="button" :disabled="loading" @click="loadSessions">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="summary-bar">
      <StatCard label="Nachrichten" :value="fmtNum(analysis?.total_messages)" :sub="selectedSession ? `Session #${selectedSession.id}` : 'keine Session'" accent />
      <StatCard label="Chatter" :value="fmtNum(analysis?.unique_chatters)" :sub="`${fmtNum(analysis?.chatter_diversity_pct)}% Diversität`" />
      <StatCard label="Whale-Nachrichten" :value="fmtNum(analysis?.whale_messages)" />
      <StatCard label="Ø Zeichen" :value="fmtNum(analysis?.avg_chars_per_msg)" />
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Sessions</h2>
          <div class="section-hint">Eine Session auswählen, um Analyse und Chatlog zu laden.</div>
        </div>
        <span class="status-tag">{{ sessions.length }} SESSIONS</span>
      </div>

      <div v-if="!sessions.length && !loading" class="ttw-empty">Keine Chat-Sessions gefunden.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Streamer</th>
              <th>Start</th>
              <th>Ende</th>
              <th class="num-col">Peak</th>
              <th class="num-col">Chats</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="session in sessions"
              :key="session.id"
              :class="{ 'is-selected': session.id === selectedSessionId }"
            >
              <td>
                <input
                  type="radio"
                  name="chat-session"
                  :checked="session.id === selectedSessionId"
                  @change="selectedSessionId = session.id"
                />
              </td>
              <td>@{{ session.streamer_username }}</td>
              <td class="mono">{{ fmtDate(session.started_at) }}</td>
              <td class="mono">{{ fmtDate(session.ended_at) }}</td>
              <td class="num-col mono">{{ fmtNum(session.peak_viewers) }}</td>
              <td class="num-col mono">{{ fmtNum(session.chat_count) }}</td>
              <td>{{ session.status || '–' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="ttw-chart-grid">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Top-Wörter</h2>
            <div class="section-hint">Häufigste Begriffe in der Session.</div>
          </div>
        </div>
        <div v-if="detailLoading" class="ttw-empty">Analyse wird geladen…</div>
        <div v-else-if="!(analysis?.words ?? []).length" class="ttw-empty">Keine Wörter.</div>
        <div v-else class="ttw-word-cloud">
          <span
            v-for="word in analysis?.words"
            :key="word.text"
            class="ttw-word"
            :style="{ fontSize: `${Math.min(22, 11 + Number(word.weight ?? word.count) / 4)}px` }"
          >
            {{ word.text }} <i>{{ word.count }}</i>
          </span>
        </div>
      </section>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Phrasen &amp; Emojis</h2>
            <div class="section-hint">Wiederkehrende Kombinationen.</div>
          </div>
        </div>
        <div v-if="!(analysis?.phrases ?? []).length" class="ttw-empty">Keine Phrasen.</div>
        <ul v-else class="ttw-mini-list">
          <li v-for="phrase in analysis?.phrases.slice(0, 12)" :key="phrase.phrase">
            <span>{{ phrase.phrase }}</span>
            <span class="mono">{{ phrase.count }}×</span>
          </li>
        </ul>
        <div class="ttw-emoji-row">
          <span v-for="emoji in analysis?.emojis.slice(0, 16)" :key="emoji.emoji" :title="`${emoji.count}×`">
            {{ emoji.emoji }}
          </span>
        </div>
      </section>
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Top-Chatter</h2>
          <div class="section-hint">Nach Nachrichtenanzahl.</div>
        </div>
      </div>
      <div v-if="!(analysis?.top_chatters ?? []).length" class="ttw-empty">Keine Chatter-Daten.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Chatter</th>
              <th class="num-col">Nachrichten</th>
              <th class="num-col">Anteil</th>
              <th>Whale</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="chatter in analysis?.top_chatters" :key="chatter.username">
              <td>{{ chatter.nickname || chatter.username }}</td>
              <td class="num-col mono">{{ fmtNum(chatter.count) }}</td>
              <td class="num-col mono">{{ fmtNum(chatter.pct) }}%</td>
              <td>
                <span v-if="chatter.is_whale" class="ttw-perm-badge is-grant">
                  {{ chatter.whale_tier || 'WHALE' }}
                </span>
                <span v-else class="muted">–</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Chatlog</h2>
          <div class="section-hint">
            {{ messages.length }} Nachrichten
            <span v-if="selectedSession"> · Session #{{ selectedSession.id }}</span>
          </div>
        </div>
        <div class="action-group">
          <button type="button" class="sm" @click="exportChat('csv')">CSV</button>
          <button type="button" class="sm" @click="exportChat('txt')">TXT</button>
          <button type="button" class="sm" @click="exportChat('json')">JSON</button>
        </div>
      </div>

      <div v-if="detailLoading" class="ttw-empty">Chatlog wird geladen…</div>
      <div v-else-if="!messages.length" class="ttw-empty">Keine Nachrichten in dieser Session.</div>
      <ul v-else class="ttw-chat-log">
        <li v-for="message in messages" :key="message.id">
          <span class="mono ttw-chat-time">{{ fmtDate(message.created_at) }}</span>
          <span class="ttw-chat-user">
            {{ message.nickname || message.username }}
            <span v-if="message.is_whale" class="ttw-perm-badge is-grant">WHALE</span>
          </span>
          <span class="ttw-chat-comment">{{ message.comment }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
