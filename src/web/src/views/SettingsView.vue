<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ApiError, apiGet, apiPost } from '@/api/client';
import type {
  RevenueProfile,
  RevenueProfilesResponse,
  RevenueStreamer,
  ToktrackerSettings,
} from '@/api/types';
import ModalDialog from '@/components/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const auth = useAuthStore();
const toast = useToastStore();

const loading = ref(false);
const saving = ref(false);
const error = ref('');

const settings = reactive({
  usd_per_diamond: 0.005,
  gross_usd_per_coin: 0.01,
  usd_to_eur_rate: 0.92,
  currency_primary: 'EUR',
  poll_interval_seconds: 60,
  telegram_access_mode: 'whitelist',
  public_banner_enabled: false,
  public_banner_title: '',
  public_banner_text: '',
  public_banner_style: 'info',
  public_banner_btn_text: '',
  public_banner_btn_url: '',
  public_show_donors: false,
});

const profiles = ref<RevenueProfile[]>([]);
const streamers = ref<RevenueStreamer[]>([]);
const profileOpen = ref(false);
const profileSaving = ref(false);
const profileError = ref('');
const profileEditing = ref<RevenueProfile | null>(null);
const profileForm = reactive({
  name: '',
  coin_price_usd: 0.01,
  creator_share_pct: 50,
  agency_share_pct: 0,
  payout_fee_pct: 0,
  tax_pct: 0,
  fx_rate: 0.92,
  coin_price_uncertainty_pct: 0,
  creator_share_uncertainty_pct: 0,
  agency_share_max_pct: 0,
  tax_max_pct: 0,
  fx_uncertainty_pct: 0,
  is_default: false,
});

const canManageSystem = computed(() => auth.can('system.manage'));
const profileTitle = computed(() =>
  profileEditing.value ? `Revenue-Profil „${profileEditing.value.name}“` : 'Revenue-Profil',
);

function applySettings(payload: ToktrackerSettings): void {
  settings.usd_per_diamond = Number(payload.usd_per_diamond ?? settings.usd_per_diamond);
  settings.gross_usd_per_coin = Number(payload.gross_usd_per_coin ?? settings.gross_usd_per_coin);
  settings.usd_to_eur_rate = Number(payload.usd_to_eur_rate ?? settings.usd_to_eur_rate);
  settings.currency_primary = String(payload.currency_primary ?? settings.currency_primary);
  settings.poll_interval_seconds = Number(
    payload.poll_interval_seconds ?? settings.poll_interval_seconds,
  );
  settings.telegram_access_mode = String(
    payload.telegram_access_mode ?? settings.telegram_access_mode,
  );
  settings.public_banner_enabled = Boolean(payload.public_banner_enabled);
  settings.public_banner_title = String(payload.public_banner_title ?? '');
  settings.public_banner_text = String(payload.public_banner_text ?? '');
  settings.public_banner_style = String(payload.public_banner_style ?? 'info');
  settings.public_banner_btn_text = String(payload.public_banner_btn_text ?? '');
  settings.public_banner_btn_url = String(payload.public_banner_btn_url ?? '');
  settings.public_show_donors = Boolean(payload.public_show_donors);
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const [settingsPayload, revenuePayload] = await Promise.all([
      apiGet<ToktrackerSettings>('/api/settings'),
      apiGet<RevenueProfilesResponse>('/api/revenue/profiles'),
    ]);
    applySettings(settingsPayload);
    profiles.value = revenuePayload.profiles;
    streamers.value = revenuePayload.streamers;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Einstellungen konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

async function saveSettings(): Promise<void> {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const payload = await apiPost<ToktrackerSettings>('/api/settings', {
      usd_per_diamond: Number(settings.usd_per_diamond),
      gross_usd_per_coin: Number(settings.gross_usd_per_coin),
      usd_to_eur_rate: Number(settings.usd_to_eur_rate),
      currency_primary: settings.currency_primary,
      poll_interval_seconds: Number(settings.poll_interval_seconds),
      telegram_access_mode: settings.telegram_access_mode,
      public_banner_enabled: settings.public_banner_enabled,
      public_banner_title: settings.public_banner_title,
      public_banner_text: settings.public_banner_text,
      public_banner_style: settings.public_banner_style,
      public_banner_btn_text: settings.public_banner_btn_text,
      public_banner_btn_url: settings.public_banner_btn_url,
      public_show_donors: settings.public_show_donors,
    });
    applySettings(payload);
    toast.push('Einstellungen gespeichert.', 'success');
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Speichern fehlgeschlagen.';
  } finally {
    saving.value = false;
  }
}

