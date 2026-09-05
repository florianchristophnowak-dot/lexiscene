/** Sehr einfacher Hash-Router – ohne Abhängigkeit, offlinefähig. */
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'prepare'; sequenceId?: string }
  | { name: 'teach'; sequenceId: string }
  | { name: 'reactivate'; sequenceId?: string }
  | { name: 'data' }
  | { name: 'help' };

const SEGMENTS = {
  prepare: 'vorbereiten',
  teach: 'unterrichten',
  reactivate: 'reaktivieren',
  data: 'daten',
  help: 'hilfe',
} as const;

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');
  const [segment = '', rawId = ''] = path.split('/');
  const id = rawId ? decodeURIComponent(rawId) : '';

  switch (segment) {
    case SEGMENTS.prepare:
      return { name: 'prepare', sequenceId: id || undefined };
    case SEGMENTS.teach:
      return id ? { name: 'teach', sequenceId: id } : { name: 'home' };
    case SEGMENTS.reactivate:
      return { name: 'reactivate', sequenceId: id || undefined };
    case SEGMENTS.data:
      return { name: 'data' };
    case SEGMENTS.help:
      return { name: 'help' };
    default:
      return { name: 'home' };
  }
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'prepare':
      return route.sequenceId ? `#/${SEGMENTS.prepare}/${encodeURIComponent(route.sequenceId)}` : `#/${SEGMENTS.prepare}`;
    case 'teach':
      return `#/${SEGMENTS.teach}/${encodeURIComponent(route.sequenceId)}`;
    case 'reactivate':
      return route.sequenceId ? `#/${SEGMENTS.reactivate}/${encodeURIComponent(route.sequenceId)}` : `#/${SEGMENTS.reactivate}`;
    case 'data':
      return `#/${SEGMENTS.data}`;
    case 'help':
      return `#/${SEGMENTS.help}`;
    default:
      return '#/';
  }
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const hash = toHash(route);
  if (options.replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handle = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  return route;
}
