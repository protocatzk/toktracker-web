<script setup lang="ts">
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  User,
} from '@lucide/vue';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

const auth = useAuthStore();
const theme = useThemeStore();
const route = useRoute();
const router = useRouter();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
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
  <div class="login-page">
    <div class="login-orb login-orb--a"></div>
    <div class="login-orb login-orb--b"></div>
    <div class="login-orb login-orb--c"></div>

    <header class="login-topbar">
      <div class="login-brand">
        <span class="shell-brand-mark">
          <Sparkles :size="18" />
        </span>
        <span>
          <strong>TT-INTELLIGENCE</strong>
          <small>EXTERNAL CONSOLE</small>
        </span>
      </div>
      <button
        type="button"
        class="icon-button"
        :title="theme.theme === 'dark' ? 'Light Mode' : 'Dark Mode'"
        @click="theme.toggle()"
      >
        <Sun v-if="theme.theme === 'dark'" :size="17" />
        <Moon v-else :size="17" />
      </button>
    </header>

    <main class="login-main">
      <section class="login-copy">
        <span class="login-kicker">
          <Sparkles :size="13" />
          EXTERN · SECURE BFF
        </span>
        <h1>
          Live Earnings.
          <span>Klarer Blick.</span>
        </h1>
        <p class="login-lead">
          Das externe Kontrollzentrum für TokTracker: Echtzeit-Einnahmen,
          Streamer, Battles und Audience-Intelligence in einer Oberfläche.
        </p>

        <ul class="login-features">
          <li>
            <span class="login-feature-icon"><ShieldCheck :size="15" /></span>
            <span>
              <strong>API-Key bleibt serverseitig</strong>
              <small>Der Browser sieht nie den TokTracker-Admin-Key.</small>
            </span>
          </li>
          <li>
            <span class="login-feature-icon"><User :size="15" /></span>
            <span>
              <strong>Eigene Rollen im BFF</strong>
              <small>Viewer, User, Moderator und Admin mit feiner Rechte-Matrix.</small>
            </span>
          </li>
          <li>
            <span class="login-feature-icon"><LockKeyhole :size="15" /></span>
            <span>
              <strong>Signierte Session</strong>
              <small>HttpOnly-Cookie, CSRF-Origin-Check und Rate-Limit.</small>
            </span>
          </li>
        </ul>

        <div class="login-metrics">
          <div>
            <strong>13</strong>
            <span>Capabilities</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>API-Parität</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>Live-Tracking</span>
          </div>
        </div>
      </section>

      <section class="login-panel">
        <div class="login-card">
          <div class="login-card-head">
            <div>
              <span class="ui-eyebrow">WILLKOMMEN ZURÜCK</span>
              <h2>Anmelden</h2>
              <p>Lokales BFF-Konto verwenden.</p>
            </div>
            <span class="login-card-badge">
              <ShieldCheck :size="15" />
            </span>
          </div>

          <div v-if="auth.bootError" class="status-banner error">
            {{ auth.bootError }}
          </div>

          <form class="login-form" @submit.prevent="submit">
            <label class="login-field">
              <span>Benutzername</span>
              <div class="login-input">
                <User :size="16" />
                <input
                  v-model="username"
                  name="username"
                  autocomplete="username"
                  autocapitalize="none"
                  spellcheck="false"
                  required
                  autofocus
                />
              </div>
            </label>

            <label class="login-field">
              <span>Passwort</span>
              <div class="login-input">
                <LockKeyhole :size="16" />
                <input
                  v-model="password"
                  name="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="button"
                  class="login-eye"
                  :aria-label="showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
            </label>

            <div v-if="error" class="status-banner error">{{ error }}</div>

            <button
              class="ui-btn ui-btn--primary ui-btn--lg login-submit"
              type="submit"
              :disabled="loading"
            >
              <LoaderCircle v-if="loading" :size="17" class="spin" />
              {{ loading ? 'Anmelden…' : 'Anmelden' }}
              <ArrowRight v-if="!loading" :size="17" />
            </button>
          </form>

          <p class="login-note">
            <ShieldCheck :size="12" />
            Kein Telegram-Login · Session bleibt im BFF
          </p>
        </div>

        <p class="login-footer mono">TT-INTELLIGENCE · EXTERNAL CONSOLE · v0.1.0</p>
      </section>
    </main>
  </div>
</template>
