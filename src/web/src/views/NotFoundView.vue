<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="ttw-login-page">
    <section class="ttw-login-panel ttw-login-panel--full">
      <div class="box ttw-login-card ttw-centered-box">
        <span class="ttw-error-code">404</span>
        <h2>Seite nicht gefunden</h2>
        <p class="section-hint">Diese Route existiert im externen Dashboard nicht.</p>
        <RouterLink :to="{ name: 'dashboard' }" class="btn primary">Zum Dashboard</RouterLink>
      </div>
    </section>
  </div>
</template>
