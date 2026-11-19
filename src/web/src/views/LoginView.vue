<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

function safeRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

async function submit(): Promise<void> {
  if (loading.value) return;
  error.value = '';
  loading.value = true;
  try {
    await auth.login(username.value.trim(), password.value);
    await router.replace(safeRedirect(route.query.redirect));
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Anmeldung fehlgeschlagen.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="ttw-login-page">
    <section class="ttw-login-aside">
      <div class="ttw-login-brand">
        <span class="ttw-brand-mark">TT</span>
        <div>
          <div class="ttw-brand-title">TT-INTELLIGENCE</div>
          <div class="ttw-brand-sub">EXTERNAL CONSOLE</div>
        </div>
      </div>

      <h1>Live Earnings.<br />Externer Zugriff.</h1>
      <p class="ttw-login-lead">
        Eigenständiges Dashboard für TokTracker – mit lokalem BFF-Login, eigener
        Rechte-Matrix und ohne direkten API-Key im Browser.
      </p>

      <ul class="ttw-login-points">
        <li><span>01</span> API-Key bleibt ausschließlich serverseitig</li>
        <li><span>02</span> Rollen wie Viewer, User, Moderator und Admin</li>
        <li><span>03</span> Alle TokTracker-Module in einer Oberfläche</li>
      </ul>

      <div class="ttw-login-meta mono">
        <span>GATEWAY: BFF</span>
        <span>SESSION: SIGNED</span>
      </div>
    </section>

    <section class="ttw-login-panel">
      <div class="box ttw-login-card">
        <div class="box-header">
          <div>
            <h2>Anmelden</h2>
            <div class="section-hint">Lokales BFF-Konto verwenden.</div>
          </div>
          <span class="status-tag">EXTERN</span>
        </div>

        <div v-if="auth.bootError" class="status-banner error">
          {{ auth.bootError }}
        </div>

        <form class="ttw-login-form" @submit.prevent="submit">
          <label class="ttw-field">
            <span>Benutzername</span>
            <input
              v-model="username"
              name="username"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              required
              autofocus
            />
          </label>

          <label class="ttw-field">
            <span>Passwort</span>
            <input
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>

          <div v-if="error" class="status-banner error">{{ error }}</div>

          <button class="primary ttw-login-submit" type="submit" :disabled="loading">
            {{ loading ? 'Anmelden…' : 'Anmelden →' }}
          </button>
        </form>

        <p class="ttw-login-note mono">
          Kein Telegram-Login · lokale Benutzerverwaltung im BFF
        </p>
      </div>
    </section>
  </div>
</template>
