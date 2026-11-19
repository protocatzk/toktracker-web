import { defineStore } from 'pinia';
import { ref } from 'vue';

const THEME_KEY = 'toktracker-web-theme';
export type Theme = 'dark' | 'light';

function initialTheme(): Theme {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(initialTheme());

  function apply(): void {
    document.documentElement.dataset.theme = theme.value;
    localStorage.setItem(THEME_KEY, theme.value);
    const meta = document.getElementById('metaThemeColor');
    if (meta) meta.setAttribute('content', theme.value === 'light' ? '#f2f5f8' : '#0b0e13');
  }

  function toggle(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
    apply();
  }

  apply();

  return { theme, apply, toggle };
});
