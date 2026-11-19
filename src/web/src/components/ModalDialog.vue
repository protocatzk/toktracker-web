<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    wide?: boolean;
  }>(),
  { wide: false },
);

const emit = defineEmits<{ close: [] }>();

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) emit('close');
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : '';
  },
  { immediate: true },
);

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <div
        class="modal-dialog"
        :style="wide ? { maxWidth: '980px' } : undefined"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="btn-close" type="button" aria-label="Schließen" @click="emit('close')">
            ×
          </button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
