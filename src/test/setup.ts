import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// Ohne globale Testfunktionen registriert Testing Library die Aufräumroutine
// nicht selbst – in DOM-Umgebungen wird sie hier nachgereicht.
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(() => cleanup());
}
