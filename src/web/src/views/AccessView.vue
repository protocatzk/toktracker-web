<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from '@/api/client';
import type {
  Role,
  TelegramPermissionMeta,
  TelegramPermissionsResponse,
  TelegramUser,
  TelegramUsersResponse,
} from '@/api/types';
import ModalDialog from '@/components/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { fmtDate } from '@/utils/format';

const auth = useAuthStore();
const toast = useToastStore();

const users = ref<TelegramUser[]>([]);
const accessMode = ref('whitelist');
const loading = ref(false);
const error = ref('');

const createOpen = ref(false);
const createSaving = ref(false);
const createError = ref('');
const createForm = reactive({
  identifier: '',
  role: 'user' as Role,
  is_allowed: 1,
  note: '',
});

const permissionsOpen = ref(false);
const permissionsLoading = ref(false);
const permissionsSaving = ref(false);
const permissionsError = ref('');
const permissionsUser = ref<TelegramUser | null>(null);
const permissionMeta = ref<TelegramPermissionMeta[]>([]);
const rolePermissions = ref<string[]>([]);
const effectivePermissions = ref<string[]>([]);
const permissionForm = reactive({ grants: [] as string[], denies: [] as string[] });

const roleOptions = computed(() =>
  auth.roles.map((role) => ({ value: role, label: auth.roleLabels[role] ?? role })),
);

const counts = computed(() => ({
  total: users.value.length,
  allowed: users.value.filter((user) => user.is_allowed === 1).length,
  pending: users.value.filter((user) => user.is_allowed === 0).length,
  blocked: users.value.filter((user) => user.is_allowed === -1).length,
}));

const modalTitle = computed(() =>
  permissionsUser.value
    ? `Rechte von ${displayName(permissionsUser.value)}`
    : 'Rechte bearbeiten',
);

function displayName(user: TelegramUser): string {
  return (
    user.username ||
    user.first_name ||
    (user.telegram_id ? `ID ${user.telegram_id}` : `#${user.id}`)
  );
}

function statusOf(user: TelegramUser): { label: string; className: string } {
  if (user.is_allowed === 1) return { label: 'FREIGEGEBEN', className: 'is-live' };
  if (user.is_allowed === 0) return { label: 'WARTET', className: 'is-tracking' };
  return { label: 'GESPERRT', className: 'is-offline' };
}

function userIdentifier(user: TelegramUser): string {
  return user.telegram_id ? String(user.telegram_id) : (user.username ?? '');
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const payload = await apiGet<TelegramUsersResponse>('/api/telegram/users');
    users.value = payload.users;
    accessMode.value = payload.access_mode;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Zugriffsliste konnte nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  createForm.identifier = '';
  createForm.role = 'user';
  createForm.is_allowed = 1;
  createForm.note = '';
  createError.value = '';
  createOpen.value = true;
}

async function createUser(): Promise<void> {
  if (createSaving.value) return;
  createSaving.value = true;
  createError.value = '';
  try {
    await apiPost('/api/telegram/users', {
      identifier: createForm.identifier.trim(),
      role: createForm.role,
      is_allowed: createForm.is_allowed,
      note: createForm.note.trim() || null,
    });
    toast.push('Telegram-Nutzer gespeichert.', 'success');
    createOpen.value = false;
    await load();
  } catch (caught) {
    createError.value =
      caught instanceof ApiError || caught instanceof Error
        ? caught.message
        : 'Benutzer konnte nicht gespeichert werden.';
  } finally {
    createSaving.value = false;
  }
}

