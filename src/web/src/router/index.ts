import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import DashboardView from '@/views/DashboardView.vue';
import StreamersView from '@/views/StreamersView.vue';
import LoginView from '@/views/LoginView.vue';
import ForbiddenView from '@/views/ForbiddenView.vue';
import NotFoundView from '@/views/NotFoundView.vue';
import StatsView from '@/views/StatsView.vue';
import BattlesView from '@/views/BattlesView.vue';
import GiftsView from '@/views/GiftsView.vue';
import SystemView from '@/views/SystemView.vue';
import AccessView from '@/views/AccessView.vue';
import UsersView from '@/views/UsersView.vue';
import DonorRadarView from '@/views/DonorRadarView.vue';
import ChatIntelligenceView from '@/views/ChatIntelligenceView.vue';
import SiteAnalyticsView from '@/views/SiteAnalyticsView.vue';
import PublicPanelView from '@/views/PublicPanelView.vue';
import SettingsView from '@/views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { title: 'Anmelden', layout: 'blank' },
  },
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: 'Dashboard', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/streamers',
    name: 'streamers',
    component: StreamersView,
    meta: { title: 'Streamer & Gruppen', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsView,
    meta: { title: 'Statistiken', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/battles',
    name: 'battles',
    component: BattlesView,
    meta: { title: 'Battles', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/gifts',
    name: 'gifts',
    component: GiftsView,
    meta: { title: 'Geschenke', requiresAuth: true, permission: 'gifts.book' },
  },
  {
    path: '/donor-radar',
    name: 'donor-radar',
    component: DonorRadarView,
    meta: { title: 'Spender-Radar', requiresAuth: true, permission: 'radar.view' },
  },
  {
    path: '/chat-intelligence',
    name: 'chat-intelligence',
    component: ChatIntelligenceView,
    meta: { title: 'Chat-Intelligence', requiresAuth: true, permission: 'chatintel.view' },
  },
  {
    path: '/site-analytics',
    name: 'site-analytics',
    component: SiteAnalyticsView,
    meta: { title: 'Site-Analytics', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/access',
    name: 'access',
    component: AccessView,
    meta: { title: 'Zugriff & Rollen', requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/users',
    name: 'users',
    component: UsersView,
    meta: { title: 'Lokale Benutzer', requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/system',
    name: 'system',
    component: SystemView,
    meta: { title: 'System & Worker', requiresAuth: true, permission: 'system.view' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: 'Einstellungen', requiresAuth: true, permission: 'settings.manage' },
  },
  {
    path: '/public',
    name: 'public-panel',
    component: PublicPanelView,
    meta: { title: 'Public Panel' },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: ForbiddenView,
    meta: { title: 'Kein Zugriff', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: { title: 'Nicht gefunden', layout: 'blank' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.ensureLoaded();

  if (to.meta.requiresAuth && !auth.user) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { name: 'forbidden' };
  }
  if (to.name === 'login' && auth.user) {
    return { name: 'dashboard' };
  }
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · TokTracker` : 'TokTracker';
});

export default router;
