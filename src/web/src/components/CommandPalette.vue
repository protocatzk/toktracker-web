<script setup lang="ts">
import { Search } from '@lucide/vue';
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import type { Component } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  group?: string;
  icon?: Component;
  to?: RouteLocationRaw;
  action?: () => void;
  keywords?: string;
}

const props = defineProps<{
  open: boolean;
  items: CommandItem[];
}>();

const emit = defineEmits<{ close: [] }>();

const router = useRouter();
const query = ref('');
const activeIndex = ref(0);
const inputRef = useTemplateRef<HTMLInputElement>('commandInput');

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return props.items;
  return props.items.filter((item) =>
    `${item.label} ${item.description ?? ''} ${item.keywords ?? ''}`.toLowerCase().includes(needle),
  );
});

const grouped = computed(() => {
  const groups: Array<{ label: string; items: CommandItem[] }> = [];
  for (const item of filtered.value) {
    const label = item.group ?? 'Aktionen';
    let group = groups.find((entry) => entry.label === label);
    if (!group) {
      group = { label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
});

const flat = computed(() => grouped.value.flatMap((group) => group.items));

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    query.value = '';
    activeIndex.value = 0;
    await nextTick();
    inputRef.value?.focus();
  },
);

watch(query, () => {
  activeIndex.value = 0;
});

function onOpenChange(value: boolean): void {
  if (!value) emit('close');
}

function choose(item: CommandItem): void {
  emit('close');
  if (item.action) {
    item.action();
    return;
  }
  if (item.to) void router.push(item.to);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = Math.min(flat.value.length - 1, activeIndex.value + 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = Math.max(0, activeIndex.value - 1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const item = flat.value[activeIndex.value];
    if (item) choose(item);
  }
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="ttw-modal-overlay command-overlay" />
      <DialogContent class="command-content" @keydown="onKeydown">
        <DialogTitle class="sr-only">Befehlspalette</DialogTitle>
        <DialogDescription class="sr-only">
          Navigation und Aktionen durchsuchen
        </DialogDescription>

        <div class="command-input-wrap">
          <Search :size="17" />
          <input
            ref="commandInput"
            v-model="query"
            class="command-input"
            placeholder="Module, Aktionen oder Streamer suchen …"
            autocomplete="off"
            spellcheck="false"
          />
          <kbd>ESC</kbd>
        </div>

        <div v-if="!flat.length" class="ui-empty command-empty">
          Keine Treffer für „{{ query }}“.
        </div>

        <div v-else class="command-list">
          <section v-for="group in grouped" :key="group.label">
            <div class="command-group-label">{{ group.label }}</div>
            <button
              v-for="item in group.items"
              :key="item.id"
              type="button"
              class="command-item"
              :class="{ 'is-active': flat.indexOf(item) === activeIndex }"
              @mouseenter="activeIndex = flat.indexOf(item)"
              @click="choose(item)"
            >
              <span class="command-item-icon">
                <component :is="item.icon" v-if="item.icon" :size="15" />
              </span>
              <span class="command-item-copy">
                <strong>{{ item.label }}</strong>
                <small v-if="item.description">{{ item.description }}</small>
              </span>
            </button>
          </section>
        </div>

        <footer class="command-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigieren</span>
          <span><kbd>↵</kbd> Öffnen</span>
          <span><kbd>ESC</kbd> Schließen</span>
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
