<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ApiError, apiGet, apiPost } from '@/api/client';
import type { DashboardOverview, GiftCatalogItem, GiftCreateResponse } from '@/api/types';
import { useToastStore } from '@/stores/toast';
import { fmtDate, fmtEUR, fmtNum } from '@/utils/format';

const toast = useToastStore();

const period = ref('24h');
const overview = ref<DashboardOverview | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const formError = ref('');

const form = reactive({
  streamer_id: '',
  gift_name: '',
  diamond_count: 1,
  repeat_count: 1,
  sender_username: 'live_viewer',
  sender_nickname: '',
  source: 'manual',
});

const periodOptions = [
  { value: 'today', label: 'Heute' },
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: 'all', label: 'Gesamt' },
];

const streamers = computed(() => overview.value?.streamers ?? []);
const catalog = computed<GiftCatalogItem[]>(() => overview.value?.gift_catalog ?? []);
const recentGifts = computed(() => overview.value?.recent_gifts ?? []);
const totalCoins = computed(
  () => Math.max(1, Number(form.diamond_count) || 1) * Math.max(1, Number(form.repeat_count) || 1),
);

function onGiftChange(): void {
  const gift = catalog.value.find((entry) => entry.name === form.gift_name);
  if (gift) form.diamond_count = gift.diamonds;
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    overview.value = await apiGet<DashboardOverview>(
      `/api/overview?period=${encodeURIComponent(period.value)}`,
    );
    if (!form.streamer_id && streamers.value[0]) {
      form.streamer_id = String(streamers.value[0].id);
    }
    if (!form.gift_name && catalog.value[0]) {
      form.gift_name = catalog.value[0].name;
      form.diamond_count = catalog.value[0].diamonds;
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Geschenk-Daten konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  if (saving.value) return;
  saving.value = true;
  formError.value = '';
  try {
    if (!form.streamer_id) throw new Error('Bitte einen Streamer auswählen.');
    if (!form.gift_name.trim()) throw new Error('Bitte ein Geschenk angeben.');
    const payload = await apiPost<GiftCreateResponse>('/api/gifts', {
      streamer_id: Number(form.streamer_id),
      gift_name: form.gift_name.trim(),
      diamond_count: Math.max(1, Number(form.diamond_count) || 1),
      repeat_count: Math.max(1, Number(form.repeat_count) || 1),
      sender_username: form.sender_username.trim() || 'live_viewer',
      sender_nickname: form.sender_nickname.trim() || null,
      source: form.source,
    });
    toast.push(
      payload.created ? 'Geschenk gebucht.' : 'Geschenk aktualisiert.',
      'success',
    );
    form.sender_username = 'live_viewer';
    form.sender_nickname = '';
    await load();
  } catch (caught) {
    formError.value =
      caught instanceof ApiError || caught instanceof Error
        ? caught.message
        : 'Geschenk konnte nicht gebucht werden.';
  } finally {
    saving.value = false;
  }
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
        <p class="ttw-page-eyebrow">TOKTRACKER / GIFTS</p>
        <h2>Geschenke buchen</h2>
        <p class="section-hint">Manuelle Korrekturen und Nachbuchungen für Gift-Events.</p>
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
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="ttw-chart-grid">
      <section class="box">
        <div class="box-header">
          <div>
            <h2>Neues Gift-Event</h2>
            <div class="section-hint">Wird sofort in der Datenbank gespeichert.</div>
          </div>
          <span class="status-tag">{{ fmtNum(totalCoins) }} COINS</span>
        </div>

        <form class="ttw-user-form" @submit.prevent="submit">
          <div class="grid-2">
            <label class="ttw-field">
              <span>Streamer</span>
              <select v-model="form.streamer_id" required>
                <option value="" disabled>Streamer wählen</option>
                <option v-for="streamer in streamers" :key="streamer.id" :value="String(streamer.id)">
                  {{ streamer.display_name || streamer.username }} (@{{ streamer.username }})
                </option>
              </select>
            </label>
            <label class="ttw-field">
              <span>Geschenk</span>
              <select v-model="form.gift_name" @change="onGiftChange">
                <option v-for="gift in catalog" :key="gift.id" :value="gift.name">
                  {{ gift.name }} ({{ gift.diamonds }})
                </option>
              </select>
            </label>
            <label class="ttw-field">
              <span>Coins pro Geschenk</span>
              <input v-model.number="form.diamond_count" type="number" min="1" step="1" />
            </label>
            <label class="ttw-field">
              <span>Anzahl / Combo</span>
              <input v-model.number="form.repeat_count" type="number" min="1" step="1" />
            </label>
            <label class="ttw-field">
              <span>Spender @username</span>
              <input v-model="form.sender_username" autocomplete="off" />
            </label>
            <label class="ttw-field">
              <span>Spender-Anzeigename</span>
              <input v-model="form.sender_nickname" autocomplete="off" />
            </label>
            <label class="ttw-field">
              <span>Quelle</span>
              <select v-model="form.source">
                <option value="manual">Manuell</option>
                <option value="webhook">Webhook</option>
                <option value="tiktoklive">TikTokLive</option>
              </select>
            </label>
          </div>

          <div v-if="formError" class="status-banner error">{{ formError }}</div>

          <button type="submit" class="primary" :disabled="saving">
            {{ saving ? 'Buchen…' : `Geschenk buchen (${fmtNum(totalCoins)} Coins)` }}
          </button>
        </form>
      </section>

      <section class="box">
        <div class="box-header">
          <div>
            <h2>Gift-Katalog</h2>
            <div class="section-hint">Coins-Wert pro Geschenk.</div>
          </div>
          <span class="status-tag">{{ catalog.length }} GIFTS</span>
        </div>

        <div class="table-wrap ttw-catalog">
          <table>
            <thead>
              <tr>
                <th>Geschenk</th>
                <th class="num-col">Coins</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="gift in catalog.slice(0, 40)" :key="gift.id">
                <td>{{ gift.name }}</td>
                <td class="num-col mono">{{ fmtNum(gift.diamonds) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Letzte Gift-Events</h2>
          <div class="section-hint">Die jüngsten Transaktionen im gewählten Zeitraum.</div>
        </div>
        <span class="status-tag">{{ recentGifts.length }} EVENTS</span>
      </div>

      <div v-if="!recentGifts.length && !loading" class="ttw-empty">Keine Geschenke gefunden.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Streamer</th>
              <th>Spender</th>
              <th>Geschenk</th>
              <th class="num-col">Anzahl</th>
              <th class="num-col">Coins</th>
              <th class="num-col">EUR</th>
              <th>Quelle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="gift in recentGifts" :key="gift.id">
              <td class="mono">{{ fmtDate(gift.created_at) }}</td>
              <td>@{{ gift.streamer_username }}</td>
              <td>{{ gift.sender_nickname || gift.sender_username || '–' }}</td>
              <td>{{ gift.gift_name }}</td>
              <td class="num-col mono">{{ fmtNum(gift.repeat_count) }}</td>
              <td class="num-col mono">{{ fmtNum(gift.total_coins) }}</td>
              <td class="num-col mono">{{ fmtEUR(gift.eur_net) }}</td>
              <td class="mono">{{ gift.source || '–' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
