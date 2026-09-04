/**
 * Fachlicher Zugriff auf die lokale Datenbank.
 * Alle Schreibvorgänge sind bewusst klein gehalten, damit Autospeichern
 * unmittelbar nach jeder Änderung möglich ist.
 */
import { DEFAULT_SETTINGS, type AppSettings, type MediaMeta, type MediaRecord, type Sequence } from '../domain/model';
import { collectMediaIds, normalizeSequence, normalizeSettings } from '../domain/schema';
import {
  STORE_MEDIA,
  STORE_SEQUENCES,
  STORE_SETTINGS,
  clearStore,
  deleteRecord,
  getAllRecords,
  getRecord,
  putRecord,
  putRecords,
} from './idb';

const SETTINGS_KEY = 'app';

interface SettingsRow {
  key: string;
  value: AppSettings;
}

export async function loadSequences(): Promise<Sequence[]> {
  const rows = await getAllRecords<unknown>(STORE_SEQUENCES);
  return rows
    .map((row) => {
      try {
        return normalizeSequence(row);
      } catch {
        return null;
      }
    })
    .filter((sequence): sequence is Sequence => sequence !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveSequence(sequence: Sequence): Promise<void> {
  await putRecord(STORE_SEQUENCES, sequence);
}

export async function saveSequences(sequences: Sequence[]): Promise<void> {
  await putRecords(STORE_SEQUENCES, sequences);
}

export async function removeSequence(id: string): Promise<void> {
  await deleteRecord(STORE_SEQUENCES, id);
}

export async function loadSettings(): Promise<AppSettings> {
  const row = await getRecord<SettingsRow>(STORE_SETTINGS, SETTINGS_KEY);
  return row ? normalizeSettings(row.value) : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await putRecord<SettingsRow>(STORE_SETTINGS, { key: SETTINGS_KEY, value: settings });
}

export async function saveMedia(record: MediaRecord): Promise<void> {
  await putRecord(STORE_MEDIA, record);
}

export async function loadMedia(id: string): Promise<MediaRecord | undefined> {
  return getRecord<MediaRecord>(STORE_MEDIA, id);
}

export async function loadAllMedia(): Promise<MediaRecord[]> {
  return getAllRecords<MediaRecord>(STORE_MEDIA);
}

export async function loadMediaIndex(): Promise<Record<string, MediaMeta>> {
  const records = await loadAllMedia();
  const index: Record<string, MediaMeta> = {};
  for (const record of records) {
    const { blob: _blob, ...meta } = record;
    index[record.id] = meta;
  }
  return index;
}

export async function removeMedia(id: string): Promise<void> {
  await deleteRecord(STORE_MEDIA, id);
}

/** Entfernt Medien, die von keiner Sequenz mehr referenziert werden. */
export async function pruneMedia(sequences: Sequence[]): Promise<number> {
  const referenced = collectMediaIds(sequences);
  const records = await loadAllMedia();
  const orphans = records.filter((record) => !referenced.has(record.id));
  for (const orphan of orphans) await removeMedia(orphan.id);
  return orphans.length;
}

/** Vollständige Wiederherstellung: ersetzt den gesamten lokalen Bestand. */
export async function replaceAll(sequences: Sequence[], media: MediaRecord[]): Promise<void> {
  await clearStore(STORE_SEQUENCES);
  await clearStore(STORE_MEDIA);
  await putRecords(STORE_SEQUENCES, sequences);
  await putRecords(STORE_MEDIA, media);
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return null;
  }
}

/** Fordert dauerhaften Speicher an, damit der Browser die Daten nicht verwirft. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
