import { ref } from 'vue';

export const routeLoading = ref(false);

let hideTimer: number | undefined;

export function startRouteLoading(): void {
  if (hideTimer !== undefined) {
    window.clearTimeout(hideTimer);
    hideTimer = undefined;
  }
  routeLoading.value = true;
}

export function stopRouteLoading(): void {
  if (hideTimer !== undefined) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    routeLoading.value = false;
    hideTimer = undefined;
  }, 180);
}
