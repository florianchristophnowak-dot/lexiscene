import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

const noop = (): void => undefined;

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return noop;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false),
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Reagiert auf das Verlassen des Vollbildmodus – auch über die Escape-Taste des Browsers. */
export function useFullscreenState(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => Boolean(document.fullscreenElement),
    () => false,
  );
}

/**
 * Aktuelle Zeit als Zustand – die Uhr ist eine externe Quelle und darf daher
 * nicht direkt im Render gelesen werden.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
