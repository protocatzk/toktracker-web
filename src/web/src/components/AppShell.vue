<script setup lang="ts">
import {
  Activity,
  BarChart3,
  ChevronDown,
  Command,
  Cpu,
  FileText,
  Gift,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Radar,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Swords,
  UserCog,
  Users,
} from '@lucide/vue';
import { useEventListener } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import type { Component } from 'vue';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import CommandPalette, { type CommandItem } from '@/components/CommandPalette.vue';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useToastStore } from '@/stores/toast';

interface NavItem {
  name: string;
  label: string;
  shortLabel?: string;
  description: string;
  icon: Component;
  permission?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'Übersicht',
    items: [
      {
        name: 'dashboard',
        label: 'Dashboard',
        description: 'KPIs, Live-Status und letzte Aktivität',
        icon: LayoutDashboard,
        permission: 'analytics.view',
      },
      {
        name: 'live',
        label: 'Live',
        description: 'Aktuell live Streamer',
        icon: Radio,
      },
      {
        name: 'streamers',
        label: 'Streamer',
        description: 'Profile, Gruppen und Worker',
        icon: Users,
        permission: 'analytics.view',
      },
      {
        name: 'stats',
        label: 'Statistiken',
        description: 'Analytics, Zeitverläufe und Sessions',
        icon: BarChart3,
        permission: 'analytics.view',
      },
      {
        name: 'battles',
        label: 'Battles',
        description: 'Live-Battles, Ergebnisse und Rivalen',
        icon: Swords,
        permission: 'analytics.view',
      },
      {
        name: 'gifts',
        label: 'Geschenke',
        description: 'Gift-Events manuell buchen',
        icon: Gift,
        permission: 'gifts.book',
      },
    ],
  },
  {
    label: 'Audience',
    items: [
      {
        name: 'donor-radar',
        label: 'Spender-Radar',
        shortLabel: 'Radar',
        description: 'Whales, Loyalty und CRM',
        icon: Radar,
        permission: 'radar.view',
      },
      {
        name: 'chat-intelligence',
        label: 'Chat-Intelligence',
        shortLabel: 'Chat',
        description: 'Chat-Trends und Session-Analyse',
        icon: MessageSquareText,
        permission: 'chatintel.view',
      },
    ],
  },
  {
    label: 'Plattform',
    items: [
      {
        name: 'site-analytics',
        label: 'Site-Analytics',
        shortLabel: 'Site',
        description: 'Traffic, API-Calls und Bot-Sessions',
        icon: Activity,
        permission: 'analytics.view',
      },
      {
        name: 'access',
        label: 'Zugriff & Rollen',
        shortLabel: 'Zugriff',
        description: 'Telegram-Whitelist und Rechte',
        icon: ShieldCheck,
        permission: 'users.manage',
      },
      {
        name: 'users',
        label: 'Lokale Benutzer',
        shortLabel: 'Benutzer',
        description: 'BFF-Konten und Rollen',
        icon: UserCog,
        permission: 'users.manage',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        name: 'reports',
        label: 'Reports',
        description: 'Tagesreport und Telegram-Versand',
        icon: FileText,
        permission: 'analytics.view',
      },
      {
        name: 'system',
        label: 'System',
        description: 'Worker, Docker, Datenbank und Bot',
        icon: Cpu,
        permission: 'system.view',
      },
      {
        name: 'settings',
        label: 'Einstellungen',
        description: 'Kurse, Banner und Revenue-Profile',
        icon: Settings,
        permission: 'settings.manage',
      },
    ],
  },
  {
    label: 'Öffentlich',
    items: [
      {
        name: 'public-panel',
        label: 'Public Panel',
        description: 'Öffentliche Read-only-Ansicht',
        icon: Globe2,
        permission: 'public.view',
      },
    ],
  },
];

const auth = useAuthStore();
const theme = useThemeStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();
const sidebarOpen = ref(false);
const commandOpen = ref(false);

