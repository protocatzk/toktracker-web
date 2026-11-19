<script setup lang="ts">
import { X } from '@lucide/vue';
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    wide?: boolean;
  }>(),
  { wide: false },
);

const emit = defineEmits<{ close: [] }>();

function onOpenChange(value: boolean): void {
  if (!value) emit('close');
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="ttw-modal-overlay" />
      <DialogContent
        class="ttw-modal-content"
        :class="{ 'is-wide': props.wide }"
        @pointer-down-outside="emit('close')"
      >
        <div class="ttw-modal-header">
          <div>
            <DialogTitle class="ttw-modal-title">{{ props.title }}</DialogTitle>
            <DialogDescription class="sr-only">{{ props.title }}</DialogDescription>
          </div>
          <button type="button" class="icon-button" aria-label="Schließen" @click="emit('close')">
            <X :size="17" />
          </button>
        </div>
        <div class="ttw-modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="ttw-modal-footer">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
