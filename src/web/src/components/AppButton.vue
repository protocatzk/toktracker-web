<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue';
import { computed, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    iconOnly?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    loading: false,
    iconOnly: false,
    type: 'button',
  },
);

const attrs = useAttrs();
const disabled = computed(() => props.loading || 'disabled' in attrs);
</script>

<template>
  <button
    v-bind="attrs"
    :type="props.type"
    class="ui-btn"
    :class="[
      `ui-btn--${props.variant}`,
      props.size !== 'md' ? `ui-btn--${props.size}` : '',
      { 'ui-btn--icon': props.iconOnly },
    ]"
    :disabled="disabled"
  >
    <LoaderCircle v-if="props.loading" :size="15" class="spin" />
    <slot />
  </button>
</template>
