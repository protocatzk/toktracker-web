<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from '@/api/client';
import type {
  DashboardOverview,
  GroupsResponse,
  RecentGift,
  StreamerGroup,
  StreamerOverview,
} from '@/api/types';
import ModalDialog from '@/components/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtDuration, fmtEUR, fmtNum, fmtUSD } from '@/utils/format';

interface GiftBreakdownRow {
  gift_name?: string;
  diamond_count?: number;
  total_quantity?: number;
  total_coins?: number;
  usd_net?: number;
  eur_net?: number;
  events_count?: number;
}

interface GifterRow {
  sender_username?: string;
  sender_nickname?: string;
  total_coins?: number;
  gifts_sent?: number;
  eur_net?: number;
  is_super_fan?: boolean;
}

interface SessionRow {
  id?: number;
  started_at?: string;
  ended_at?: string;
  status?: string;
  peak_viewers?: number;
  diamonds_collected?: number;
}

interface StreamerDetail {
  streamer: StreamerOverview;
  summary: Record<string, number | string | undefined>;
  gift_breakdown: GiftBreakdownRow[];
  top_gifters: GifterRow[];
  sessions: SessionRow[];
  recent_events: RecentGift[];
}

const auth = useAuthStore();
const toast = useToastStore();

const period = ref('all');
const overview = ref<DashboardOverview | null>(null);
const groups = ref<StreamerGroup[]>([]);
const loading = ref(false);
const error = ref('');

const createOpen = ref(false);
const createSaving = ref(false);
const createError = ref('');
const createForm = reactive({
  username: '',
  display_name: '',
  auto_track: true,
  auto_reconnect: true,
});

const detailOpen = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const detail = ref<StreamerDetail | null>(null);
const detailStreamer = ref<StreamerOverview | null>(null);

const groupOpen = ref(false);
const groupSaving = ref(false);
const groupError = ref('');
const groupEditing = ref<StreamerGroup | null>(null);
const groupForm = reactive({
  name: '',
  description: '',
  color: '#58a6ff',
  streamer_ids: [] as number[],
});

const canManage = computed(() => auth.can('streamers.manage'));
const streamers = computed(() => overview.value?.streamers ?? []);

const periodOptions = [
  { value: 'today', label: 'Heute' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamt' },
];

const workerRows = computed(() =>
  streamers.value.filter((streamer) => streamer.worker_diagnostics),
);

const summary = computed(() => detail.value?.summary ?? {});

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const [overviewPayload, groupsPayload] = await Promise.all([
      apiGet<DashboardOverview>(`/api/overview?period=${encodeURIComponent(period.value)}`),
      apiGet<GroupsResponse>('/api/streamer-groups'),
    ]);
    overview.value = overviewPayload;
    groups.value = groupsPayload.groups;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Streamer konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  createForm.username = '';
  createForm.display_name = '';
  createForm.auto_track = true;
  createForm.auto_reconnect = true;
  createError.value = '';
  createOpen.value = true;
}

async function createStreamer(): Promise<void> {
  if (createSaving.value) return;
  createSaving.value = true;
  createError.value = '';
  try {
    await apiPost('/api/streamers', {
      username: createForm.username.trim(),
      display_name: createForm.display_name.trim() || null,
      auto_track: createForm.auto_track,
      auto_reconnect: createForm.auto_reconnect,
    });
    toast.push('Streamer angelegt.', 'success');
    createOpen.value = false;
    await load();
  } catch (caught) {
    createError.value =
      caught instanceof ApiError || caught instanceof Error
        ? caught.message
        : 'Streamer konnte nicht angelegt werden.';
  } finally {
    createSaving.value = false;
  }
}