const visibleSections = computed<NavSection[]>(() =>
  navSections
    .map((section) => ({
      label: section.label,
      items: section.items.filter((item) => {
        if (!auth.user && item.name === 'public-panel') return true;
        return auth.can(item.permission);
      }),
    }))
    .filter((section) => section.items.length > 0),
);

const mobilePrimary = computed<NavItem[]>(() => {
  const all = visibleSections.value.flatMap((section) => section.items);
  const preferred = ['dashboard', 'streamers', 'stats', 'donor-radar'];
  const chosen: NavItem[] = [];
  for (const name of preferred) {
    const item = all.find((entry) => entry.name === name);
    if (item) chosen.push(item);
  }
  for (const item of all) {
    if (chosen.length >= 4) break;
    if (!chosen.includes(item)) chosen.push(item);
  }
  return chosen;
});

const title = computed(() => (route.meta.title as string | undefined) ?? 'TokTracker');
const initials = computed(() => (auth.user?.username ?? '?').slice(0, 2).toUpperCase());
const isDark = computed(() => theme.theme === 'dark');

const commandItems = computed<CommandItem[]>(() => {
  const items: CommandItem[] = visibleSections.value.flatMap((section) =>
    section.items.map((item) => ({
      id: `nav-${item.name}`,
      label: item.label,
      description: item.description,
      group: section.label,
      icon: item.icon,
      to: { name: item.name },
      keywords: `${item.name} ${item.shortLabel ?? ''}`,
    })),
  );

  items.push(
    {
      id: 'action-theme',
      label: isDark.value ? 'Light Mode aktivieren' : 'Dark Mode aktivieren',
      description: 'Farbschema wechseln',
      group: 'Aktionen',
      icon: isDark.value ? Sun : Moon,
      action: () => theme.toggle(),
    },
    {
      id: 'action-public',
      label: 'Public Panel öffnen',
      description: 'Öffentliche Read-only-Ansicht',
      group: 'Aktionen',
      icon: Globe2,
      to: { name: 'public-panel' },
    },
  );

  if (auth.user) {
    items.push({
      id: 'action-logout',
      label: 'Abmelden',
      description: 'Session beenden',
      group: 'Aktionen',
      icon: LogOut,
      action: () => void handleLogout(),
    });
  }

  return items;
});

useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  const key = event.key.toLowerCase();
  if ((event.metaKey || event.ctrlKey) && key === 'k') {
    event.preventDefault();
    commandOpen.value = !commandOpen.value;
  }
});

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false;
  },
);

function navigate(name: string): void {
  sidebarOpen.value = false;
  void router.push({ name });
}

async function handleLogout(): Promise<void> {
  await auth.logout();
  toast.push('Abgemeldet.', 'success');
  await router.push({ name: 'login' });
}
</script>

