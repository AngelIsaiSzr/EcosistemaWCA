import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { getStoredTheme, setStoredTheme } from "@/lib/theme-storage";

// Función para aplicar el tema
const applyTheme = (theme: string) => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
};

// Inicializar el tema antes de renderizar la aplicación
const initializeTheme = () => {
  const savedTheme = getStoredTheme();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (prefersDark) {
    applyTheme('dark');
    setStoredTheme('dark');
  } else {
    applyTheme('light');
    setStoredTheme('light');
  }
};

// Aplicar el tema inmediatamente
initializeTheme();

// Escuchar cambios en el localStorage de otras pestañas
window.addEventListener('storage', (e) => {
  if (e.key === 'theme' && e.newValue) {
    applyTheme(e.newValue);
  }
});

// Radix puede dejar `pointer-events: none` en <body> si un diálogo se cierra mientras otro
// (o un menú) se está cerrando; eso deja toda la página sin responder a clics.
const OPEN_LAYER_SELECTOR =
  "[role='dialog'][data-state='open'], [role='alertdialog'][data-state='open'], [role='menu'][data-state='open'], [role='listbox'][data-state='open']";
let pointerUnlockTimer: number | undefined;
new MutationObserver(() => {
  if (document.body.style.pointerEvents !== "none") return;
  window.clearTimeout(pointerUnlockTimer);
  pointerUnlockTimer = window.setTimeout(() => {
    if (document.body.style.pointerEvents === "none" && !document.querySelector(OPEN_LAYER_SELECTOR)) {
      document.body.style.pointerEvents = "";
    }
  }, 400);
}).observe(document.body, { attributes: true, attributeFilter: ["style"], childList: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
