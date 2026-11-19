<script setup lang="ts">
import PageLoadingOverlay from '@/components/PageLoadingOverlay.vue';
import SkeletonList from '@/components/SkeletonList.vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ApiError, apiGet, apiPost } from '@/api/client';
import type {
  Frontenwechsler,
  LoyaltyOverlapResponse,
  RadarDonor,
  RadarDonorDetail,
  RadarResponse,
  WhaleAlert,
  WhaleAlertsResponse,
} from '@/api/types';
import ModalDialog from '@/components/ModalDialog.vue';
import StatCard from '@/components/StatCard.vue';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtEUR, fmtNum } from '@/utils/format';

const toast = useToastStore();

const period = ref('all');
const tierFilter = ref('');
const search = ref('');
const appliedSearch = ref('');
const vipOnly = ref(false);
const crossOnly = ref(false);
const limit = 100;
const offset = ref(0);

const data = ref<RadarResponse['data'] | null>(null);
const alerts = ref<WhaleAlert[]>([]);
const frontenwechsler = ref<Frontenwechsler[]>([]);
const loading = ref(false);
const error = ref('');

const detailOpen = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const detail = ref<RadarDonorDetail['data'] | null>(null);
const detailDonor = ref<RadarDonor | null>(null);
const crmSaving = ref(false);
const crmError = ref('');
const crmForm = reactive({ is_vip: false, tags: '', notes: '' });

