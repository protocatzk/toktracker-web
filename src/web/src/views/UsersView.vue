<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>

<template>
  <ModulePlaceholder
    title="Lokale Benutzer"
    description="BFF-Konten für den externen Login – getrennt von der TokTracker-Telegram-Whitelist."
    :endpoints="[
      'GET /auth/users',
      'POST /auth/users',
      'PUT /auth/users/:id',
      'DELETE /auth/users/:id',
      'POST /auth/password',
    ]"
    :features="[
      'Benutzer anlegen und deaktivieren',
      'Rollen und persönliche Rechte',
      'Passwort zurücksetzen',
      'Letzter Admin ist geschützt',
    ]"
  />
</template>
