<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>

<template>
  <ModulePlaceholder
    title="Spender-Radar"
    description="Whales, Stammspender, CRM und Chatlogs auswerten."
    :endpoints="[
      'GET /api/donor-radar',
      'GET /api/donor-radar/donors/:username',
      'GET /api/donor-radar/whale-alerts',
      'GET /api/donor-radar/loyalty-and-overlap',
      'GET /api/chat-logs',
      'POST /api/donor-radar/donors/:username/crm',
      'POST /api/donor-radar/donors/:username/toggle-vip',
    ]"
    :features="[
      'Whale- und Loyalty-Erkennung',
      'Spender-Dossiers und CRM-Notizen',
      'VIP-Markierungen',
      'Chatlog-Suche',
    ]"
  />
</template>