function openProfile(profile: RevenueProfile): void {
  profileEditing.value = profile;
  profileForm.name = profile.name;
  profileForm.coin_price_usd = Number(profile.coin_price_usd ?? 0.01);
  profileForm.creator_share_pct = Number(profile.creator_share_pct ?? 50);
  profileForm.agency_share_pct = Number(profile.agency_share_pct ?? 0);
  profileForm.payout_fee_pct = Number(profile.payout_fee_pct ?? 0);
  profileForm.tax_pct = Number(profile.tax_pct ?? 0);
  profileForm.fx_rate = Number(profile.fx_rate ?? 0.92);
  profileForm.coin_price_uncertainty_pct = Number(profile.coin_price_uncertainty_pct ?? 0);
  profileForm.creator_share_uncertainty_pct = Number(profile.creator_share_uncertainty_pct ?? 0);
  profileForm.agency_share_max_pct = Number(profile.agency_share_max_pct ?? 0);
  profileForm.tax_max_pct = Number(profile.tax_max_pct ?? 0);
  profileForm.fx_uncertainty_pct = Number(profile.fx_uncertainty_pct ?? 0);
  profileForm.is_default = Boolean(profile.is_default);
  profileError.value = '';
  profileOpen.value = true;
}

async function saveProfile(): Promise<void> {
  if (!profileEditing.value || profileSaving.value) return;
  profileSaving.value = true;
  profileError.value = '';
  try {
    await apiPost(`/api/revenue/profiles/${profileEditing.value.id}`, {
      name: profileForm.name,
      coin_price_usd: Number(profileForm.coin_price_usd),
      creator_share_pct: Number(profileForm.creator_share_pct),
      agency_share_pct: Number(profileForm.agency_share_pct),
      payout_fee_pct: Number(profileForm.payout_fee_pct),
      tax_pct: Number(profileForm.tax_pct),
      fx_rate: Number(profileForm.fx_rate),
      coin_price_uncertainty_pct: Number(profileForm.coin_price_uncertainty_pct),
      creator_share_uncertainty_pct: Number(profileForm.creator_share_uncertainty_pct),
      agency_share_max_pct: Number(profileForm.agency_share_max_pct),
      tax_max_pct: Number(profileForm.tax_max_pct),
      fx_uncertainty_pct: Number(profileForm.fx_uncertainty_pct),
      is_default: profileForm.is_default ? 1 : 0,
    });
    toast.push('Revenue-Profil gespeichert.', 'success');
    profileOpen.value = false;
    await load();
  } catch (caught) {
    profileError.value =
      caught instanceof ApiError || caught instanceof Error
        ? caught.message
        : 'Profil konnte nicht gespeichert werden.';
  } finally {
    profileSaving.value = false;
  }
}

