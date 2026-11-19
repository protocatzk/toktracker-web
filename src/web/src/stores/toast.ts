import { defineStore } from 'pinia';
import { toast } from 'vue-sonner';

export type ToastType = 'info' | 'success' | 'error';

export const useToastStore = defineStore('toast', () => {
  function push(message: string, type: ToastType = 'info', timeoutMs = 4500): void {
    const options = { duration: timeoutMs };
    if (type === 'success') {
      toast.success(message, options);
    } else if (type === 'error') {
      toast.error(message, options);
    } else {
      toast(message, options);
    }
  }

  return { push };
});
