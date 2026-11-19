import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';


const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Anmelden', layout: 'blank' },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: 'Dashboard', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/streamers',
    name: 'streamers',
    component: () => import('@/views/StreamersView.vue'),
    meta: { title: 'Streamer & Gruppen', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('@/views/StatsView.vue'),
    meta: { title: 'Statistiken', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/battles',
    name: 'battles',
    component: () => import('@/views/BattlesView.vue'),
    meta: { title: 'Battles', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/gifts',
    name: 'gifts',
    component: () => import('@/views/GiftsView.vue'),
    meta: { title: 'Geschenke', requiresAuth: true, permission: 'gifts.book' },
  },
  {
    path: '/donor-radar',
    name: 'donor-radar',
    component: () => import('@/views/DonorRadarView.vue'),
    meta: { title: 'Spender-Radar', requiresAuth: true, permission: 'radar.view' },
  },
  {
    path: '/chat-intelligence',
    name: 'chat-intelligence',
    component: () => import('@/views/ChatIntelligenceView.vue'),
    meta: { title: 'Chat-Intelligence', requiresAuth: true, permission: 'chatintel.view' },
  },
  {
    path: '/site-analytics',
    name: 'site-analytics',
    component: () => import('@/views/SiteAnalyticsView.vue'),
    meta: { title: 'Site-Analytics', requiresAuth: true, permission: 'analytics.view' },
  },
  {
    path: '/access',
    name: 'access',
    component: () => import('@/views/AccessView.vue'),
    meta: { title: 'Zugriff & Rollen', requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/UsersView.vue'),
    meta: { title: 'Lokale Benutzer', requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/system',
    name: 'system',
    component: () => import('@/views/SystemView.vue'),
    meta: { title: 'System & Worker', requiresAuth: true, permission: 'system.view' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { title: 'Einstellungen', requiresAuth: true, permission: 'settings.manage' },
  },
  {
    path: '/public',
    name: 'public-panel',
    component: () => import('@/views/PublicPanelView.vue'),
    meta: { title: 'Public Panel' },
  },
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { title: 'Kein Zugriff', requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
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