<template>
  <div class="shell" :class="{ 'sidebar-open': sidebarOpen }">
    <a class="skip-link" href="#main">Zum Inhalt springen</a>

    <aside class="shell-sidebar" aria-label="Hauptnavigation">
      <RouterLink :to="{ name: 'dashboard' }" class="shell-brand" aria-label="Zum Dashboard">
        <span class="shell-brand-mark">
          <Sparkles :size="18" />
        </span>
        <span class="shell-brand-copy">
          <span class="shell-brand-title">TT-INTELLIGENCE</span>
          <span class="shell-brand-sub">EXTERNAL CONSOLE</span>
        </span>
      </RouterLink>

      <div class="shell-nav-scroll">
        <nav
          v-for="section in visibleSections"
          :key="section.label"
          class="shell-nav-section"
          :aria-label="section.label"
        >
          <span class="shell-nav-label">{{ section.label }}</span>
          <RouterLink
            v-for="item in section.items"
            :key="item.name"
            :to="{ name: item.name }"
            class="shell-nav-link"
            active-class="active"
            @click="sidebarOpen = false"
          >
            <component :is="item.icon" :size="17" class="shell-nav-icon" />
            <span class="shell-nav-text">{{ item.label }}</span>
          </RouterLink>
        </nav>
      </div>

      <div class="shell-sidebar-footer">
        <span class="shell-status">
          <span class="shell-status-dot"></span>
          BFF verbunden
        </span>
        <span>v0.1.0</span>
      </div>
    </aside>

    <div class="shell-backdrop" @click="sidebarOpen = false"></div>

    <div class="shell-main">
      <header class="shell-topbar">
        <button
          type="button"
          class="icon-button menu-button"
          aria-label="Navigation öffnen"
          @click="sidebarOpen = true"
        >
          <Menu :size="18" />
        </button>

        <div class="shell-heading">
          <span class="shell-eyebrow">TT-INTELLIGENCE / EXTERNAL</span>
          <h1>{{ title }}</h1>
        </div>

        <div class="shell-actions">
          <button
            type="button"
            class="command-trigger"
            aria-label="Befehlspalette öffnen"
            @click="commandOpen = true"
          >
            <Search :size="14" />
            <span>Suche</span>
            <kbd><Command :size="10" /> K</kbd>
          </button>

          <button
            type="button"
            class="icon-button"
            :title="isDark ? 'Light Mode' : 'Dark Mode'"
            :aria-label="isDark ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'"
            @click="theme.toggle()"
          >
            <Sun v-if="isDark" :size="17" />
            <Moon v-else :size="17" />
          </button>

          <DropdownMenuRoot v-if="auth.user">
            <DropdownMenuTrigger as-child>
              <button type="button" class="user-trigger">
                <span class="user-avatar">{{ initials }}</span>
                <span class="user-meta">
                  <strong>{{ auth.user.username }}</strong>
                  <small>{{ auth.roleLabel }}</small>
                </span>
                <ChevronDown :size="13" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent class="ui-dropdown" align="end" :side-offset="8">
                <DropdownMenuLabel class="ui-dropdown-label">
                  {{ auth.user.username }} · {{ auth.roleLabel }}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  v-if="auth.can('users.manage')"
                  class="ui-dropdown-item"
                  @select="navigate('users')"
                >
                  <UserCog :size="15" /> Lokale Benutzer
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-if="auth.can('settings.manage')"
                  class="ui-dropdown-item"
                  @select="navigate('settings')"
                >
                  <Settings :size="15" /> Einstellungen
                </DropdownMenuItem>
                <DropdownMenuItem
                  class="ui-dropdown-item"
                  @select="navigate('public-panel')"
                >
                  <Globe2 :size="15" /> Public Panel
                </DropdownMenuItem>
                <DropdownMenuSeparator class="ui-dropdown-separator" />
                <DropdownMenuItem class="ui-dropdown-item" @select="theme.toggle()">
                  <Sun v-if="isDark" :size="15" />
                  <Moon v-else :size="15" />
                  {{ isDark ? 'Light Mode' : 'Dark Mode' }}
                </DropdownMenuItem>
                <DropdownMenuItem class="ui-dropdown-item" @select="handleLogout">
                  <LogOut :size="15" /> Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>

          <RouterLink v-else :to="{ name: 'login' }" class="ui-btn ui-btn--primary">
            Anmelden
          </RouterLink>
        </div>
      </header>

      <main id="main" class="shell-content">
        <slot />
      </main>

      <nav class="mobile-nav" aria-label="Mobile Navigation">
        <RouterLink
          v-for="item in mobilePrimary"
          :key="item.name"
          :to="{ name: item.name }"
          class="mobile-nav-link"
          active-class="active"
        >
          <component :is="item.icon" :size="19" />
          <span>{{ item.shortLabel ?? item.label }}</span>
        </RouterLink>
        <button type="button" class="mobile-nav-link" @click="sidebarOpen = true">
          <Menu :size="19" />
          <span>Mehr</span>
        </button>
      </nav>
    </div>

    <CommandPalette :open="commandOpen" :items="commandItems" @close="commandOpen = false" />
  </div>
</template>