async function assignProfile(streamer: RevenueStreamer, value: string): Promise<void> {
  try {
    await apiPost('/api/revenue/assign', {
      streamer_id: streamer.id,
      profile_id: value === '' ? null : Number(value),
    });
    toast.push(`Profil für @${streamer.username} zugeordnet.`, 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Zuordnung fehlgeschlagen.', 'error');
  }
}

async function seedDemo(): Promise<void> {
  if (!window.confirm('Demo-Daten in die Datenbank schreiben?')) return;
  try {
    await apiPost('/api/demo/seed');
    toast.push('Demo-Daten erzeugt.', 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Seed fehlgeschlagen.', 'error');
  }
}

async function clearDemo(): Promise<void> {
  if (!window.confirm('Demo-Daten wirklich entfernen?')) return;
  try {
    await apiPost('/api/demo/clear');
    toast.push('Demo-Daten entfernt.', 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Bereinigung fehlgeschlagen.', 'error');
  }
}

onMounted(load);
</script>

<template>
  <div class="container">
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">TOKTRACKER / CONFIG</p>
        <h2>Einstellungen</h2>
        <p class="section-hint">Währungskurse, Polling, Zugriffsmodus und Revenue-Profile.</p>
      </div>
      <div class="toolbar-controls">
        <button type="button" :disabled="loading" @click="load">
          {{ loading ? 'Lädt…' : 'Neu laden' }}
        </button>
        <button type="button" class="primary" :disabled="saving" @click="saveSettings">
          {{ saving ? 'Speichert…' : 'Einstellungen speichern' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Währung &amp; Berechnung</h2>
          <div class="section-hint">Änderungen wirken auf neue Gift-Events.</div>
        </div>
      </div>

      <div class="ttw-form-grid">
        <label class="ttw-field">
          <span>USD pro Diamond (netto)</span>
          <input v-model.number="settings.usd_per_diamond" type="number" step="0.000001" min="0" />
        </label>
        <label class="ttw-field">
          <span>Brutto USD pro Coin</span>
          <input v-model.number="settings.gross_usd_per_coin" type="number" step="0.000001" min="0" />
        </label>
        <label class="ttw-field">
          <span>USD → EUR Kurs</span>
          <input v-model.number="settings.usd_to_eur_rate" type="number" step="0.0001" min="0" />
        </label>
        <label class="ttw-field">
          <span>Primäre Währung</span>
          <select v-model="settings.currency_primary">
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label class="ttw-field">
          <span>Polling-Intervall (Sekunden)</span>
          <input v-model.number="settings.poll_interval_seconds" type="number" min="5" step="1" />
        </label>
        <label class="ttw-field">
          <span>Telegram-Zugriffsmodus</span>
          <select v-model="settings.telegram_access_mode">
            <option value="whitelist">Whitelist</option>
            <option value="public">Öffentlich</option>
          </select>
        </label>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Public Banner</h2>
          <div class="section-hint">Hinweisbanner für das öffentliche Panel.</div>
        </div>
        <label class="checkbox-label">
          <input v-model="settings.public_banner_enabled" type="checkbox" />
          Aktiv
        </label>
      </div>

      <div class="ttw-form-grid">
        <label class="ttw-field">
          <span>Titel</span>
          <input v-model="settings.public_banner_title" maxlength="200" />
        </label>
        <label class="ttw-field">
          <span>Stil</span>
          <select v-model="settings.public_banner_style">
            <option value="info">Info</option>
            <option value="highlight">Highlight</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
          </select>
        </label>
        <label class="ttw-field ttw-field--wide">
          <span>Text</span>
          <textarea v-model="settings.public_banner_text" rows="3" maxlength="1000"></textarea>
        </label>
        <label class="ttw-field">
          <span>Button-Text</span>
          <input v-model="settings.public_banner_btn_text" maxlength="100" />
        </label>
        <label class="ttw-field">
          <span>Button-URL</span>
          <input v-model="settings.public_banner_btn_url" maxlength="500" />
        </label>
        <label class="checkbox-label">
          <input v-model="settings.public_show_donors" type="checkbox" />
          Spender im Public Panel anzeigen
        </label>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Revenue-Profile</h2>
          <div class="section-hint">Brutto/Netto-Modell und Zuordnung pro Streamer.</div>
        </div>
        <span class="status-tag">{{ profiles.length }} PROFILE</span>
      </div>

      <div class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Profil</th>
              <th class="num-col">Coin USD</th>
              <th class="num-col">Creator %</th>
              <th class="num-col">Agency %</th>
              <th class="num-col">Gebühr %</th>
              <th class="num-col">Steuer %</th>
              <th class="num-col">FX</th>
              <th>Default</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="profile in profiles" :key="profile.id">
              <td>
                <strong>{{ profile.name }}</strong>
                <div class="mono muted">
                  {{ profile.gross_region || '–' }} → {{ profile.creator_region || '–' }}
                </div>
              </td>
              <td class="num-col mono">{{ profile.coin_price_usd ?? '–' }}</td>
              <td class="num-col mono">{{ profile.creator_share_pct ?? '–' }}</td>
              <td class="num-col mono">{{ profile.agency_share_pct ?? '–' }}</td>
              <td class="num-col mono">{{ profile.payout_fee_pct ?? '–' }}</td>
              <td class="num-col mono">{{ profile.tax_pct ?? '–' }}</td>
              <td class="num-col mono">{{ profile.fx_rate ?? '–' }}</td>
              <td>{{ profile.is_default ? 'JA' : '–' }}</td>
              <td>
                <button type="button" class="sm" @click="openProfile(profile)">Bearbeiten</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Streamer-Zuordnung</h2>
          <div class="section-hint">Welches Revenue-Profil gilt für welchen Streamer?</div>
        </div>
      </div>

      <div class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Streamer</th>
              <th>Revenue-Profil</th>
              <th class="num-col">Aktuell</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="streamer in streamers" :key="streamer.id">
              <td>@{{ streamer.username }}</td>
              <td>
                <select
                  :value="streamer.revenue_profile_id ?? ''"
                  @change="assignProfile(streamer, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">Standard</option>
                  <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
                    {{ profile.name }}
                  </option>
                </select>
              </td>
              <td class="num-col mono">
                {{
                  profiles.find((profile) => profile.id === streamer.revenue_profile_id)?.name ??
                    'Standard'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="canManageSystem" class="box">
      <div class="box-header">
        <div>
          <h2>Demo-Daten</h2>
          <div class="section-hint">Nur für Entwicklung und Tests. Löscht/erzeugt Demo-Events.</div>
        </div>
        <span class="status-tag">SYSTEM</span>
      </div>
      <div class="action-group">
        <button type="button" class="sm" @click="seedDemo">Demo-Daten erzeugen</button>
        <button type="button" class="sm danger" @click="clearDemo">Demo-Daten entfernen</button>
      </div>
    </section>

    <ModalDialog :open="profileOpen" :title="profileTitle" wide @close="profileOpen = false">
      <form id="revenue-profile-form" class="ttw-user-form" @submit.prevent="saveProfile">
        <div class="grid-2">
          <label class="ttw-field">
            <span>Name</span>
            <input v-model="profileForm.name" required />
          </label>
          <label class="ttw-field">
            <span>Coin-Preis USD</span>
            <input v-model.number="profileForm.coin_price_usd" type="number" step="0.000001" min="0" />
          </label>
          <label class="ttw-field">
            <span>Creator-Anteil %</span>
            <input v-model.number="profileForm.creator_share_pct" type="number" step="0.01" min="0" />
          </label>
          <label class="ttw-field">
            <span>Agency-Anteil %</span>
            <input v-model.number="profileForm.agency_share_pct" type="number" step="0.01" min="0" />
          </label>
          <label class="ttw-field">
            <span>Auszahlungsgebühr %</span>
            <input v-model.number="profileForm.payout_fee_pct" type="number" step="0.01" min="0" />
          </label>
          <label class="ttw-field">
            <span>Steuer %</span>
            <input v-model.number="profileForm.tax_pct" type="number" step="0.01" min="0" />
          </label>
          <label class="ttw-field">
            <span>FX-Kurs</span>
            <input v-model.number="profileForm.fx_rate" type="number" step="0.0001" min="0" />
          </label>
          <label class="checkbox-label ttw-checkbox-row">
            <input v-model="profileForm.is_default" type="checkbox" />
            Standardprofil
          </label>
          <label class="ttw-field">
            <span>Coin-Preis Unsicherheit %</span>
            <input v-model.number="profileForm.coin_price_uncertainty_pct" type="number" step="0.01" min="0" />
          </label>
          <label class="ttw-field">
            <span>Creator-Unsicherheit %</span>
            <input v-model.number="profileForm.creator_share_uncertainty_pct" type="number" step="0.01" min="0" />
          </label>
          <label class="ttw-field">
            <span>Agency-Max %</span>
            <input v-model.number="profileForm.agency_share_max_pct" type="number" step="0.01" min="0" />
          </label>
          <label class="ttw-field">
            <span>Steuer-Max %</span>
            <input v-model.number="profileForm.tax_max_pct" type="number" step="0.01" min="0" />
          </label>
          <label class="ttw-field">
            <span>FX-Unsicherheit %</span>
            <input v-model.number="profileForm.fx_uncertainty_pct" type="number" step="0.01" min="0" />
          </label>
        </div>
        <div v-if="profileError" class="status-banner error">{{ profileError }}</div>
      </form>
      <template #footer>
        <button type="button" class="sm" :disabled="profileSaving" @click="profileOpen = false">
          Abbrechen
        </button>
        <button type="submit" form="revenue-profile-form" class="primary sm" :disabled="profileSaving">
          {{ profileSaving ? 'Speichern…' : 'Speichern' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>