const periodOptions = [
  { value: 'today', label: 'Heute' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamt' },
];

const tierOptions = [
  { value: '', label: 'Alle Tiers' },
  { value: 'whale', label: 'Whale' },
  { value: 'shark', label: 'Shark' },
  { value: 'dolphin', label: 'Dolphin' },
];

const donors = computed(() => data.value?.donors ?? []);
const kpis = computed(() => data.value?.kpis ?? {});
const page = computed(() => Math.floor(offset.value / limit) + 1);
const pages = computed(() => Math.max(1, Math.ceil(donors.value.length / limit)));

function tierClass(tier?: string): string {
  if (tier === 'whale') return 'tier-whale';
  if (tier === 'shark') return 'tier-shark';
  if (tier === 'dolphin') return 'tier-dolphin';
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
    if (tierFilter.value) params.set('min_tier', tierFilter.value);
    if (appliedSearch.value) params.set('search', appliedSearch.value);
    if (vipOnly.value) params.set('vip_only', 'true');
    if (crossOnly.value) params.set('cross_streamer_only', 'true');

    const [radarPayload, alertPayload, loyaltyPayload] = await Promise.all([
      apiGet<RadarResponse>(`/api/donor-radar?${params.toString()}`),
      apiGet<WhaleAlertsResponse>('/api/donor-radar/whale-alerts?min_coins=1000&limit=8'),
      apiGet<LoyaltyOverlapResponse>('/api/donor-radar/loyalty-and-overlap?min_coins=50&days_recent=14'),
    ]);
    data.value = radarPayload.data;
    alerts.value = alertPayload.alerts;
    frontenwechsler.value = loyaltyPayload.data.frontenwechsler;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Spender-Radar konnte nicht geladen werden.';
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
  tierFilter.value = '';
  search.value = '';
  appliedSearch.value = '';
  vipOnly.value = false;
  crossOnly.value = false;
  offset.value = 0;
  void load();
}

async function openDetail(donor: RadarDonor): Promise<void> {
  detailDonor.value = donor;
  detail.value = null;
  detailError.value = '';
  detailOpen.value = true;
  detailLoading.value = true;
  try {
    const payload = await apiGet<RadarDonorDetail>(
      `/api/donor-radar/donors/${encodeURIComponent(donor.username)}`,
    );
    detail.value = payload.data;
    crmForm.is_vip = Boolean(payload.data.crm?.is_vip ?? donor.is_vip);
    crmForm.tags = (payload.data.crm?.tags ?? donor.tags ?? []).join(', ');
    crmForm.notes = payload.data.crm?.notes ?? donor.notes ?? '';
  } catch (caught) {
    detailError.value = caught instanceof Error ? caught.message : 'Spender konnte nicht geladen werden.';
  } finally {
    detailLoading.value = false;
  }
}

async function saveCrm(): Promise<void> {
  if (!detailDonor.value || crmSaving.value) return;
  crmSaving.value = true;
  crmError.value = '';
  try {
    await apiPost(`/api/donor-radar/donors/${encodeURIComponent(detailDonor.value.username)}/crm`, {
      is_vip: crmForm.is_vip,
      tags: crmForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: crmForm.notes,
    });
    toast.push('CRM gespeichert.', 'success');
    await load();
  } catch (caught) {
    crmError.value =
      caught instanceof ApiError || caught instanceof Error
        ? caught.message
        : 'CRM konnte nicht gespeichert werden.';
  } finally {
    crmSaving.value = false;
  }
}

async function toggleVip(donor: RadarDonor): Promise<void> {
  try {
    await apiPost(`/api/donor-radar/donors/${encodeURIComponent(donor.username)}/toggle-vip`);
    toast.push('VIP-Status umgeschaltet.', 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Aktion fehlgeschlagen.', 'error');
  }
}

watch([period, tierFilter, vipOnly, crossOnly], () => {
  offset.value = 0;
  void load();
});

onMounted(load);
</script>

<template>
  <div class="container">
    <PageLoadingOverlay v-if="loading && !data" variant="table" :kpis="4" />
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">TOKTRACKER / DONOR RADAR</p>
        <h2>Spender-Radar</h2>
        <p class="section-hint">Whales, Stammspender, Cross-Streamer und CRM.</p>
      </div>
      <div class="toolbar-controls">
        <button type="button" :disabled="loading" @click="load">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="summary-bar">
      <StatCard label="Whales" :value="fmtNum(kpis.whales)" :sub="`${fmtNum(kpis.cross_streamer_whales)} cross-streamer`" accent />
      <StatCard label="Sharks" :value="fmtNum(kpis.sharks)" />
      <StatCard label="Dolphins" :value="fmtNum(kpis.dolphins)" />
      <StatCard
        label="Whale-Volumen"
        :value="fmtEUR(kpis.whale_eur_net)"
        :sub="`${fmtNum(kpis.whale_coins)} Coins`"
      />
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Whale-Alerts</h2>
          <div class="section-hint">Große Geschenke ab 1.000 Coins.</div>
        </div>
        <span class="status-tag">{{ alerts.length }} ALERTS</span>
      </div>

      <div v-if="!alerts.length" class="ttw-empty">Keine Whale-Alerts im Zeitraum.</div>
      <div v-else class="ttw-alert-grid">
        <article v-for="alert in alerts" :key="alert.id" class="ttw-alert-card">
          <div class="ttw-alert-head">
            <span class="ttw-role-badge" :class="tierClass(alert.tier)">{{ alert.tier || 'ALERT' }}</span>
            <strong>{{ alert.nickname || alert.username }}</strong>
            <span class="mono muted">{{ fmtDate(alert.created_at) }}</span>
          </div>
          <div class="ttw-alert-body">
            <span>{{ alert.gift_name }}</span>
            <span class="mono">{{ fmtNum(alert.total_coins) }} Coins · {{ fmtEUR(alert.eur_net) }}</span>
          </div>
          <div class="mono muted">@{{ alert.streamer_username }}</div>
        </article>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Frontenwechsler</h2>
          <div class="section-hint">Spender, die zuletzt zwischen Streamern gewechselt sind.</div>
        </div>
        <span class="status-tag">{{ frontenwechsler.length }} SPENDER</span>
      </div>

      <div v-if="!frontenwechsler.length" class="ttw-empty">Keine Wechsel im Zeitraum.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Spender</th>
              <th class="num-col">Coins</th>
              <th class="num-col">Netto EUR</th>
              <th>Loyalty</th>
              <th>Wechsel</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="donor in frontenwechsler.slice(0, 12)" :key="donor.username">
              <td>
                <strong>{{ donor.display_name || donor.username }}</strong>
                <div class="mono muted">@{{ donor.username }}</div>
              </td>
              <td class="num-col mono">{{ fmtNum(donor.total_coins) }}</td>
              <td class="num-col mono">{{ fmtEUR(donor.total_net_eur) }}</td>
              <td>
                <span class="ttw-role-badge" :class="tierClass(donor.tier)">
                  {{ donor.label || donor.classification || '–' }}
                </span>
                <div class="mono muted">{{ fmtNum(donor.loyalty_score) }} Punkte</div>
              </td>
              <td class="mono">
                <span class="muted">@{{ donor.frontenwechsel?.old_streamer || '–' }}</span>
                →
                <span>@{{ donor.frontenwechsel?.new_streamer || '–' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Spender</h2>
          <div class="section-hint">Nach Coins im gewählten Zeitraum.</div>
        </div>
        <span class="status-tag">{{ donors.length }} SPENDER</span>
      </div>

      <div class="toolbar-controls ttw-filter-bar">
        <select v-model="period" aria-label="Zeitraum">
          <option v-for="option in periodOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model="tierFilter" aria-label="Tier">
          <option v-for="option in tierOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input v-model="search" placeholder="Spender suchen…" @keyup.enter="applyFilters" />
        <label class="checkbox-label">
          <input v-model="vipOnly" type="checkbox" />
          Nur VIP
        </label>
        <label class="checkbox-label">
          <input v-model="crossOnly" type="checkbox" />
          Cross-Streamer
        </label>
        <button type="button" @click="applyFilters">Anwenden</button>
        <button type="button" class="sm" @click="resetFilters">Zurücksetzen</button>
      </div>

      <div v-if="!donors.length && !loading" class="ttw-empty">Keine Spender gefunden.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Spender</th>
              <th>Tier</th>
              <th class="num-col">Coins</th>
              <th class="num-col">EUR</th>
              <th class="num-col">Gifts</th>
              <th class="num-col">Streamer</th>
              <th>Status</th>
              <th>Zuletzt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="donor in donors" :key="donor.username">
              <td>
                <strong>{{ donor.display_name || donor.username }}</strong>
                <div class="mono muted">@{{ donor.username }}</div>
              </td>
              <td>
                <span class="ttw-role-badge" :class="tierClass(donor.tier)">
                  {{ donor.tier || '–' }}
                </span>
              </td>
              <td class="num-col mono">{{ fmtNum(donor.total_coins) }}</td>
              <td class="num-col mono">{{ fmtEUR(donor.total_eur_net) }}</td>
              <td class="num-col mono">{{ fmtNum(donor.total_gifts) }}</td>
              <td class="num-col mono">{{ fmtNum(donor.streamer_count) }}</td>
              <td>
                <span v-if="donor.is_vip" class="ttw-perm-badge is-grant">VIP</span>
                <span v-if="donor.is_cross_streamer" class="ttw-perm-badge is-deny">CROSS</span>
              </td>
              <td class="mono">{{ fmtDate(donor.last_seen) }}</td>
              <td>
                <div class="action-group">
                  <button type="button" class="sm" @click="openDetail(donor)">Dossier</button>
                  <button type="button" class="sm" @click="toggleVip(donor)">
                    {{ donor.is_vip ? 'VIP −' : 'VIP +' }}
                  </button>
                </div>
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
          :disabled="donors.length < limit || loading"
          @click="offset += limit; load()"
        >
          Weiter →
        </button>
      </div>
    </section>

    <ModalDialog
      :open="detailOpen"
      :title="detailDonor ? `Dossier · @${detailDonor.username}` : 'Spender-Dossier'"
      wide
      @close="detailOpen = false"
    >
      <SkeletonList v-if="detailLoading" :rows="6" />
      <div v-else-if="detailError" class="status-banner error">{{ detailError }}</div>
      <div v-else-if="detail" class="ttw-detail">
        <div class="summary-bar">
          <div class="summary-box">
            <div class="label">Coins</div>
            <div class="val">{{ fmtNum(detail.profile.total_coins) }}</div>
            <div class="sub">{{ fmtEUR(detail.profile.total_eur_net) }}</div>
          </div>
          <div class="summary-box">
            <div class="label">Gifts</div>
            <div class="val">{{ fmtNum(detail.profile.total_gifts) }}</div>
            <div class="sub">{{ fmtNum(detail.profile.streamer_count) }} Streamer</div>
          </div>
          <div class="summary-box">
            <div class="label">Loyalty</div>
            <div class="val">{{ detail.loyalty?.label || '–' }}</div>
            <div class="sub">{{ detail.loyalty?.score ?? '–' }} Punkte</div>
          </div>
          <div class="summary-box">
            <div class="label">Tier</div>
            <div class="val">{{ detail.profile.tier || '–' }}</div>
            <div class="sub">{{ detail.profile.is_vip ? 'VIP' : 'Standard' }}</div>
          </div>
        </div>

        <div v-if="detail.frontenwechsel?.is_shifted" class="status-banner warning">
          <strong>{{ detail.frontenwechsel.status_label }}</strong>
          {{ detail.frontenwechsel.description }}
        </div>

        <div class="ttw-detail-grid">
          <div>
            <h3 class="ttw-detail-title">Streamer</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Streamer</th>
                    <th class="num-col">Coins</th>
                    <th class="num-col">EUR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="streamer in detail.streamers" :key="streamer.streamer_id">
                    <td>@{{ streamer.streamer_username }}</td>
                    <td class="num-col mono">{{ fmtNum(streamer.coins_given) }}</td>
                    <td class="num-col mono">{{ fmtEUR(streamer.eur_net) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 class="ttw-detail-title">Top-Geschenke</h3>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Geschenk</th>
                    <th class="num-col">Anzahl</th>
                    <th class="num-col">Coins</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="gift in detail.top_gifts" :key="gift.gift_name">
                    <td>{{ gift.gift_name }}</td>
                    <td class="num-col mono">{{ fmtNum(gift.total_sent) }}</td>
                    <td class="num-col mono">{{ fmtNum(gift.total_coins) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="ttw-detail-grid">
          <div>
            <h3 class="ttw-detail-title">Letzte Chat-Nachrichten</h3>
            <div v-if="!(detail.recent_chats ?? []).length" class="ttw-empty">Keine Chatlogs.</div>
            <ul v-else class="ttw-chat-list">
              <li v-for="chat in detail.recent_chats" :key="chat.id">
                <div class="ttw-chat-meta mono">
                  {{ chat.streamer_display_name || chat.streamer_username }} · {{ fmtDate(chat.created_at) }}
                </div>
                <div>{{ chat.comment }}</div>
              </li>
            </ul>
          </div>

          <div>
            <h3 class="ttw-detail-title">CRM</h3>
            <div class="ttw-user-form">
              <label class="checkbox-label">
                <input v-model="crmForm.is_vip" type="checkbox" />
                VIP-Spender
              </label>
              <label class="ttw-field">
                <span>Tags (kommagetrennt)</span>
                <input v-model="crmForm.tags" placeholder="whale, stammspender" />
              </label>
              <label class="ttw-field">
                <span>Notizen</span>
                <textarea v-model="crmForm.notes" rows="4"></textarea>
              </label>
              <div v-if="crmError" class="status-banner error">{{ crmError }}</div>
              <button type="button" class="primary sm" :disabled="crmSaving" @click="saveCrm">
                {{ crmSaving ? 'Speichern…' : 'CRM speichern' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <button type="button" class="sm" @click="detailOpen = false">Schließen</button>
      </template>
    </ModalDialog>
  </div>
</template>
