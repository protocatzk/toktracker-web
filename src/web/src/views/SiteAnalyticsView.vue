<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>

<template>
  <ModulePlaceholder
    title="Site-Analytics"
    description="Web-Traffic, Besucher, Bot-Sessions und API-Aufrufe."
    :endpoints="['GET /api/site-analytics', 'GET /api/site-analytics/api-calls']"
    :features="[
      'Traffic- und Besucherzahlen',
      'Bot-Session-Übersicht',
      'API-Call-Logs',
      'Zeitraum-Filter',
    ]"
  />
</template>
