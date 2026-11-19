<script setup lang="ts">
import PageLoadingOverlay from '@/components/PageLoadingOverlay.vue';
import SkeletonList from '@/components/SkeletonList.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { apiGet } from '@/api/client';
import type {
  BattleDetail,
  BattleRow,
  BattleStats,
  BattlesResponse,
  GroupsResponse,
  LiveBattleEntry,
  StreamerGroup,
} from '@/api/types';
import ModalDialog from '@/components/ModalDialog.vue';
import StatCard from '@/components/StatCard.vue';
import { fmtDate, fmtDuration, fmtEUR, fmtNum } from '@/utils/format';

const period = ref('all');
const groupId = ref('');
const groups = ref<StreamerGroup[]>([]);
const resultFilter = ref('');
const modeFilter = ref('');
const search = ref('');
const appliedSearch = ref('');
const limit = 50;
const offset = ref(0);

const battles = ref<BattleRow[]>([]);
const liveBattles = ref<LiveBattleEntry[]>([]);
const stats = ref<BattleStats | null>(null);
const total = ref(0);
const loading = ref(false);
const error = ref('');

const detailOpen = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const detail = ref<BattleDetail | null>(null);
const detailBattle = ref<BattleRow | null>(null);

const periodOptions = [
  { value: 'today', label: 'Heute' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamt' },
];

const resultOptions = [
  { value: '', label: 'Alle Ergebnisse' },
  { value: 'WIN', label: 'Sieg' },
  { value: 'LOSE', label: 'Niederlage' },
  { value: 'DRAW', label: 'Unentschieden' },
  { value: 'ONGOING', label: 'Laufend' },
];

const modeOptions = [
  { value: '', label: 'Alle Modi' },
  { value: '1v1', label: '1v1' },
  { value: '2v2', label: '2v2' },
  { value: '1v1v1', label: '1v1v1' },
  { value: '1v1v1v1', label: '1v1v1v1' },
];

const page = computed(() => Math.floor(offset.value / limit) + 1);
const pages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

function battleTitle(battle: BattleRow): string {
  if (battle.is_internal && battle.streamer_a && battle.streamer_b) {
    return `${battle.streamer_a.username ?? 'A'} vs ${battle.streamer_b.username ?? 'B'}`;
  }
  if (battle.is_ffa && battle.participants?.length) {
    return battle.participants.map((participant) => participant.username).join(' · ');
  }
  const left = battle.streamer_username ?? 'Streamer';
  const right = battle.opponent_display_name ?? battle.opponent_username ?? 'Gegner';
  return `${left} vs ${right}`;
}

function battleScore(battle: BattleRow): string {
  if (battle.is_internal && battle.streamer_a && battle.streamer_b) {
    return `${fmtNum(battle.streamer_a.score)} : ${fmtNum(battle.streamer_b.score)}`;
  }
  return `${fmtNum(battle.streamer_score)} : ${fmtNum(battle.opponent_score)}`;
}

function resultOf(battle: BattleRow): string {
  return String(battle.result ?? battle.status ?? '–').toUpperCase();
}

function resultClass(battle: BattleRow): string {
  const result = resultOf(battle);
  if (result === 'WIN') return 'is-live';
  if (result === 'LOSE') return 'is-offline';
  if (result === 'ONGOING') return 'is-tracking';
  return '';
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const params = new URLSearchParams({
      period: period.value,
      limit: String(limit),
      offset: String(offset.value),
    });
    if (resultFilter.value) params.set('result', resultFilter.value);
    if (modeFilter.value) params.set('mode', modeFilter.value);
    if (appliedSearch.value) params.set('search', appliedSearch.value);
    if (groupId.value) params.set('group_id', groupId.value);

    const statsParams = new URLSearchParams({ period: period.value });
    if (groupId.value) statsParams.set('group_id', groupId.value);
    const [battlePayload, statsPayload, groupsPayload] = await Promise.all([
      apiGet<BattlesResponse>(`/api/battles?${params.toString()}`),
      apiGet<BattleStats>(`/api/battles/stats?${statsParams.toString()}`),
      apiGet<GroupsResponse>('/api/streamer-groups'),
    ]);
    battles.value = battlePayload.battles;
    liveBattles.value = battlePayload.live_active_battles;
    total.value = battlePayload.total;
    stats.value = statsPayload;
    groups.value = groupsPayload.groups;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Battles konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

function applyFilters(): void {
  appliedSearch.value = search.value.trim();
  offset.value = 0;
  void load();
}

function resetFilters(): void {
  resultFilter.value = '';
  modeFilter.value = '';
  search.value = '';
  appliedSearch.value = '';
  offset.value = 0;
  void load();
}

async function openDetail(battle: BattleRow): Promise<void> {
  detailBattle.value = battle;
  detail.value = null;
  detailError.value = '';
  detailOpen.value = true;
  detailLoading.value = true;
  try {
    detail.value = await apiGet<BattleDetail>(`/api/battles/${encodeURIComponent(String(battle.id))}`);
  } catch (caught) {
    detailError.value = caught instanceof Error ? caught.message : 'Battle konnte nicht geladen werden.';
  } finally {
    detailLoading.value = false;
  }
}

watch([period, groupId, resultFilter, modeFilter], () => {
  offset.value = 0;
  void load();
});

onMounted(load);
</script>

<template>
  <div class="container">
    <PageLoadingOverlay v-if="loading && !stats" variant="table" :kpis="4" />
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">TOKTRACKER / BATTLES</p>
        <h2>Battles</h2>
        <p class="section-hint">Live-Battles, Ergebnisse und Rivalen.</p>
      </div>
      <div class="toolbar-controls">
        <button type="button" :disabled="loading" @click="load">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="summary-bar">
      <StatCard label="Battles" :value="fmtNum(stats?.total_battles)" :sub="`${fmtNum(stats?.ongoing)} laufend`" />
      <StatCard
        label="Winrate"
        :value="`${fmtNum(stats?.winrate_pct)}%`"
        :sub="`${fmtNum(stats?.wins)} W · ${fmtNum(stats?.losses)} L · ${fmtNum(stats?.draws)} D`"
        accent
      />
      <StatCard label="Coins" :value="fmtNum(stats?.total_coins)" />
      <StatCard label="Netto" :value="fmtEUR(stats?.total_eur_net)" />
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Live-Battles</h2>
          <div class="section-hint">Aktuell laufende Battles der überwachten Streamer.</div>
        </div>
        <span class="status-tag">{{ liveBattles.length }} LIVE</span>
      </div>

      <div v-if="!liveBattles.length" class="ttw-empty">Keine laufenden Battles.</div>
      <div v-else class="ttw-battle-grid">
        <article v-for="entry in liveBattles" :key="`${entry.streamer_id}-${entry.battle?.id ?? 'live'}`" class="ttw-battle-card">
          <div class="ttw-battle-head">
            <span class="ttw-status is-live"><span class="ttw-status-dot"></span>LIVE</span>
            <strong>{{ entry.display_name || entry.username }}</strong>
          </div>
          <div class="ttw-battle-title">
            {{ entry.battle ? battleTitle(entry.battle) : 'Battle läuft' }}
          </div>
          <div class="ttw-battle-score">
            {{ entry.battle ? battleScore(entry.battle) : '–' }}
          </div>
          <div class="mono muted">
            {{ entry.battle?.battle_mode || entry.battle?.status || '' }}
          </div>
        </article>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Battle-Verlauf</h2>
          <div class="section-hint">Filter nach Zeitraum, Ergebnis, Modus und Gegner.</div>
        </div>
        <span class="status-tag">{{ total }} TREFFER</span>
      </div>

      <div class="toolbar-controls ttw-filter-bar">
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
        <select v-model="resultFilter" aria-label="Ergebnis">
          <option v-for="option in resultOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model="modeFilter" aria-label="Modus">
          <option v-for="option in modeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input
          v-model="search"
          placeholder="Gegner suchen…"
          @keyup.enter="applyFilters"
        />
        <button type="button" @click="applyFilters">Anwenden</button>
        <button type="button" class="sm" @click="resetFilters">Zurücksetzen</button>
      </div>

      <div v-if="!battles.length && !loading" class="ttw-empty">Keine Battles gefunden.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Battle</th>
              <th>Modus</th>
              <th>Score</th>
              <th>Ergebnis</th>
              <th class="num-col">Coins</th>
              <th class="num-col">EUR</th>
              <th class="num-col">Dauer</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="battle in battles" :key="battle.id">
              <td class="mono">{{ fmtDate(battle.started_at) }}</td>
              <td>{{ battleTitle(battle) }}</td>
              <td class="mono">{{ battle.battle_mode || '–' }}</td>
              <td class="mono">{{ battleScore(battle) }}</td>
              <td>
                <span class="ttw-status" :class="resultClass(battle)">
                  <span class="ttw-status-dot"></span>
                  {{ resultOf(battle) }}
                </span>
              </td>
              <td class="num-col mono">{{ fmtNum(battle.coins_earned ?? battle.total_coins) }}</td>
              <td class="num-col mono">{{ fmtEUR(battle.eur_net ?? battle.total_eur_net) }}</td>
              <td class="num-col mono">{{ fmtDuration(battle.duration_seconds) }}</td>
              <td>
                <button type="button" class="sm" @click="openDetail(battle)">Details</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="ttw-pagination">
        <button type="button" class="sm" :disabled="offset === 0 || loading" @click="offset = Math.max(0, offset - limit); load()">
          ← Zurück
        </button>
        <span class="mono muted">Seite {{ page }} / {{ pages }}</span>
        <button
          type="button"
          class="sm"
          :disabled="offset + limit >= total || loading"
          @click="offset += limit; load()"
        >
          Weiter →
        </button>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Rivalen</h2>
          <div class="section-hint">Häufigste Gegner im gewählten Zeitraum.</div>
        </div>
      </div>

      <div v-if="!(stats?.rivals ?? []).length" class="ttw-empty">Keine Rivalen-Daten.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Gegner</th>
              <th class="num-col">Matches</th>
              <th class="num-col">W / L / D</th>
              <th class="num-col">Winrate</th>
              <th class="num-col">Coins</th>
              <th class="num-col">EUR</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rival in stats?.rivals" :key="rival.opponent_username">
              <td>{{ rival.opponent_display_name || rival.opponent_username }}</td>
              <td class="num-col mono">{{ fmtNum(rival.matches_count) }}</td>
              <td class="num-col mono">
                {{ fmtNum(rival.wins) }} / {{ fmtNum(rival.losses) }} / {{ fmtNum(rival.draws) }}
              </td>
              <td class="num-col mono">{{ fmtNum(rival.winrate_pct) }}%</td>
              <td class="num-col mono">{{ fmtNum(rival.total_coins) }}</td>
              <td class="num-col mono">{{ fmtEUR(rival.total_eur_net) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ModalDialog
      :open="detailOpen"
      :title="detailBattle ? battleTitle(detailBattle) : 'Battle-Details'"
      wide
      @close="detailOpen = false"
    >
      <SkeletonList v-if="detailLoading" :rows="6" />
      <div v-else-if="detailError" class="status-banner error">{{ detailError }}</div>
      <div v-else-if="detail" class="ttw-detail">
        <div class="summary-bar">
          <div class="summary-box">
            <div class="label">Ergebnis</div>
            <div class="val">{{ resultOf(detail) }}</div>
            <div class="sub">{{ detail.battle_mode || '–' }}</div>
          </div>
          <div class="summary-box">
            <div class="label">Score</div>
            <div class="val">{{ battleScore(detail) }}</div>
            <div class="sub">{{ fmtDuration(detail.duration_seconds) }}</div>
          </div>
          <div class="summary-box">
            <div class="label">Coins</div>
            <div class="val">{{ fmtNum(detail.coins_earned ?? detail.total_coins) }}</div>
            <div class="sub">{{ fmtEUR(detail.eur_net ?? detail.total_eur_net) }}</div>
          </div>
          <div class="summary-box">
            <div class="label">Zeit</div>
            <div class="val">{{ fmtDate(detail.started_at) }}</div>
            <div class="sub">bis {{ fmtDate(detail.ended_at) }}</div>
          </div>
        </div>

        <h3 class="ttw-detail-title">Geschenke in dieser Battle</h3>
        <div v-if="!(detail.gifts ?? []).length" class="ttw-empty">Keine Geschenke erfasst.</div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Spender</th>
                <th>Geschenk</th>
                <th class="num-col">Coins</th>
                <th class="num-col">EUR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="gift in detail.gifts" :key="gift.id">
                <td class="mono">{{ fmtDate(gift.created_at) }}</td>
                <td>{{ gift.sender_nickname || gift.sender_username }}</td>
                <td>{{ gift.gift_name }}</td>
                <td class="num-col mono">{{ fmtNum(gift.total_coins) }}</td>
                <td class="num-col mono">{{ fmtEUR(gift.eur_net) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <button type="button" class="sm" @click="detailOpen = false">Schließen</button>
      </template>
    </ModalDialog>
  </div>
</template>
