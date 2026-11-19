<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>

<template>
  <ModulePlaceholder
    title="Moderator-Statistiken"
    description="Read-only Statistiken für Moderatoren – ohne Schreibrechte."
    :endpoints="[
      'GET /api/overview',
      'GET /api/analytics',
      'GET /api/battles/stats',
      'GET /api/system/status',
    ]"
    :features="[
      'KPI-Übersicht und Zeitverläufe',
      'Streamer-Rankings',
      'Battle-Statistiken',
      'System- und Worker-Status',
    ]"
  />
</template>