async function setAllowed(user: TelegramUser, allowed: number): Promise<void> {
  try {
    await apiPost('/api/telegram/users', {
      identifier: userIdentifier(user),
      role: user.role,
      is_allowed: allowed,
      first_name: user.first_name ?? null,
      note: user.note ?? null,
    });
    toast.push('Status aktualisiert.', 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Aktion fehlgeschlagen.', 'error');
  }
}

async function removeUser(user: TelegramUser): Promise<void> {
  if (!window.confirm(`Telegram-Nutzer „${displayName(user)}“ wirklich löschen?`)) return;
  try {
    await apiDelete(`/api/telegram/users/${user.id}`);
    toast.push('Nutzer gelöscht.', 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Löschen fehlgeschlagen.', 'error');
  }
}

async function openPermissions(user: TelegramUser): Promise<void> {
  permissionsUser.value = user;
  permissionsOpen.value = true;
  permissionsLoading.value = true;
  permissionsError.value = '';
  permissionForm.grants = [];
  permissionForm.denies = [];
  try {
    const payload = await apiGet<TelegramPermissionsResponse>(
      `/api/telegram/users/${user.id}/permissions`,
    );
    permissionMeta.value = payload.permissions;
    rolePermissions.value = payload.role_permissions;
    effectivePermissions.value = payload.effective_permissions;
    permissionForm.grants = [...payload.grants];
    permissionForm.denies = [...payload.denies];
  } catch (caught) {
    permissionsError.value =
      caught instanceof Error ? caught.message : 'Rechte konnten nicht geladen werden.';
  } finally {
    permissionsLoading.value = false;
  }
}

function toggleGrant(permission: string, checked: boolean): void {
  if (checked) {
    permissionForm.denies = permissionForm.denies.filter((entry) => entry !== permission);
    if (!permissionForm.grants.includes(permission)) permissionForm.grants.push(permission);
  } else {
    permissionForm.grants = permissionForm.grants.filter((entry) => entry !== permission);
  }
}

function toggleDeny(permission: string, checked: boolean): void {
  if (checked) {
    permissionForm.grants = permissionForm.grants.filter((entry) => entry !== permission);
    if (!permissionForm.denies.includes(permission)) permissionForm.denies.push(permission);
  } else {
    permissionForm.denies = permissionForm.denies.filter((entry) => entry !== permission);
  }
}

async function savePermissions(): Promise<void> {
  if (!permissionsUser.value || permissionsSaving.value) return;
  permissionsSaving.value = true;
  permissionsError.value = '';
  try {
    const payload = await apiPut<TelegramPermissionsResponse>(
      `/api/telegram/users/${permissionsUser.value.id}/permissions`,
      { grants: permissionForm.grants, denies: permissionForm.denies },
    );
    effectivePermissions.value = payload.effective_permissions;
    permissionForm.grants = [...payload.grants];
    permissionForm.denies = [...payload.denies];
    toast.push('Rechte gespeichert.', 'success');
    permissionsOpen.value = false;
    await load();
  } catch (caught) {
    permissionsError.value =
      caught instanceof ApiError || caught instanceof Error
        ? caught.message
        : 'Rechte konnten nicht gespeichert werden.';
  } finally {
    permissionsSaving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="container">
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">TOKTRACKER / ACCESS</p>
        <h2>Zugriff &amp; Rollen</h2>
        <p class="section-hint">
          Telegram-Whitelist, Freigaben und persönliche Rechte.
          <span class="mono">MODUS: {{ accessMode.toUpperCase() }}</span>
        </p>
      </div>
      <div class="toolbar-controls">
        <button type="button" :disabled="loading" @click="load">
          {{ loading ? 'Lädt…' : 'Aktualisieren' }}
        </button>
        <button type="button" class="primary" @click="openCreate">Nutzer freischalten</button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <div class="summary-bar">
      <div class="summary-box">
        <div class="label">Konten</div>
        <div class="val">{{ counts.total }}</div>
        <div class="sub">in der Whitelist</div>
      </div>
      <div class="summary-box">
        <div class="label">Freigegeben</div>
        <div class="val">{{ counts.allowed }}</div>
        <div class="sub">aktive Zugänge</div>
      </div>
      <div class="summary-box">
        <div class="label">Wartend</div>
        <div class="val">{{ counts.pending }}</div>
        <div class="sub">auf Freigabe</div>
      </div>
      <div class="summary-box">
        <div class="label">Gesperrt</div>
        <div class="val">{{ counts.blocked }}</div>
        <div class="sub">kein Zugriff</div>
      </div>
    </div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>Telegram-Nutzer</h2>
          <div class="section-hint">Rollen und Rechte werden beim TokTracker-Login aufgelöst.</div>
        </div>
        <span class="status-tag">{{ users.length }} KONTEN</span>
      </div>

      <div v-if="!users.length && !loading" class="ttw-empty">Keine Telegram-Nutzer gefunden.</div>
      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Nutzer</th>
              <th>Rolle</th>
              <th>Status</th>
              <th>Rechte</th>
              <th>Zuletzt</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <div class="ttw-user-cell">
                  <strong>{{ displayName(user) }}</strong>
                  <span v-if="user.telegram_id" class="mono muted">ID {{ user.telegram_id }}</span>
                </div>
                <div v-if="user.note" class="mono muted ttw-note">{{ user.note }}</div>
              </td>
              <td>
                <span class="ttw-role-badge" :class="`role-${user.role}`">
                  {{ auth.roleLabels[user.role] ?? user.role }}
                </span>
              </td>
              <td>
                <span class="ttw-status" :class="statusOf(user).className">
                  <span class="ttw-status-dot"></span>
                  {{ statusOf(user).label }}
                </span>
              </td>
              <td>
                <div class="ttw-perm-badges">
                  <span
                    v-for="grant in user.permission_grants ?? []"
                    :key="`g-${grant}`"
                    class="ttw-perm-badge is-grant"
                    :title="auth.permissionLabels[grant] ?? grant"
                  >
                    +{{ grant }}
                  </span>
                  <span
                    v-for="deny in user.permission_denies ?? []"
                    :key="`d-${deny}`"
                    class="ttw-perm-badge is-deny"
                    :title="auth.permissionLabels[deny] ?? deny"
                  >
                    −{{ deny }}
                  </span>
                  <span
                    v-if="!(user.permission_grants ?? []).length && !(user.permission_denies ?? []).length"
                    class="mono muted"
                  >
                    Rollenstandard
                  </span>
                </div>
              </td>
              <td class="mono">{{ fmtDate(user.last_seen_at) }}</td>
              <td>
                <div class="action-group">
                  <button
                    v-if="user.is_allowed !== 1"
                    type="button"
                    class="sm"
                    @click="setAllowed(user, 1)"
                  >
                    Freigeben
                  </button>
                  <button
                    v-if="user.is_allowed !== 0"
                    type="button"
                    class="sm"
                    @click="setAllowed(user, 0)"
                  >
                    Wartend
                  </button>
                  <button
                    v-if="user.is_allowed !== -1"
                    type="button"
                    class="sm danger"
                    @click="setAllowed(user, -1)"
                  >
                    Sperren
                  </button>
                  <button type="button" class="sm" @click="openPermissions(user)">Rechte</button>
                  <button type="button" class="sm danger" @click="removeUser(user)">Löschen</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ModalDialog :open="createOpen" title="Telegram-Nutzer freischalten" @close="createOpen = false">
      <form id="access-create-form" class="ttw-user-form" @submit.prevent="createUser">
        <label class="ttw-field">
          <span>Telegram-ID oder @username</span>
          <input
            v-model="createForm.identifier"
            placeholder="z. B. 123456789 oder @username"
            required
            autocomplete="off"
          />
        </label>
        <div class="grid-2">
          <label class="ttw-field">
            <span>Rolle</span>
            <select v-model="createForm.role">
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="ttw-field">
            <span>Status</span>
            <select v-model.number="createForm.is_allowed">
              <option :value="1">Freigegeben</option>
              <option :value="0">Wartend</option>
              <option :value="-1">Gesperrt</option>
            </select>
          </label>
        </div>
        <label class="ttw-field">
          <span>Notiz (optional)</span>
          <input v-model="createForm.note" maxlength="500" />
        </label>
        <div v-if="createError" class="status-banner error">{{ createError }}</div>
      </form>
      <template #footer>
        <button type="button" class="sm" :disabled="createSaving" @click="createOpen = false">
          Abbrechen
        </button>
        <button type="submit" form="access-create-form" class="primary sm" :disabled="createSaving">
          {{ createSaving ? 'Speichern…' : 'Speichern' }}
        </button>
      </template>
    </ModalDialog>

    <ModalDialog :open="permissionsOpen" :title="modalTitle" wide @close="permissionsOpen = false">
      <div v-if="permissionsLoading" class="ttw-empty">Rechte werden geladen…</div>
      <div v-else class="ttw-user-form">
        <div class="status-banner info">
          Rolle: {{ permissionsUser ? (auth.roleLabels[permissionsUser.role] ?? permissionsUser.role) : '–' }}
          · Effektiv {{ effectivePermissions.length }} Rechte
        </div>
        <div v-if="permissionsError" class="status-banner error">{{ permissionsError }}</div>

        <div class="ttw-perm-editor">
          <div class="ttw-perm-editor-head">
            <span>Recht</span>
            <span>Grant</span>
            <span>Deny</span>
          </div>
          <div v-for="permission in permissionMeta" :key="permission.key" class="ttw-perm-row">
            <div>
              <strong>{{ permission.label }}</strong>
              <span class="mono muted">
                {{ permission.key }} · {{ rolePermissions.includes(permission.key) ? 'Rolle' : '—' }}
              </span>
            </div>
            <input
              type="checkbox"
              :checked="permissionForm.grants.includes(permission.key)"
              :aria-label="`${permission.key} gewähren`"
              @change="toggleGrant(permission.key, ($event.target as HTMLInputElement).checked)"
            />
            <input
              type="checkbox"
              :checked="permissionForm.denies.includes(permission.key)"
              :aria-label="`${permission.key} entziehen`"
              @change="toggleDeny(permission.key, ($event.target as HTMLInputElement).checked)"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <button type="button" class="sm" :disabled="permissionsSaving" @click="permissionsOpen = false">
          Schließen
        </button>
        <button
          type="button"
          class="primary sm"
          :disabled="permissionsSaving || permissionsLoading"
          @click="savePermissions"
        >
          {{ permissionsSaving ? 'Speichern…' : 'Rechte speichern' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>
