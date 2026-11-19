import { defineStore } from 'pinia';
import { ref } from 'vue';

const THEME_KEY = 'toktracker-web-theme';
export type Theme = 'dark' | 'light';

function storedTheme(): Theme | null {
  const value = localStorage.getItem(THEME_KEY);
  return value === 'dark' || value === 'light' ? value : null;
}

function initialTheme(): Theme {
  const stored = storedTheme();
  if (stored) return stored;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(initialTheme());

  function apply(): void {
    document.documentElement.dataset.theme = theme.value;
    localStorage.setItem(THEME_KEY, theme.value);
    const meta = document.getElementById('metaThemeColor');
    if (meta) meta.setAttribute('content', theme.value === 'light' ? '#f3f6fb' : '#070a0f');
  }

  function setTheme(next: Theme): void {
    if (next === theme.value) return;

    const update = () => {
      theme.value = next;
      apply();
    };

    const doc = document as ViewTransitionDocument;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reducedMotion) {
      doc.startViewTransition(update);
    } else {
      update();
    }
  }

  function toggle(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  }

  apply();

  return { theme, apply, setTheme, toggle };
});
