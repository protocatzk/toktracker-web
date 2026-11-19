import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ApiError, apiGet, apiPost } from '@/api/client';
import type { AuthPayload, PublicUser, Role } from '@/api/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<PublicUser | null>(null);
  const permissions = ref<string[]>([]);
  const roles = ref<Role[]>([]);
  const roleLabels = ref<Record<string, string>>({});
  const permissionLabels = ref<Record<string, string>>({});
  const allPermissions = ref<string[]>([]);
  const loaded = ref(false);
  const loading = ref(false);
  const bootError = ref('');

  let loadingPromise: Promise<void> | null = null;

  function apply(payload: AuthPayload): void {
    user.value = payload.user;
    permissions.value = [...payload.permissions];
    roles.value = [...payload.roles];
    roleLabels.value = { ...payload.roleLabels };
    permissionLabels.value = { ...payload.permissionLabels };
    allPermissions.value = [...payload.allPermissions];
    bootError.value = '';
  }

  function reset(): void {
    user.value = null;
    permissions.value = [];
    roles.value = [];
    roleLabels.value = {};
    permissionLabels.value = {};
    allPermissions.value = [];
    loaded.value = true;
  }

  async function fetchMe(): Promise<void> {
    loading.value = true;
    try {
      const payload = await apiGet<AuthPayload>('/auth/me');
      apply(payload);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        reset();
      } else {
        bootError.value =
          error instanceof Error ? error.message : 'Der BFF ist nicht erreichbar.';
        reset();
      }
    } finally {
      loading.value = false;
      loaded.value = true;
    }
  }

  async function ensureLoaded(): Promise<void> {
    if (loaded.value) return;
    if (!loadingPromise) {
      loadingPromise = fetchMe().finally(() => {
        loadingPromise = null;
      });
    }
    await loadingPromise;
  }

  async function login(username: string, password: string): Promise<PublicUser> {
    const payload = await apiPost<AuthPayload & { ok: boolean }>('/auth/login', {
      username,
      password,
    });
    apply(payload);
    loaded.value = true;
    return payload.user;
  }

  async function logout(): Promise<void> {
    try {
      await apiPost('/auth/logout');
    } finally {
      reset();
    }
  }

  function can(permission?: string | null): boolean {
    if (!permission) return true;
    return permissions.value.includes(permission);
  }

  const isAdmin = computed(() => user.value?.role === 'admin');
  const roleLabel = computed(() =>
    user.value ? (roleLabels.value[user.value.role] ?? user.value.role) : '',
  );

  return {
    user,
    permissions,
    roles,
    roleLabels,
    permissionLabels,
    allPermissions,
    loaded,
    loading,
    bootError,
    isAdmin,
    roleLabel,
    apply,
    reset,
    fetchMe,
    ensureLoaded,
    login,
    logout,
    can,
  };
});
