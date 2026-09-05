/**
 * Zentraler Zustand der App.
 *
 * Jede Änderung wird sofort in den React-Zustand übernommen und kurz verzögert
 * in die lokale Datenbank geschrieben (Autospeichern). Beim Verlassen der Seite
 * werden ausstehende Schreibvorgänge sofort ausgeführt.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type AppSettings, type Lexeme, type MediaMeta, type MediaKind, type MediaRecord, type Sequence } from '../domain/model';
import { createDemoSequence } from '../domain/demo';
import { createId, createLexeme, createSequence } from '../domain/schema';
import { createObservation } from '../domain/observations';
import { completeRound, impulseDimension } from '../domain/reactivation';
import { buildBackup } from '../storage/backup';
import {
  estimateStorage,
  loadAllMedia,
  loadMediaIndex,
  loadSequences,
  loadSettings,
  pruneMedia,
  removeMedia,
  removeSequence,
  replaceAll,
  saveMedia,
  saveSequence,
  saveSettings,
} from '../storage/repository';
import { clearMediaUrls, mediaKindFromMime } from './media';
import { StoreContext, type AppState, type StoreActions, type StoreValue } from './storeContext';

const SAVE_DELAY_MS = 400;

const MEDIA_FIELD: Record<MediaKind, 'imageId' | 'audioId' | 'videoId'> = {
  image: 'imageId',
  audio: 'audioId',
  video: 'videoId',
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AppState['status']>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [mediaIndex, setMediaIndex] = useState<Record<string, MediaMeta>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const sequencesRef = useRef<Sequence[]>([]);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const pendingSaves = useRef(new Map<string, Sequence>());
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const applySequences = useCallback((next: Sequence[]) => {
    sequencesRef.current = next;
    setSequences(next);
  }, []);

  const applySettings = useCallback((next: AppSettings) => {
    settingsRef.current = next;
    setSettings(next);
    void saveSettings(next).catch(() => setError('Die Einstellungen konnten nicht gespeichert werden.'));
  }, []);

  const flushSequence = useCallback(async (id: string) => {
    const timer = saveTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      saveTimers.current.delete(id);
    }
    const sequence = pendingSaves.current.get(id);
    if (!sequence) return;
    pendingSaves.current.delete(id);
    try {
      await saveSequence(sequence);
    } catch {
      setError('Änderungen konnten nicht gespeichert werden. Bitte Speicherplatz prüfen.');
    }
  }, []);

  const flushPendingSaves = useCallback(async () => {
    await Promise.all(Array.from(pendingSaves.current.keys()).map((id) => flushSequence(id)));
  }, [flushSequence]);

  const scheduleSave = useCallback(
    (sequence: Sequence) => {
      pendingSaves.current.set(sequence.id, sequence);
      const existing = saveTimers.current.get(sequence.id);
      if (existing) clearTimeout(existing);
      saveTimers.current.set(
        sequence.id,
        setTimeout(() => void flushSequence(sequence.id), SAVE_DELAY_MS),
      );
    },
    [flushSequence],
  );

  /* ------------------------------------------------------------- Laden */

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [loadedSequences, loadedMedia, loadedSettings] = await Promise.all([
          loadSequences(),
          loadMediaIndex(),
          loadSettings(),
        ]);
        if (!active) return;

        let nextSequences = loadedSequences;
        let nextSettings = loadedSettings;

        if (loadedSequences.length === 0 && !loadedSettings.demoSeeded) {
          const demo = createDemoSequence();
          await saveSequence(demo);
          nextSequences = [demo];
          nextSettings = { ...loadedSettings, demoSeeded: true, lastSequenceId: demo.id };
          await saveSettings(nextSettings);
        }

        applySequences(nextSequences);
        setMediaIndex(loadedMedia);
        settingsRef.current = nextSettings;
        setSettings(nextSettings);
        setStatus('ready');
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Die lokalen Daten konnten nicht geladen werden.',
        );
        setStatus('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [applySequences]);

  useEffect(() => {
    const flush = () => void flushPendingSaves();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [flushPendingSaves]);

  /* --------------------------------------------------------- Mutationen */

  const mutateSequence = useCallback(
    (id: string, mutator: (sequence: Sequence) => Sequence): Sequence | null => {
      const current = sequencesRef.current.find((sequence) => sequence.id === id);
      if (!current) return null;
      const updated: Sequence = { ...mutator(current), updatedAt: Date.now() };
      applySequences(sequencesRef.current.map((sequence) => (sequence.id === id ? updated : sequence)));
      scheduleSave(updated);
      return updated;
    },
    [applySequences, scheduleSave],
  );

  const mutateLexeme = useCallback(
    (sequenceId: string, lexemeId: string, mutator: (lexeme: Lexeme) => Lexeme) =>
      mutateSequence(sequenceId, (sequence) => ({
        ...sequence,
        lexemes: sequence.lexemes.map((lexeme) =>
          lexeme.id === lexemeId ? { ...mutator(lexeme), updatedAt: Date.now() } : lexeme,
        ),
      })),
    [mutateSequence],
  );

  const actions = useMemo<StoreActions>(() => {
    const insertSequence = async (sequence: Sequence): Promise<string> => {
      applySequences([sequence, ...sequencesRef.current]);
      await saveSequence(sequence);
      return sequence.id;
    };

    return {
      createNewSequence: (partial) => insertSequence(createSequence(partial)),

      duplicateSequence: async (id) => {
        const source = sequencesRef.current.find((sequence) => sequence.id === id);
        if (!source) return null;
        const copy = createSequence({
          ...source,
          id: createId('seq'),
          title: `${source.title} (Kopie)`,
          session: null,
          archived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          reactivation: { ...source.reactivation, anchor: null, completedRounds: 0 },
          lexemes: source.lexemes.map((lexeme) => ({ ...lexeme, id: createId('lex') })),
        });
        return insertSequence(copy);
      },

      updateSequence: (id, patch) => {
        mutateSequence(id, (sequence) => ({ ...sequence, ...patch }));
      },

      setSequenceStep: (id, stepId, enabled) => {
        mutateSequence(id, (sequence) => ({ ...sequence, steps: { ...sequence.steps, [stepId]: enabled } }));
      },

      deleteSequence: async (id) => {
        const remaining = sequencesRef.current.filter((sequence) => sequence.id !== id);
        applySequences(remaining);
        pendingSaves.current.delete(id);
        const timer = saveTimers.current.get(id);
        if (timer) clearTimeout(timer);
        await removeSequence(id);
        if (settingsRef.current.lastSequenceId === id) {
          applySettings({ ...settingsRef.current, lastSequenceId: remaining[0]?.id ?? null });
        }
        await pruneMedia(remaining);
        setMediaIndex(await loadMediaIndex());
      },

      setArchived: (id, archived) => {
        mutateSequence(id, (sequence) => ({ ...sequence, archived }));
      },

      addLexeme: (sequenceId, partial) => {
        const lexeme = createLexeme(partial);
        const updated = mutateSequence(sequenceId, (sequence) => ({ ...sequence, lexemes: [...sequence.lexemes, lexeme] }));
        return updated ? lexeme.id : null;
      },

      addLexemes: (sequenceId, partials) => {
        const lexemes = partials.map((partial) => createLexeme(partial));
        if (lexemes.length === 0) return 0;
        const updated = mutateSequence(sequenceId, (sequence) => ({ ...sequence, lexemes: [...sequence.lexemes, ...lexemes] }));
        return updated ? lexemes.length : 0;
      },

      updateLexeme: (sequenceId, lexemeId, patch) => {
        mutateLexeme(sequenceId, lexemeId, (lexeme) => ({ ...lexeme, ...patch }));
      },

      recordObservation: (sequenceId, lexemeId, input) => {
        mutateLexeme(sequenceId, lexemeId, (lexeme) => ({
          ...lexeme,
          observations: [...lexeme.observations, createObservation(input)],
        }));
      },

      completeReactivationRound: (sequenceId, outcomes) => {
        mutateSequence(sequenceId, (sequence) => {
          const round = sequence.reactivation.completedRounds + 1;
          const byLexeme = new Map<string, typeof outcomes>();
          for (const outcome of outcomes) {
            byLexeme.set(outcome.lexemeId, [...(byLexeme.get(outcome.lexemeId) ?? []), outcome]);
          }

          return {
            ...sequence,
            lexemes: sequence.lexemes.map((lexeme) => {
              const entries = byLexeme.get(lexeme.id);
              if (!entries || entries.length === 0) return lexeme;
              return {
                ...lexeme,
                updatedAt: Date.now(),
                observations: [
                  ...lexeme.observations,
                  ...entries.map((outcome) =>
                    createObservation({
                      dimension: outcome.dimension || impulseDimension(outcome.kind),
                      result: outcome.result,
                      source: 'reactivation',
                      impulseKind: outcome.kind,
                      round,
                    }),
                  ),
                ],
              };
            }),
            reactivation: completeRound(sequence.reactivation, outcomes),
          };
        });
      },

      duplicateLexeme: (sequenceId, lexemeId) => {
        const sequence = sequencesRef.current.find((entry) => entry.id === sequenceId);
        const source = sequence?.lexemes.find((lexeme) => lexeme.id === lexemeId);
        if (!sequence || !source) return null;
        const copy: Lexeme = {
          ...source,
          id: createId('lex'),
          observations: [],
          liveNote: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const index = sequence.lexemes.findIndex((lexeme) => lexeme.id === lexemeId);
        mutateSequence(sequenceId, (entry) => {
          const lexemes = [...entry.lexemes];
          lexemes.splice(index + 1, 0, copy);
          return { ...entry, lexemes };
        });
        return copy.id;
      },

      removeLexeme: (sequenceId, lexemeId) => {
        mutateSequence(sequenceId, (sequence) => ({
          ...sequence,
          lexemes: sequence.lexemes.filter((lexeme) => lexeme.id !== lexemeId),
        }));
      },

      moveLexeme: (sequenceId, fromIndex, toIndex) => {
        mutateSequence(sequenceId, (sequence) => {
          const lexemes = [...sequence.lexemes];
          if (fromIndex < 0 || fromIndex >= lexemes.length) return sequence;
          const target = Math.min(Math.max(toIndex, 0), lexemes.length - 1);
          const [moved] = lexemes.splice(fromIndex, 1);
          lexemes.splice(target, 0, moved);
          return { ...sequence, lexemes };
        });
      },

      setSession: (sequenceId, session) => {
        mutateSequence(sequenceId, (sequence) => ({ ...sequence, session }));
      },

      attachMedia: async (sequenceId, lexemeId, kind, file) => {
        const record: MediaRecord = {
          id: createId('media'),
          name: file.name || 'Datei',
          mimeType: file.type || 'application/octet-stream',
          kind: file.type ? mediaKindFromMime(file.type) : kind,
          size: file.size,
          createdAt: Date.now(),
          blob: file,
        };
        await saveMedia(record);
        const { blob: _blob, ...meta } = record;
        setMediaIndex((index) => ({ ...index, [record.id]: meta }));
        mutateLexeme(sequenceId, lexemeId, (lexeme) => ({ ...lexeme, [MEDIA_FIELD[kind]]: record.id }));
        await flushPendingSaves();
        await pruneMedia(sequencesRef.current);
        setMediaIndex(await loadMediaIndex());
      },

      detachMedia: async (sequenceId, lexemeId, kind) => {
        const sequence = sequencesRef.current.find((entry) => entry.id === sequenceId);
        const lexeme = sequence?.lexemes.find((entry) => entry.id === lexemeId);
        const mediaId = lexeme?.[MEDIA_FIELD[kind]];
        mutateLexeme(sequenceId, lexemeId, (entry) => ({ ...entry, [MEDIA_FIELD[kind]]: undefined }));
        await flushPendingSaves();
        if (mediaId) {
          await removeMedia(mediaId);
          setMediaIndex((index) => {
            const next = { ...index };
            delete next[mediaId];
            return next;
          });
        }
      },

      updateSettings: (patch) => {
        applySettings({ ...settingsRef.current, ...patch });
      },

      seedDemoSequence: async () => {
        const demo = createDemoSequence();
        applySettings({ ...settingsRef.current, demoSeeded: true });
        return insertSequence(demo);
      },

      importSequences: async (imported) => {
        const existingIds = new Set(sequencesRef.current.map((sequence) => sequence.id));
        const prepared = imported.map((sequence) =>
          existingIds.has(sequence.id) ? { ...sequence, id: createId('seq'), title: `${sequence.title} (importiert)` } : sequence,
        );
        applySequences([...prepared, ...sequencesRef.current]);
        for (const sequence of prepared) await saveSequence(sequence);
        return prepared.length;
      },

      restoreBackup: async (result) => {
        await replaceAll(result.sequences, result.media);
        clearMediaUrls();
        applySequences(result.sequences);
        setMediaIndex(await loadMediaIndex());
        applySettings({
          ...settingsRef.current,
          demoSeeded: true,
          lastSequenceId: result.sequences[0]?.id ?? null,
        });
      },

      createBackup: async () => {
        await flushPendingSaves();
        const media = await loadAllMedia();
        return buildBackup(sequencesRef.current, media);
      },

      cleanUpMedia: async () => {
        const removed = await pruneMedia(sequencesRef.current);
        setMediaIndex(await loadMediaIndex());
        return removed;
      },

      storageEstimate: () => estimateStorage(),

      flushPendingSaves,
    };
  }, [applySequences, applySettings, flushPendingSaves, mutateLexeme, mutateSequence]);

  const value = useMemo<StoreValue>(
    () => ({ state: { status, error, sequences, mediaIndex, settings }, actions }),
    [actions, error, mediaIndex, sequences, settings, status],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
