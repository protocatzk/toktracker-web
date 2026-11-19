<script setup lang="ts">
import PageLoadingOverlay from '@/components/PageLoadingOverlay.vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from '@/api/client';
import type { PublicUser, Role } from '@/api/types';
import ModalDialog from '@/components/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { fmtDate } from '@/utils/format';

interface UserListResponse {
  users: PublicUser[];
}

interface UserForm {
  username: string;
  password: string;
  role: Role;
  grants: string[];
  denies: string[];
  disabled: boolean;
}

const auth = useAuthStore();
const toast = useToastStore();

const users = ref<PublicUser[]>([]);
const loading = ref(false);
const error = ref('');
const modalOpen = ref(false);
const editing = ref<PublicUser | null>(null);
const saving = ref(false);
const formError = ref('');

const form = reactive<UserForm>({
  username: '',
  password: '',
  role: 'viewer',
  grants: [],
  denies: [],
  disabled: false,
});

const isSelf = computed(() => editing.value?.id === auth.user?.id);
const modalTitle = computed(() =>
  editing.value ? `Benutzer „${editing.value.username}“ bearbeiten` : 'Neuen Benutzer anlegen',
);

const roleOptions = computed(() =>
  auth.roles.map((role) => ({ value: role, label: auth.roleLabels[role] ?? role })),
);

const permissionOptions = computed(() =>
  auth.allPermissions.map((permission) => ({
    value: permission,
    label: auth.permissionLabels[permission] ?? permission,
  })),
);

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const payload = await apiGet<UserListResponse>('/auth/users');
    users.value = payload.users;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Benutzer konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
}

function resetForm(): void {
  form.username = '';
  form.password = '';
  form.role = 'viewer';
  form.grants = [];
  form.denies = [];
  form.disabled = false;
  formError.value = '';
}

function openCreate(): void {
  editing.value = null;
  resetForm();
  modalOpen.value = true;
}

function openEdit(user: PublicUser): void {
  editing.value = user;
  resetForm();
  form.username = user.username;
  form.role = user.role;
  form.grants = [...user.grants];
  form.denies = [...user.denies];
  form.disabled = user.disabled;
  modalOpen.value = true;
}

function closeModal(): void {
  if (saving.value) return;
  modalOpen.value = false;
  editing.value = null;
}

function toggleGrant(permission: string, checked: boolean): void {
  if (checked) {
    form.denies = form.denies.filter((entry) => entry !== permission);
    if (!form.grants.includes(permission)) form.grants.push(permission);
  } else {
    form.grants = form.grants.filter((entry) => entry !== permission);
  }
}

function toggleDeny(permission: string, checked: boolean): void {
  if (checked) {
    form.grants = form.grants.filter((entry) => entry !== permission);
    if (!form.denies.includes(permission)) form.denies.push(permission);
  } else {
    form.denies = form.denies.filter((entry) => entry !== permission);
  }
}

async function save(): Promise<void> {
  if (saving.value) return;
  formError.value = '';
  saving.value = true;

  try {
    if (editing.value) {
      const payload: Record<string, unknown> = {
        role: form.role,
        grants: form.grants,
        denies: form.denies,
      };
      if (!isSelf.value) {
        payload.username = form.username.trim();
        payload.disabled = form.disabled;
      }
      if (form.password.trim()) payload.password = form.password;
      await apiPut(`/auth/users/${editing.value.id}`, payload);
      toast.push('Benutzer aktualisiert.', 'success');
    } else {
      await apiPost('/auth/users', {
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        grants: form.grants,
        denies: form.denies,
      });
      toast.push('Benutzer angelegt.', 'success');
    }
    modalOpen.value = false;
    editing.value = null;
    await load();
  } catch (caught) {
    formError.value =
      caught instanceof ApiError || caught instanceof Error
        ? caught.message
        : 'Speichern fehlgeschlagen.';
  } finally {
    saving.value = false;
  }
}

async function remove(user: PublicUser): Promise<void> {
  if (!window.confirm(`Benutzer „${user.username}“ wirklich löschen?`)) return;
  try {
    await apiDelete(`/auth/users/${user.id}`);
    toast.push('Benutzer gelöscht.', 'success');
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Löschen fehlgeschlagen.', 'error');
  }
}

async function toggleDisabled(user: PublicUser): Promise<void> {
  try {
    await apiPut(`/auth/users/${user.id}`, { disabled: !user.disabled });
    await load();
  } catch (caught) {
    toast.push(caught instanceof Error ? caught.message : 'Aktion fehlgeschlagen.', 'error');
  }
}

onMounted(load);
</script>

