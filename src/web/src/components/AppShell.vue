<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useToastStore } from '@/stores/toast';

interface NavItem {
  name: string;
  label: string;
  icon: string;
  permission?: string;
}

const navItems: NavItem[] = [
  { name: 'dashboard', label: 'Dashboard', icon: '▦', permission: 'analytics.view' },
  { name: 'stats', label: 'Statistiken', icon: '◫', permission: 'analytics.view' },
  { name: 'donor-radar', label: 'Spender-Radar', icon: '◎', permission: 'radar.view' },
  { name: 'chat-intelligence', label: 'Chat-Intel', icon: '◌', permission: 'chatintel.view' },
  { name: 'site-analytics', label: 'Site-Analytics', icon: '⌁', permission: 'analytics.view' },
  { name: 'access', label: 'Zugriff & Rollen', icon: '⚿', permission: 'users.manage' },
  { name: 'users', label: 'Lokale Benutzer', icon: '☷', permission: 'users.manage' },
  { name: 'settings', label: 'Einstellungen', icon: '⚙', permission: 'settings.manage' },
  { name: 'public-panel', label: 'Public Panel', icon: '↗', permission: 'public.view' },
];

const auth = useAuthStore();
const theme = useThemeStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();
const sidebarOpen = ref(false);

const visibleNav = computed(() => navItems.filter((item) => auth.can(item.permission)));
const title = computed(() => (route.meta.title as string | undefined) ?? 'TokTracker');
const initials = computed(() => (auth.user?.username ?? '?').slice(0, 2).toUpperCase());

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false;
  },
);

async function handleLogout(): Promise<void> {
  await auth.logout();
  toast.push('Abgemeldet.', 'success');
  await router.push({ name: 'login' });
}
</script>

<template>
  <div class="ttw-shell" :class="{ 'is-sidebar-open': sidebarOpen }">
    <aside class="ttw-sidebar">
      <RouterLink :to="{ name: 'dashboard' }" class="ttw-brand" aria-label="Zum Dashboard">
        <span class="ttw-brand-mark">TT</span>
        <span class="ttw-brand-copy">
          <span class="ttw-brand-title">TT-INTELLIGENCE</span>
          <span class="ttw-brand-sub">EXTERNAL CONSOLE</span>
        </span>
      </RouterLink>

      <nav class="ttw-nav" aria-label="Hauptnavigation">
        <span class="ttw-nav-label">Module</span>
        <RouterLink
          v-for="item in visibleNav"
          :key="item.name"
          :to="{ name: item.name }"
          class="ttw-nav-link"
          active-class="is-active"
        >
          <span class="ttw-nav-icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="ttw-nav-text">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="ttw-sidebar-footer">
        <span class="mono">EXTERN · BFF</span>
        <span class="mono">v0.1.0</span>
      </div>
    </aside>

    <div class="ttw-backdrop" @click="sidebarOpen = false"></div>

    <div class="ttw-main">
      <header class="ttw-topbar">
        <button
          type="button"
          class="ttw-icon-btn ttw-menu-btn"
          aria-label="Navigation umschalten"
          @click="sidebarOpen = !sidebarOpen"
        >
          ☰
        </button>

        <div class="ttw-topbar-title">
          <span class="ttw-eyebrow">TT-INTELLIGENCE / EXTERNAL</span>
          <h1>{{ title }}</h1>
        </div>

        <div class="ttw-topbar-actions">
          <button
            type="button"
            class="ttw-icon-btn"
            :title="theme.theme === 'dark' ? 'Light Mode' : 'Dark Mode'"
            @click="theme.toggle()"
          >
            {{ theme.theme === 'dark' ? '☾' : '☀' }}
          </button>

          <template v-if="auth.user">
            <div class="ttw-user" :title="auth.roleLabel">
              <span class="ttw-avatar">{{ initials }}</span>
              <span class="ttw-user-copy">
                <span class="ttw-user-name">{{ auth.user.username }}</span>
                <span class="ttw-user-role">{{ auth.roleLabel }}</span>
              </span>
            </div>
            <button type="button" class="btn sm" @click="handleLogout">Abmelden</button>
          </template>
          <RouterLink v-else :to="{ name: 'login' }" class="btn sm primary">Anmelden</RouterLink>
        </div>
      </header>

      <main class="ttw-content">
        <slot />
      </main>
    </div>
  </div>
</template>
