<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue';
</script>

<template>
  <ModulePlaceholder
    title="Chat-Intelligence"
    description="Chat-Trends, Session-Analysen und Exporte."
    :endpoints="[
      'GET /api/chat-intelligence/sessions',
      'GET /api/chat-intelligence/analysis',
      'GET /api/chat-intelligence/export',
      'GET /api/chat-logs',
    ]"
    :features="[
      'Session-Liste und Filter',
      'Keyword- und Trend-Analyse',
      'Chat-Verläufe',
      'CSV-Export',
    ]"
  />
</template>