<template>
  <div class="container">
    <PageLoadingOverlay v-if="loading && !users.length" variant="table" :kpis="4" />
    <div class="ttw-page-head">
      <div>
        <p class="ttw-page-eyebrow">BFF / IDENTITY</p>
        <h2>Lokale Benutzer</h2>
        <p class="section-hint">
          Konten für den externen Login. Getrennt von der TokTracker-Telegram-Whitelist.
        </p>
      </div>
      <div class="toolbar-controls">
        <button type="button" class="primary" @click="openCreate">Neuer Benutzer</button>
      </div>
    </div>

    <div v-if="error" class="status-banner error">{{ error }}</div>

    <section class="box">
      <div class="box-header">
        <div>
          <h2>BFF-Konten</h2>
          <div class="section-hint">
            Rollen und persönliche Rechte werden bei jedem Request im BFF aufgelöst.
          </div>
        </div>
        <span class="status-tag">{{ users.length }} KONTEN</span>
      </div>

      <div v-if="!users.length && !loading" class="ttw-empty">Noch keine Benutzer.</div>

      <div v-else class="table-wrap table-responsive">
        <table>
          <thead>
            <tr>
              <th>Benutzer</th>
              <th>Rolle</th>
              <th>Status</th>
              <th>Persönliche Rechte</th>
              <th>Letzter Login</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" :class="{ 'is-muted': user.disabled }">
              <td>
                <div class="ttw-user-cell">
                  <strong>{{ user.username }}</strong>
                  <span v-if="user.id === auth.user?.id" class="mono muted">DU</span>
                </div>
              </td>
              <td>
                <span class="ttw-role-badge" :class="`role-${user.role}`">
                  {{ auth.roleLabels[user.role] ?? user.role }}
                </span>
              </td>
              <td>
                <span class="ttw-status" :class="user.disabled ? 'is-offline' : 'is-live'">
                  <span class="ttw-status-dot"></span>
                  {{ user.disabled ? 'DEAKTIVIERT' : 'AKTIV' }}
                </span>
              </td>
              <td>
                <div class="ttw-perm-badges">
                  <span
                    v-for="grant in user.grants"
                    :key="`g-${grant}`"
                    class="ttw-perm-badge is-grant"
                    :title="auth.permissionLabels[grant] ?? grant"
                  >
                    +{{ grant }}
                  </span>
                  <span
                    v-for="deny in user.denies"
                    :key="`d-${deny}`"
                    class="ttw-perm-badge is-deny"
                    :title="auth.permissionLabels[deny] ?? deny"
                  >
                    −{{ deny }}
                  </span>
                  <span
                    v-if="!user.grants.length && !user.denies.length"
                    class="muted mono"
                  >
                    Rollenstandard
                  </span>
                </div>
              </td>
              <td class="mono">{{ fmtDate(user.lastLoginAt) }}</td>
              <td>
                <div class="action-group">
                  <button type="button" class="sm" @click="openEdit(user)">Bearbeiten</button>
                  <button
                    v-if="user.id !== auth.user?.id"
                    type="button"
                    class="sm"
                    @click="toggleDisabled(user)"
                  >
                    {{ user.disabled ? 'Aktivieren' : 'Deaktivieren' }}
                  </button>
                  <button
                    v-if="user.id !== auth.user?.id"
                    type="button"
                    class="sm danger"
                    @click="remove(user)"
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

    <ModalDialog :open="modalOpen" :title="modalTitle" wide @close="closeModal">
      <form id="bff-user-form" class="ttw-user-form" @submit.prevent="save">
        <div class="grid-2">
          <label class="ttw-field">
            <span>Benutzername</span>
            <input
              v-model="form.username"
              :disabled="isSelf"
              autocomplete="off"
              minlength="3"
              maxlength="32"
              required
            />
          </label>

          <label class="ttw-field">
            <span>{{ editing ? 'Neues Passwort (optional)' : 'Passwort' }}</span>
            <input
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              :required="!editing"
              minlength="8"
              maxlength="200"
            />
          </label>
        </div>

        <div class="grid-2">
          <label class="ttw-field">
            <span>Rolle</span>
            <select v-model="form.role" :disabled="isSelf">
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label v-if="editing && !isSelf" class="checkbox-label ttw-checkbox-row">
            <input v-model="form.disabled" type="checkbox" />
            Konto deaktiviert
          </label>
        </div>

        <div v-if="isSelf" class="status-banner info">
          Das eigene Konto kann hier nicht herabgestuft oder deaktiviert werden.
        </div>

        <div class="ttw-perm-editor">
          <div class="ttw-perm-editor-head">
            <span>Recht</span>
            <span>Grant</span>
            <span>Deny</span>
          </div>
          <div v-for="permission in permissionOptions" :key="permission.value" class="ttw-perm-row">
            <div>
              <strong>{{ permission.label }}</strong>
              <span class="mono muted">{{ permission.value }}</span>
            </div>
            <input
              type="checkbox"
              :checked="form.grants.includes(permission.value)"
              :aria-label="`${permission.value} gewähren`"
              @change="toggleGrant(permission.value, ($event.target as HTMLInputElement).checked)"
            />
            <input
              type="checkbox"
              :checked="form.denies.includes(permission.value)"
              :aria-label="`${permission.value} entziehen`"
              @change="toggleDeny(permission.value, ($event.target as HTMLInputElement).checked)"
            />
          </div>
        </div>

        <div v-if="formError" class="status-banner error">{{ formError }}</div>
      </form>

      <template #footer>
        <button type="button" class="sm" :disabled="saving" @click="closeModal">Abbrechen</button>
        <button type="submit" form="bff-user-form" class="primary sm" :disabled="saving">
          {{ saving ? 'Speichern…' : 'Speichern' }}
        </button>
      </template>
    </ModalDialog>
  </div>
</template>
