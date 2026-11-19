<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>

<template>
  <ModulePlaceholder
    title="Einstellungen"
    description="Währungskurse, Polling, Zugriffsmodus und Revenue-Profile."
    :endpoints="[
      'GET/POST /api/settings',
      'GET/POST /api/revenue/profiles',
      'POST /api/revenue/assign',
      'POST /api/demo/seed',
      'POST /api/demo/clear',
    ]"
    :features="[
      'Währungs- und Kurs-Einstellungen',
      'Revenue-Profile zuordnen',
      'Demo-Daten verwalten',
      'Zugriffsmodus anzeigen',
    ]"
  />
</template>
