import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let nextId = 0;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  function push(message: string, type: ToastType = 'info', timeoutMs = 4500): number {
    const id = (nextId += 1);
    toasts.value.push({ id, message, type });
    if (timeoutMs > 0) {
      window.setTimeout(() => dismiss(id), timeoutMs);
    }
    return id;
  }

  return { toasts, push, dismiss };
});