async function toggleTracking(streamer: StreamerOverview): Promise<void> {
  try {
    await apiPost(`/api/streamers/${streamer.id}/track`, {
      action: 'toggle',
      auto_reconnect: true,
    });
    toast.push(`Tracking für @${streamer.username} umgeschaltet.`, 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Tracking fehlgeschlagen.', 'error');
  }
}

async function refreshStreamer(streamer: StreamerOverview): Promise<void> {
  try {
    await apiPost(`/api/streamers/${streamer.id}/refresh`);
    toast.push(`Profil von @${streamer.username} aktualisiert.`, 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Refresh fehlgeschlagen.', 'error');
  }
}

async function removeStreamer(streamer: StreamerOverview): Promise<void> {
  if (!window.confirm(`Streamer @${streamer.username} wirklich löschen?`)) return;
  try {
    await apiDelete(`/api/streamers/${streamer.id}`);
    toast.push('Streamer gelöscht.', 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Löschen fehlgeschlagen.', 'error');
  }
}

async function openDetail(streamer: StreamerOverview): Promise<void> {
  detailStreamer.value = streamer;
  detail.value = null;
  detailError.value = '';
  detailOpen.value = true;
  detailLoading.value = true;
  try {
    detail.value = await apiGet<StreamerDetail>(
      `/api/streamers/${streamer.id}?period=${encodeURIComponent(period.value)}`,
    );
  } catch (caught) {
    detailError.value = caught instanceof Error ? caught.message : 'Details konnten nicht geladen werden.';
  } finally {
    detailLoading.value = false;
  }
}

function streamerStatus(streamer: StreamerOverview): { label: string; className: string } {
  const state = String(streamer.worker_diagnostics?.state ?? streamer.monitor_status ?? '');
  if (streamer.is_live || state === 'connected') return { label: 'LIVE', className: 'is-live' };
  if (streamer.is_tracking_active || streamer.is_tracking) {
    return { label: 'TRACKING', className: 'is-tracking' };
  }
  return { label: 'OFFLINE', className: 'is-offline' };
}

function workerState(streamer: StreamerOverview): string {
  return String(streamer.worker_diagnostics?.state ?? streamer.monitor_status ?? 'stopped');
}

function workerStateClass(streamer: StreamerOverview): string {
  const state = workerState(streamer);
  if (state === 'connected') return 'is-live';
  if (state === 'running' || state === 'connecting' || state === 'backoff') return 'is-tracking';
  return 'is-offline';
}

function diag(streamer: StreamerOverview, key: string): unknown {
  return (streamer.worker_diagnostics as Record<string, unknown> | null | undefined)?.[key];
}

function openGroupCreate(): void {
  groupEditing.value = null;
  groupForm.name = '';
  groupForm.description = '';
  groupForm.color = '#58a6ff';
  groupForm.streamer_ids = [];
  groupError.value = '';
  groupOpen.value = true;
}

function openGroupEdit(group: StreamerGroup): void {
  groupEditing.value = group;
  groupForm.name = group.name;
  groupForm.description = group.description;
  groupForm.color = group.color || '#58a6ff';
  groupForm.streamer_ids = [...group.streamer_ids];
  groupError.value = '';
  groupOpen.value = true;
}

function toggleGroupMember(id: number): void {
  if (groupForm.streamer_ids.includes(id)) {
    groupForm.streamer_ids = groupForm.streamer_ids.filter((entry) => entry !== id);
  } else {
    groupForm.streamer_ids.push(id);
  }
}

function selectAllMembers(): void {
  groupForm.streamer_ids = streamers.value.map((streamer) => Number(streamer.id));
}

function clearMembers(): void {
  groupForm.streamer_ids = [];
}

async function saveGroup(): Promise<void> {
  if (groupSaving.value) return;
  groupSaving.value = true;
  groupError.value = '';
  try {
    if (groupEditing.value) {
      await apiPut(`/api/streamer-groups/${groupEditing.value.id}`, {
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        color: groupForm.color,
      });
      await apiPut(`/api/streamer-groups/${groupEditing.value.id}/members`, {
        streamer_ids: groupForm.streamer_ids,
      });
      toast.push('Gruppe aktualisiert.', 'success');
    } else {
      await apiPost('/api/streamer-groups', {
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        color: groupForm.color,
        streamer_ids: groupForm.streamer_ids,
      });
      toast.push('Gruppe angelegt.', 'success');
    }
    groupOpen.value = false;
    await load();
  } catch (caught) {
    groupError.value =
      caught instanceof ApiError || caught instanceof Error
        ? caught.message
        : 'Gruppe konnte nicht gespeichert werden.';
  } finally {
    groupSaving.value = false;
  }
}

async function removeGroup(group: StreamerGroup): Promise<void> {
  if (!window.confirm(`Gruppe „${group.name}“ wirklich löschen?`)) return;
  try {
    await apiDelete(`/api/streamer-groups/${group.id}`);
    toast.push('Gruppe gelöscht.', 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Löschen fehlgeschlagen.', 'error');
  }
}

function groupMemberNames(group: StreamerGroup): string {
  const names = group.streamer_ids
    .map((id) => streamers.value.find((streamer) => Number(streamer.id) === id))
    .filter(Boolean)
    .map((streamer) => `@${streamer!.username}`);
  return names.join(', ') || 'Keine Mitglieder';
}

watch(period, () => {
  void load();
});
onMounted(load);
</script>

<template>
  <div class="container">
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">TOKTRACKER / STREAMERS</p>
        <h2>Streamer &amp; Gruppen</h2>
        <p class="section-hint">Profile, Tracking, Gruppen und Worker-Diagnose.</p>
      </div>
      <div class="toolbar-controls">
        <select v-model="period" aria-label="Zeitraum">
          <option v-for="option in periodOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button type="button" :disabled="loading" @click="load">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
        <button v-if="canManage" type="button" class="primary" @click="openCreate">
          Streamer hinzufügen
        </button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Streamer</h2>
          <div class="section-hint">Tracking starten/stoppen, Profil aktualisieren oder löschen.</div>
        </div>
        <span class="status-tag">{{ streamers.length }} PROFILE</span>
      </div>

      <div v-if="!streamers.length && !loading" class="ttw-empty">Noch keine Streamer angelegt.</div>

      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Streamer</th>
              <th>Status</th>
              <th class="num-col">Follower</th>
              <th class="num-col">Viewer</th>
              <th class="num-col">Coins</th>
              <th class="num-col">Netto EUR</th>
              <th>Aktionen</th>
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
                <span class="ttw-status" :class="streamerStatus(streamer).className">
                  <span class="ttw-status-dot"></span>
                  {{ streamerStatus(streamer).label }}
                </span>
              </td>
              <td class="num-col mono">{{ fmtNum(streamer.follower_count) }}</td>
              <td class="num-col mono">{{ fmtNum(streamer.current_viewers) }}</td>
              <td class="num-col mono">{{ fmtNum(streamer.total_coins) }}</td>
              <td class="num-col mono">{{ fmtEUR(streamer.eur_net) }}</td>
              <td>
                <div class="action-group">
                  <button type="button" class="sm" @click="openDetail(streamer)">Details</button>
                  <button
                    v-if="canManage"
                    type="button"
                    class="sm"
                    @click="toggleTracking(streamer)"
                  >
                    {{ streamer.is_tracking_active || streamer.is_tracking ? 'Stop' : 'Track' }}
                  </button>
                  <button
                    v-if="canManage"
                    type="button"
                    class="sm"
                    @click="refreshStreamer(streamer)"
                  >
                    Refresh
                  </button>
                  <button
                    v-if="canManage"
                    type="button"
                    class="sm danger"
                    @click="removeStreamer(streamer)"
                  >
                    Löschen
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Gruppen</h2>
          <div class="section-hint">Gruppen bündeln Streamer als Analyse-Scope.</div>
        </div>
        <button v-if="canManage" type="button" class="sm" @click="openGroupCreate">
          Gruppe anlegen
        </button>
      </div>

      <div v-if="!groups.length" class="ttw-empty">Noch keine Gruppen.</div>
      <div v-else class="ttw-group-grid">
        <article v-for="group in groups" :key="group.id" class="ttw-group-card">
          <div class="ttw-group-head">
            <span class="ttw-group-dot" :style="{ background: group.color || 'var(--accent)' }"></span>
            <strong>{{ group.name }}</strong>
            <span class="mono muted">{{ group.member_count }} MITGLIEDER</span>
          </div>
          <p class="ttw-group-desc">{{ group.description || 'Keine Beschreibung.' }}</p>
          <p class="ttw-group-members mono">{{ groupMemberNames(group) }}</p>
          <div class="action-group">
            <button type="button" class="sm" @click="openGroupEdit(group)">
              {{ canManage ? 'Bearbeiten' : 'Ansehen' }}
            </button>
            <button
              v-if="canManage"
              type="button"
              class="sm danger"
              @click="removeGroup(group)"
            >
              Löschen
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Worker-Diagnose</h2>
          <div class="section-hint">Aktive TikTok-Worker und ihre letzte Meldung.</div>
        </div>
        <span class="status-tag">{{ workerRows.length }} WORKER</span>
      </div>

      <div v-if="!workerRows.length" class="ttw-empty">Keine aktiven Worker gemeldet.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Streamer</th>
              <th>State</th>
              <th class="num-col">Verbunden</th>
              <th class="num-col">Gifts (Session)</th>
              <th class="num-col">Reconnects</th>
              <th>Letzter Fehler</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="streamer in workerRows" :key="streamer.id">
              <td class="mono">@{{ streamer.username }}</td>
              <td>
                <span class="ttw-status" :class="workerStateClass(streamer)">
                  <span class="ttw-status-dot"></span>
                  {{ workerState(streamer).toUpperCase() }}
                </span>
              </td>
              <td class="num-col mono">
                {{ fmtDuration(Number(diag(streamer, 'connected_for_seconds') ?? 0)) }}
              </td>
              <td class="num-col mono">
                {{ fmtNum(diag(streamer, 'gifts_received_session')) }}
              </td>
              <td class="num-col mono">{{ fmtNum(diag(streamer, 'reconnect_attempts')) }}</td>
              <td class="mono muted">
                {{ diag(streamer, 'last_error') || '–' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ModalDialog :open="createOpen" title="Streamer hinzufügen" @close="createOpen = false">
      <form id="streamer-create-form" class="ttw-user-form" @submit.prevent="createStreamer">
        <div class="grid-2">
          <label class="ttw-field">
            <span>TikTok-Benutzername</span>
            <input v-model="createForm.username" placeholder="@username" required autocomplete="off" />
          </label>
          <label class="ttw-field">
            <span>Anzeigename (optional)</span>
            <input v-model="createForm.display_name" placeholder="Anzeigename" autocomplete="off" />
          </label>
        </div>
        <label class="checkbox-label">
          <input v-model="createForm.auto_track" type="checkbox" />
          Tracking sofort starten
        </label>
        <label class="checkbox-label">
          <input v-model="createForm.auto_reconnect" type="checkbox" />
          Automatisch neu verbinden, wenn offline
        </label>
        <div v-if="createError" class="status-banner error">{{ createError }}</div>
      </form>
      <template #footer>
        <button type="button" class="sm" :disabled="createSaving" @click="createOpen = false">
          Abbrechen
        </button>
        <button type="submit" form="streamer-create-form" class="primary sm" :disabled="createSaving">
          {{ createSaving ? 'Anlegen…' : 'Anlegen' }}
        </button>
      </template>
    </ModalDialog>

    <ModalDialog
      :open="detailOpen"
      :title="detailStreamer ? `@${detailStreamer.username}` : 'Streamer-Details'"
      wide
      @close="detailOpen = false"
    >
      <div v-if="detailLoading" class="ttw-empty">Details werden geladen…</div>
      <div v-else-if="detailError" class="status-banner error">{{ detailError }}</div>
      <div v-else-if="detail" class="ttw-detail">
        <div class="summary-bar">
          <div class="summary-box">
            <div class="label">Netto</div>
            <div class="val">{{ fmtEUR(summary.eur_net) }}</div>
            <div class="sub">{{ fmtUSD(summary.usd_net) }}</div>
          </div>
          <div class="summary-box">
            <div class="label">Coins</div>
            <div class="val">{{ fmtNum(summary.total_coins) }}</div>
          </div>
          <div class="summary-box">
            <div class="label">Geschenke</div>
            <div class="val">{{ fmtNum(summary.total_gifts_sent) }}</div>
            <div class="sub">{{ fmtNum(summary.gift_events_count) }} Events</div>
          </div>
          <div class="summary-box">
            <div class="label">Sessions</div>
            <div class="val">{{ fmtNum(detail.sessions.length) }}</div>
          </div>
        </div>

        <div class="ttw-detail-grid">
          <div>
            <h3 class="ttw-detail-title">Top-Geschenke</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Geschenk</th>
                    <th class="num-col">Anzahl</th>
                    <th class="num-col">Coins</th>
                    <th class="num-col">EUR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="gift in detail.gift_breakdown.slice(0, 15)" :key="gift.gift_name">
                    <td>{{ gift.gift_name }}</td>
                    <td class="num-col mono">{{ fmtNum(gift.total_quantity) }}</td>
                    <td class="num-col mono">{{ fmtNum(gift.total_coins) }}</td>
                    <td class="num-col mono">{{ fmtEUR(gift.eur_net) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="ttw-detail-title">Top-Spender</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Spender</th>
                    <th class="num-col">Coins</th>
                    <th class="num-col">EUR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="gifter in detail.top_gifters" :key="gifter.sender_username">
                    <td>
                      {{ gifter.sender_nickname || gifter.sender_username }}
                      <span v-if="gifter.is_super_fan" class="ttw-perm-badge is-grant">FAN</span>
                    </td>
                    <td class="num-col mono">{{ fmtNum(gifter.total_coins) }}</td>
                    <td class="num-col mono">{{ fmtEUR(gifter.eur_net) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <h3 class="ttw-detail-title">Sessions</h3>
        <div v-if="!detail.sessions.length" class="ttw-empty">Keine Sessions vorhanden.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Start</th>
                <th>Ende</th>
                <th>Status</th>
                <th class="num-col">Peak Viewer</th>
                <th class="num-col">Diamonds</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in detail.sessions" :key="session.id">
                <td class="mono">{{ fmtDate(session.started_at) }}</td>
                <td class="mono">{{ fmtDate(session.ended_at) }}</td>
                <td>{{ session.status || '–' }}</td>
                <td class="num-col mono">{{ fmtNum(session.peak_viewers) }}</td>
                <td class="num-col mono">{{ fmtNum(session.diamonds_collected) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <button type="button" class="sm" @click="detailOpen = false">Schließen</button>
      </template>
    </ModalDialog>

    <ModalDialog
      :open="groupOpen"
      :title="groupEditing ? `Gruppe „${groupEditing.name}“` : 'Neue Gruppe'"
      wide
      @close="groupOpen = false"
    >
      <form id="group-form" class="ttw-user-form" @submit.prevent="saveGroup">
        <div class="grid-2">
          <label class="ttw-field">
            <span>Name</span>
            <input v-model="groupForm.name" required maxlength="191" />
          </label>
          <label class="ttw-field">
            <span>Farbe</span>
            <input v-model="groupForm.color" type="color" />
          </label>
        </div>
        <label class="ttw-field">
          <span>Beschreibung</span>
          <input v-model="groupForm.description" maxlength="500" />
        </label>

        <div class="ttw-group-picker-head">
          <h3 class="ttw-detail-title">Mitglieder</h3>
          <div class="action-group">
            <button type="button" class="sm" @click="selectAllMembers">Alle</button>
            <button type="button" class="sm" @click="clearMembers">Keine</button>
          </div>
        </div>
        <div class="ttw-member-picker">
          <label v-for="streamer in streamers" :key="streamer.id" class="ttw-member-option">
            <input
              type="checkbox"
              :checked="groupForm.streamer_ids.includes(Number(streamer.id))"
              @change="toggleGroupMember(Number(streamer.id))"
            />
            <span>
              <strong>{{ streamer.display_name || streamer.username }}</strong>
              <span class="mono muted">@{{ streamer.username }}</span>
            </span>
          </label>
        </div>

        <div v-if="groupError" class="status-banner error">{{ groupError }}</div>
      </form>
      <template #footer>
        <button type="button" class="sm" :disabled="groupSaving" @click="groupOpen = false">
          Abbrechen
        </button>
        <button type="submit" form="group-form" class="primary sm" :disabled="groupSaving">
          {{ groupSaving ? 'Speichern…' : 'Speichern' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>
