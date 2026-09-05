import { useEffect } from 'react';
import { APP_NAME, APP_VERSION } from './domain/model';
import { navigate, useRoute, type Route } from './app/router';
import { useStore } from './app/storeContext';
import { LoadingState, Notice } from './ui/Feedback';
import { Button } from './ui/Button';
import { HomeView } from './views/HomeView';
import { PrepareView } from './views/PrepareView';
import { TeachView } from './views/TeachView';
import { ReactivateView } from './views/ReactivateView';
import { DataView } from './views/DataView';
import { HelpView } from './views/HelpView';

const NAV_ITEMS: { label: string; route: Route; match: Route['name'][] }[] = [
  { label: 'Start', route: { name: 'home' }, match: ['home'] },
  { label: 'Vorbereiten', route: { name: 'prepare' }, match: ['prepare'] },
  { label: 'Reaktivieren', route: { name: 'reactivate' }, match: ['reactivate'] },
  { label: 'Daten', route: { name: 'data' }, match: ['data'] },
  { label: 'Hilfe', route: { name: 'help' }, match: ['help'] },
];

function useThemePreference(): void {
  const { state } = useStore();
  const theme = state.settings.theme;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = theme;
  }, [theme]);
}

export default function App() {
  const route = useRoute();
  const { state } = useStore();
  useThemePreference();

  if (state.status === 'loading') {
    return (
      <div className="app">
        <main className="app__main">
          <LoadingState />
        </main>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="app">
        <main className="app__main">
          <div className="page">
            <h1 className="page__title">Lokale Daten nicht verfügbar</h1>
            <Notice tone="error">{state.error ?? 'Unbekannter Fehler.'}</Notice>
            <p className="muted">
              LexiScène speichert alle Inhalte im Browser dieses Geräts. Im privaten Modus oder bei blockiertem
              Speicher steht diese Ablage nicht zur Verfügung.
            </p>
            <div className="row">
              <Button variant="primary" onClick={() => window.location.reload()}>
                Erneut versuchen
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Unterrichtsmodus: bewusst ohne Kopf- und Fußzeile.
  if (route.name === 'teach') {
    return <TeachView sequenceId={route.sequenceId} />;
  }

  return (
    <div className="app">
      <a className="skip-link" href="#hauptbereich">
        Zum Hauptbereich springen
      </a>
      <header className="app__header">
        <button type="button" className="app__brand" onClick={() => navigate({ name: 'home' })}>
          {APP_NAME}
        </button>
        <nav className="app__nav" aria-label="Hauptbereiche">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.match.includes(route.name) ? 'nav-link nav-link--active' : 'nav-link'}
              aria-current={item.match.includes(route.name) ? 'page' : undefined}
              onClick={() => navigate(item.route)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app__main" id="hauptbereich">
        {route.name === 'home' ? <HomeView /> : null}
        {route.name === 'prepare' ? <PrepareView sequenceId={route.sequenceId} /> : null}
        {route.name === 'reactivate' ? <ReactivateView sequenceId={route.sequenceId} /> : null}
        {route.name === 'data' ? <DataView /> : null}
        {route.name === 'help' ? <HelpView /> : null}
      </main>

      <footer className="app__footer">
        {APP_NAME} · Version {APP_VERSION} · © Florian Nowak
      </footer>
    </div>
  );
}
