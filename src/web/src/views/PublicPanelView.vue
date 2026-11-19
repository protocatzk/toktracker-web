<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>

<template>
  <ModulePlaceholder
    title="Public Panel"
    description="Öffentliche Read-only-Ansicht der Streamer und Einnahmen."
    :endpoints="[
      'GET /api/public/overview',
      'GET /api/public/streamers/:identifier',
      'GET /api/public/battles',
      'GET /api/public/battles/stats',
      'GET /api/public/analytics',
    ]"
    :features="[
      'Öffentliche Streamer-Übersicht',
      'Live-Status und Einnahmen',
      'Battle-Ansicht',
      'Ohne Login erreichbar',
    ]"
  />
</template>
