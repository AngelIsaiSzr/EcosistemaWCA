import { useEffect, useState } from 'react';
import { getStoredTheme, setStoredTheme, type Theme } from '@/lib/theme-storage';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return getStoredTheme() ?? 'dark';
  });

  // Manejar cambios de tema
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    setStoredTheme(theme);
  }, [theme]);

  // Escuchar cambios en otras pestañas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setTheme(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Al volver a la pestaña, tomar el tema elegido en otro subdominio
  useEffect(() => {
    const syncFromCookie = () => {
      if (document.visibilityState !== 'visible') return;
      const stored = getStoredTheme();
      if (stored) setTheme(stored);
    };
    document.addEventListener('visibilitychange', syncFromCookie);
    return () => document.removeEventListener('visibilitychange', syncFromCookie);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme };
}
