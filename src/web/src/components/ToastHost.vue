<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import { useThemeStore } from '@/stores/theme';

const theme = useThemeStore();
</script>

<template>
  <Toaster
    position="bottom-right"
    :theme="theme.theme"
    :duration="4500"
    close-button
    rich-colors
    :expand="false"
    :visible-toasts="4"
    :toast-options="{ class: 'ttw-sonner-toast' }"
  />
</template>
