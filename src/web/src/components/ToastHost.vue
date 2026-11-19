<script setup lang="ts">
import { useToastStore } from '@/stores/toast';

const toast = useToastStore();
</script>

<template>
  <TransitionGroup name="ttw-toast" tag="div" class="ttw-toast-host" aria-live="polite">
    <button
      v-for="entry in toast.toasts"
      :key="entry.id"
      type="button"
      class="ttw-toast"
      :class="`is-${entry.type}`"
      @click="toast.dismiss(entry.id)"
    >
      <span class="ttw-toast-dot" aria-hidden="true"></span>
      <span>{{ entry.message }}</span>
    </button>
  </TransitionGroup>
</template>
