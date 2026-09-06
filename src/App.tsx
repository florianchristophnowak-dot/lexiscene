import { useEffect } from 'react';
import { APP_NAME, APP_VERSION } from './domain/model';
import { navigate, useRoute, type Route } from './app/router';
import { useStore } from './app/storeContext';
import { useT } from './i18n/context';
import type { TranslationKey } from './i18n';
import { LoadingState, Notice } from './ui/Feedback';
import { Button } from './ui/Button';
import { HomeView } from './views/HomeView';
import { PrepareView } from './views/PrepareView';
import { TeachView } from './views/TeachView';
import { ReactivateView } from './views/ReactivateView';
import { ReactivateTeachView } from './views/ReactivateTeachView';
import { ProjectionView } from './views/ProjectionView';
import { DataView } from './views/DataView';
import { HelpView } from './views/HelpView';

const NAV_ITEMS: { key: TranslationKey; route: Route; match: Route['name'][] }[] = [
  { key: 'nav.home', route: { name: 'home' }, match: ['home'] },
  { key: 'nav.prepare', route: { name: 'prepare' }, match: ['prepare'] },
  { key: 'nav.reactivate', route: { name: 'reactivate' }, match: ['reactivate', 'reactivateTeach'] },
  { key: 'nav.data', route: { name: 'data' }, match: ['data'] },
  { key: 'nav.help', route: { name: 'help' }, match: ['help'] },
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
  const t = useT();
  useThemePreference();

  if (state.status === 'loading') {
    return (
      <div className="app">
        <main className="app__main">
          <LoadingState label={t('app.loading')} />
        </main>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="app">
        <main className="app__main">
          <div className="page">
            <h1 className="page__title">{t('app.error.title')}</h1>
            <Notice tone="error">{state.error ?? t('app.error.unknown')}</Notice>
            <p className="muted">{t('app.error.hint', { name: APP_NAME })}</p>
            <div className="row">
              <Button variant="primary" onClick={() => window.location.reload()}>
                {t('app.error.retry')}
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

  if (route.name === 'reactivateTeach') {
    return <ReactivateTeachView sequenceId={route.sequenceId} />;
  }

  // Projektionsfenster: nur die Bühne, keine Bedienelemente.
  if (route.name === 'projection') {
    return <ProjectionView sequenceId={route.sequenceId} />;
  }

  return (
    <div className="app">
      <a className="skip-link" href="#hauptbereich">
        {t('app.skipLink')}
      </a>
      <header className="app__header">
        <button type="button" className="app__brand" onClick={() => navigate({ name: 'home' })}>
          {APP_NAME}
        </button>
        <nav className="app__nav" aria-label={t('app.nav.label')}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.match.includes(route.name) ? 'nav-link nav-link--active' : 'nav-link'}
              aria-current={item.match.includes(route.name) ? 'page' : undefined}
              onClick={() => navigate(item.route)}
            >
              {t(item.key)}
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

      <footer className="app__footer">{t('app.footer', { name: APP_NAME, version: APP_VERSION })}</footer>
    </div>
  );
}
