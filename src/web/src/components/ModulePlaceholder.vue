<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description: string;
    endpoints?: string[];
    features?: string[];
  }>(),
  {
    endpoints: () => [],
    features: () => [],
  },
);
</script>

<template>
  <div class="container">
    <div class="box">
      <div class="box-header">
        <div>
          <h2>{{ title }}</h2>
          <div class="section-hint">{{ description }}</div>
        </div>
        <span class="status-tag">IN ARBEIT</span>
      </div>

      <div class="ttw-placeholder-grid">
        <div v-if="features.length" class="ttw-placeholder-block">
          <h3>Geplante Funktionen</h3>
          <ul class="ttw-check-list">
            <li v-for="feature in features" :key="feature">{{ feature }}</li>
          </ul>
        </div>

        <div v-if="endpoints.length" class="ttw-placeholder-block">
          <h3>TokTracker-Endpunkte</h3>
          <ul class="ttw-endpoint-list">
            <li v-for="endpoint in endpoints" :key="endpoint">
              <code>{{ endpoint }}</code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
