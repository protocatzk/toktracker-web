import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { setUnauthorizedHandler } from './api/client';
import { useAuthStore } from './stores/auth';
import 'vue-sonner/style.css';
import './styles/brand.css';
import './styles/style.css';
import './styles/login.css';
import './styles/stats.css';
import './styles/access.css';
import './styles/donor_radar.css';
import './styles/chat_intelligence.css';
import './styles/site_analytics.css';
import './styles/app.css';
import './styles/theme.css';

const savedTheme = localStorage.getItem('toktracker-web-theme');
document.documentElement.dataset.theme = savedTheme === 'light' ? 'light' : 'dark';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

const auth = useAuthStore(pinia);
setUnauthorizedHandler(() => {
  auth.reset();
  const current = router.currentRoute.value;
  if (current.name !== 'login') {
    void router.replace({ name: 'login', query: { redirect: current.fullPath } });
  }
});

void auth.ensureLoaded();

app.mount('#app');
