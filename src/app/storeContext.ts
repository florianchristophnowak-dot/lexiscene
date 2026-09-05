/** Kontext und Typen des zentralen Zustands (getrennt vom Provider, damit Fast Refresh sauber arbeitet). */
import { createContext, useContext, useMemo } from 'react';
import type {
  AppSettings,
  ClassStatus,
  Lexeme,
  MediaKind,
  MediaMeta,
  Sequence,
  StepId,
} from '../domain/model';
import type { RestoreResult } from '../storage/backup';
import type { StorageEstimate } from '../storage/repository';

export interface AppState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  sequences: Sequence[];
  mediaIndex: Record<string, MediaMeta>;
  settings: AppSettings;
}

export interface StoreActions {
  createNewSequence: (partial?: Partial<Sequence>) => Promise<string>;
  duplicateSequence: (id: string) => Promise<string | null>;
  updateSequence: (id: string, patch: Partial<Sequence>) => void;
  setSequenceStep: (id: string, stepId: StepId, enabled: boolean) => void;
  deleteSequence: (id: string) => Promise<void>;
  setArchived: (id: string, archived: boolean) => void;
  addLexeme: (sequenceId: string, partial?: Partial<Lexeme>) => string | null;
  addLexemes: (sequenceId: string, partials: Partial<Lexeme>[]) => number;
  updateLexeme: (sequenceId: string, lexemeId: string, patch: Partial<Lexeme>) => void;
  setLexemeStatus: (sequenceId: string, lexemeId: string, status: ClassStatus | null) => void;
  duplicateLexeme: (sequenceId: string, lexemeId: string) => string | null;
  removeLexeme: (sequenceId: string, lexemeId: string) => void;
  moveLexeme: (sequenceId: string, fromIndex: number, toIndex: number) => void;
  setSession: (sequenceId: string, session: Sequence['session']) => void;
  attachMedia: (sequenceId: string, lexemeId: string, kind: MediaKind, file: File) => Promise<void>;
  detachMedia: (sequenceId: string, lexemeId: string, kind: MediaKind) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  seedDemoSequence: () => Promise<string>;
  importSequences: (sequences: Sequence[]) => Promise<number>;
  restoreBackup: (result: RestoreResult) => Promise<void>;
  createBackup: () => Promise<Blob>;
  cleanUpMedia: () => Promise<number>;
  storageEstimate: () => Promise<StorageEstimate | null>;
  flushPendingSaves: () => Promise<void>;
}

export interface StoreValue {
  state: AppState;
  actions: StoreActions;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore muss innerhalb von StoreProvider verwendet werden.');
  return value;
}

export function useSequence(id: string | undefined): Sequence | undefined {
  const { state } = useStore();
  return useMemo(() => state.sequences.find((sequence) => sequence.id === id), [id, state.sequences]);
}
