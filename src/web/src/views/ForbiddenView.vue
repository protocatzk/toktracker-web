<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="container">
    <div class="box ttw-centered-box">
      <span class="ttw-error-code">403</span>
      <h2>Kein Zugriff</h2>
      <p class="section-hint">
        Dein lokales BFF-Konto hat nicht die nötigen Rechte für diesen Bereich.
      </p>
      <RouterLink :to="{ name: 'dashboard' }" class="btn primary">Zum Dashboard</RouterLink>
    </div>
  </div>
</template>
