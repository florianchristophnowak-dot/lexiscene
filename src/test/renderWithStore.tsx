import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { DEFAULT_SETTINGS, type Sequence } from '../domain/model';
import { StoreContext, type AppState, type StoreActions, type StoreValue } from '../app/storeContext';
import { I18nProvider } from '../i18n/I18nProvider';
import { ToastContext } from '../ui/toastContext';

/** Aktionen als Attrappen – die Tests prüfen die Oberfläche, nicht die Datenbank. */
export function createTestActions(overrides: Partial<StoreActions> = {}): StoreActions {
  return {
    createNewSequence: vi.fn().mockResolvedValue('seq_neu'),
    duplicateSequence: vi.fn().mockResolvedValue('seq_kopie'),
    updateSequence: vi.fn(),
    setSequenceStep: vi.fn(),
    deleteSequence: vi.fn().mockResolvedValue(undefined),
    setArchived: vi.fn(),
    addLexeme: vi.fn().mockReturnValue('lex_neu'),
    addLexemes: vi.fn().mockReturnValue(0),
    updateLexeme: vi.fn(),
    recordObservation: vi.fn().mockReturnValue('obs_neu'),
    removeObservation: vi.fn(),
    completeReactivationRound: vi.fn(),
    duplicateLexeme: vi.fn().mockReturnValue('lex_kopie'),
    removeLexeme: vi.fn(),
    moveLexeme: vi.fn(),
    setSession: vi.fn(),
    attachMedia: vi.fn().mockResolvedValue(undefined),
    detachMedia: vi.fn().mockResolvedValue(undefined),
    updateSettings: vi.fn(),
    seedDemoSequence: vi.fn().mockResolvedValue('seq_demo'),
    importSequences: vi.fn().mockResolvedValue(0),
    restoreBackup: vi.fn().mockResolvedValue(undefined),
    createBackup: vi.fn().mockResolvedValue(new Blob()),
    cleanUpMedia: vi.fn().mockResolvedValue(0),
    storageEstimate: vi.fn().mockResolvedValue(null),
    flushPendingSaves: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export interface TestRender extends RenderResult {
  actions: StoreActions;
}

export function renderWithStore(
  ui: ReactElement,
  sequences: Sequence[],
  options: { actions?: Partial<StoreActions>; state?: Partial<AppState> } = {},
): TestRender {
  const actions = createTestActions(options.actions);
  const value: StoreValue = {
    state: {
      status: 'ready',
      error: null,
      sequences,
      mediaIndex: {},
      settings: { ...DEFAULT_SETTINGS },
      ...options.state,
    },
    actions,
  };

  const result = render(
    <StoreContext.Provider value={value}>
      <I18nProvider>
        <ToastContext.Provider value={{ show: vi.fn() }}>{ui}</ToastContext.Provider>
      </I18nProvider>
    </StoreContext.Provider>,
  );

  return Object.assign(result, { actions });
}
