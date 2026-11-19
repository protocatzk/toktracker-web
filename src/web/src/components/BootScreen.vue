<script setup lang="ts">
import { Sparkles } from '@lucide/vue';
</script>

<template>
  <div class="boot-screen" role="status" aria-busy="true" aria-live="polite">
    <div class="boot-glow boot-glow--a"></div>
    <div class="boot-glow boot-glow--b"></div>

    <div class="boot-brand">
      <span class="boot-mark">
        <Sparkles :size="24" />
      </span>
      <strong>TT-INTELLIGENCE</strong>
      <small>EXTERNAL CONSOLE</small>
    </div>

    <div class="boot-bar" aria-hidden="true">
      <span></span>
    </div>
    <p class="boot-caption mono">Console wird geladen …</p>
  </div>
</template>
