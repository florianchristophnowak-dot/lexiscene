import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { StoreProvider } from './app/store';
import { ToastProvider } from './ui/Toast';
import { I18nProvider } from './i18n/I18nProvider';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/teach.css';

const container = document.getElementById('root');
if (!container) throw new Error('Wurzelelement #root fehlt.');

createRoot(container).render(
  <StrictMode>
    <StoreProvider>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </StoreProvider>
  </StrictMode>,
);

// Service Worker für die Offline-Nutzung registrieren (nur in Produktionsbuilds).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', document.baseURI);
    navigator.serviceWorker.register(swUrl, { scope: './' }).catch(() => {
      // Ohne Service Worker funktioniert die App weiterhin – nur nicht offline.
    });
  });
}
