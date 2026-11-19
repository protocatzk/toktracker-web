<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>

<template>
  <ModulePlaceholder
    title="Zugriff &amp; Rollen"
    description="TokTracker-Telegram-Whitelist, Rollen und persönliche Rechte verwalten."
    :endpoints="[
      'GET/POST /api/telegram/users',
      'PUT/DELETE /api/telegram/users/:id',
      'GET/PUT /api/telegram/users/:id/permissions',
      'GET/POST /api/settings',
    ]"
    :features="[
      'Whitelist und offene Anfragen',
      'Rollen: viewer, user, moderator, admin',
      'Persönliche Grants und Denies',
      'Zugriffsmodus und Settings',
    ]"
  />
</template>
